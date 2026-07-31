import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type WindowThreshold = {
    event: string
    windowMinutes: number
    minRuns: number
    predicate: (run: {
        status: string
        failureCode: string | null
        remediationSummary: unknown
    }) => boolean
    ratioThreshold?: number
    minMatches?: number
}

const ALERT_WINDOWS: WindowThreshold[] = [
    {
        event: "AI_ANALYSIS_FAILURE_RATE_HIGH",
        windowMinutes: 15,
        minRuns: 20,
        predicate: (run) => run.status === "failed" || run.status === "blocked",
        ratioThreshold: 0.15,
    },
    {
        event: "AI_SCHEMA_FAILURE_SPIKE",
        windowMinutes: 10,
        minRuns: 5,
        predicate: (run) => (run.failureCode || "").includes("SCHEMA"),
        minMatches: 5,
    },
    {
        event: "AI_FAILOVER_USAGE_HIGH",
        windowMinutes: 30,
        minRuns: 20,
        predicate: (run) => {
            const attempts = (run.remediationSummary as Record<string, unknown> | null)?.providerAttempts
            if (!Array.isArray(attempts)) return false
            return attempts.some((attempt) => {
                const attemptRecord =
                    attempt && typeof attempt === "object"
                        ? (attempt as Record<string, unknown>)
                        : null
                return attemptRecord?.remediationType === "provider_failover"
            })
        },
        ratioThreshold: 0.25,
    },
    {
        event: "AI_TOKEN_BLOCK_SPIKE",
        windowMinutes: 24 * 60,
        minRuns: 20,
        predicate: (run) => run.status === "blocked",
        ratioThreshold: 0.2,
    },
]

const lastAlertAt = new Map<string, number>()

type AnalysisIncidentAlert = {
    event: string
    ratio: number
    matchedRuns: number
    totalRuns: number
    windowMinutes: number
    thresholdRatio: number | null
    thresholdCount: number | null
    /** Free-text context for alerts whose numbers are not run ratios (e.g. spend). */
    detail?: string
}

type IncidentSeverity = "critical" | "error" | "warning" | "info"

function mapIncidentSeverity(event: string): IncidentSeverity {
    if (event === "AI_ANALYSIS_FAILURE_RATE_HIGH") return "error"
    if (event === "AI_SPEND_SPIKE") return "error"
    if (event === "AI_SCHEMA_FAILURE_SPIKE") return "error"
    if (event === "AI_FAILOVER_USAGE_HIGH") return "warning"
    if (event === "AI_TOKEN_BLOCK_SPIKE") return "warning"
    return "error"
}

function getSlackWebhookUrl(): string | undefined {
    return process.env.AI_INCIDENT_SLACK_WEBHOOK_URL || undefined
}

function getPagerDutyRoutingKey(): string | undefined {
    return process.env.AI_INCIDENT_PAGERDUTY_ROUTING_KEY || undefined
}

function getPagerDutyEventsUrl(): string {
    return process.env.AI_INCIDENT_PAGERDUTY_EVENT_URL || "https://events.pagerduty.com/v2/enqueue"
}

function buildSlackPayload(alert: AnalysisIncidentAlert) {
    const thresholdText =
        typeof alert.thresholdRatio === "number"
            ? `${Math.round(alert.thresholdRatio * 100)}%`
            : `${alert.thresholdCount || 0} matches`
    return {
        text: `[${alert.event}] AI analysis remediation threshold crossed`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text:
                        `*${alert.event}* threshold crossed\n` +
                        `Window: ${alert.windowMinutes}m\n` +
                        `Matched: ${alert.matchedRuns}/${alert.totalRuns} (${Math.round(alert.ratio * 100)}%)\n` +
                        `Threshold: ${thresholdText}` +
                        (alert.detail ? `\n${alert.detail}` : ''),
                },
            },
        ],
    }
}

function buildPagerDutyPayload(alert: AnalysisIncidentAlert, routingKey: string) {
    return {
        routing_key: routingKey,
        event_action: "trigger",
        payload: {
            summary: `[${alert.event}] AI analysis remediation threshold crossed`,
            source: "policywallet-ai-analysis",
            severity: mapIncidentSeverity(alert.event),
            timestamp: new Date().toISOString(),
            custom_details: {
                event: alert.event,
                ratio: alert.ratio,
                matchedRuns: alert.matchedRuns,
                totalRuns: alert.totalRuns,
                windowMinutes: alert.windowMinutes,
                thresholdRatio: alert.thresholdRatio,
                thresholdCount: alert.thresholdCount,
                detail: alert.detail ?? null,
            },
        },
    }
}

export async function dispatchAnalysisIncidentAlert(
    alert: AnalysisIncidentAlert,
    options?: {
        fetchImpl?: typeof fetch
    }
): Promise<void> {
    const fetchImpl = options?.fetchImpl || fetch
    const slackWebhookUrl = getSlackWebhookUrl()
    const pagerDutyRoutingKey = getPagerDutyRoutingKey()

    const dispatches: Promise<void>[] = []

    if (slackWebhookUrl) {
        dispatches.push(
            (async () => {
                const response = await fetchImpl(slackWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildSlackPayload(alert)),
                })
                if (!response.ok) {
                    throw new Error(`Slack dispatch failed (${response.status})`)
                }
            })()
        )
    }

    if (pagerDutyRoutingKey) {
        dispatches.push(
            (async () => {
                const response = await fetchImpl(getPagerDutyEventsUrl(), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPagerDutyPayload(alert, pagerDutyRoutingKey)),
                })
                if (!response.ok) {
                    throw new Error(`PagerDuty dispatch failed (${response.status})`)
                }
            })()
        )
    }

    if (!dispatches.length) return

    const results = await Promise.allSettled(dispatches)
    const failures = results.filter((result) => result.status === "rejected") as PromiseRejectedResult[]
    if (failures.length > 0) {
        logger("warn", "Incident dispatch adapter failures", {
            event: alert.event,
            failures: failures.map((failure) =>
                failure.reason instanceof Error ? failure.reason.message : String(failure.reason)
            ),
        })
    } else {
        logger("info", "Incident dispatch adapters notified", {
            event: alert.event,
            adapters: {
                slack: Boolean(slackWebhookUrl),
                pagerDuty: Boolean(pagerDutyRoutingKey),
            },
        })
    }
}

/**
 * Alert when AI spend suddenly departs from its own normal.
 *
 * Every existing rule watches FAILURE ratios — nothing watched cost. A runaway
 * loop, a pricing change, or a switch to a pricier model is not a failure: it
 * completes successfully and simply bills more, so it could run for a full
 * billing period unnoticed. Compares the trailing hour against the mean hour of
 * the previous 7 days, which needs no configured budget and adapts as real
 * traffic grows.
 */
const SPEND_SPIKE_MULTIPLE = 3
/** Below this, hourly noise dominates and a multiple means nothing. */
const SPEND_SPIKE_FLOOR_EUR = 5

export async function evaluateSpendSpike(): Promise<void> {
    const now = Date.now()
    const cooldownKey = "AI_SPEND_SPIKE"
    const lastAt = lastAlertAt.get(cooldownKey)
    if (lastAt && now - lastAt < 60 * 60 * 1000) return

    const hourAgo = new Date(now - 60 * 60 * 1000)
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [lastHour, baseline] = await Promise.all([
        db.tokenUsage.aggregate({
            where: { createdAt: { gte: hourAgo } },
            _sum: { costEur: true },
        }),
        db.tokenUsage.aggregate({
            where: { createdAt: { gte: weekAgo, lt: hourAgo } },
            _sum: { costEur: true },
        }),
    ])

    const hourEur = Number(lastHour._sum.costEur ?? 0)
    // 7 days minus the hour already counted above.
    const baselineHourlyEur = Number(baseline._sum.costEur ?? 0) / (7 * 24 - 1)

    if (hourEur < SPEND_SPIKE_FLOOR_EUR) return
    // No history yet: the floor alone decides, otherwise the first busy hour of
    // a new deployment would page on a division by ~zero.
    if (baselineHourlyEur <= 0) return
    const multiple = hourEur / baselineHourlyEur
    if (multiple < SPEND_SPIKE_MULTIPLE) return

    lastAlertAt.set(cooldownKey, now)
    const alert: AnalysisIncidentAlert = {
        event: "AI_SPEND_SPIKE",
        ratio: multiple,
        matchedRuns: 0,
        totalRuns: 0,
        windowMinutes: 60,
        thresholdRatio: SPEND_SPIKE_MULTIPLE,
        thresholdCount: null,
        detail:
            `Spend in the last hour: EUR ${hourEur.toFixed(2)} ` +
            `vs EUR ${baselineHourlyEur.toFixed(2)}/h over the previous 7 days ` +
            `(${multiple.toFixed(1)}x).`,
    }

    logger("error", "AI spend spike detected", {
        incidentEvent: alert.event,
        hourEur,
        baselineHourlyEur,
        multiple,
    })

    await dispatchAnalysisIncidentAlert(alert).catch((error) => {
        logger("warn", "Failed to dispatch spend spike alert", { error })
    })
}

export async function evaluateAnalysisIncidentThresholds(): Promise<void> {
    // Cost is evaluated alongside the failure ratios: it shares the same
    // cooldown map and the same single call site, so nothing else has to be
    // scheduled for spend to be watched.
    await evaluateSpendSpike().catch((error) => {
        logger("warn", "Spend spike evaluation failed", { error })
    })

    for (const threshold of ALERT_WINDOWS) {
        const now = Date.now()
        const cooldownKey = threshold.event
        const cooldownMs = threshold.windowMinutes * 60 * 1000
        const lastAt = lastAlertAt.get(cooldownKey)
        if (lastAt && now - lastAt < cooldownMs) continue

        const since = new Date(now - threshold.windowMinutes * 60 * 1000)
        const runs = await db.policyAnalysisRun.findMany({
            where: {
                createdAt: { gte: since },
            },
            select: {
                status: true,
                failureCode: true,
                remediationSummary: true,
            },
        })

        if (runs.length < threshold.minRuns) continue
        const matched = runs.filter((run) =>
            threshold.predicate({
                status: run.status,
                failureCode: run.failureCode,
                remediationSummary: run.remediationSummary,
            })
        ).length

        const ratio = runs.length > 0 ? matched / runs.length : 0
        const ratioTriggered =
            typeof threshold.ratioThreshold === "number" && ratio >= threshold.ratioThreshold
        const countTriggered =
            typeof threshold.minMatches === "number" && matched >= threshold.minMatches

        if (ratioTriggered || countTriggered) {
            lastAlertAt.set(cooldownKey, now)
            const alertPayload: AnalysisIncidentAlert = {
                event: threshold.event,
                ratio,
                matchedRuns: matched,
                totalRuns: runs.length,
                windowMinutes: threshold.windowMinutes,
                thresholdRatio: threshold.ratioThreshold ?? null,
                thresholdCount: threshold.minMatches ?? null,
            }

            logger("error", "AI analysis remediation threshold crossed", {
                incidentEvent: alertPayload.event,
                ratio: alertPayload.ratio,
                matchedRuns: alertPayload.matchedRuns,
                totalRuns: alertPayload.totalRuns,
                windowMinutes: alertPayload.windowMinutes,
                thresholdRatio: alertPayload.thresholdRatio,
                thresholdCount: alertPayload.thresholdCount,
            })

            await dispatchAnalysisIncidentAlert(alertPayload).catch((error) => {
                logger("warn", "Failed to dispatch analysis incident alert", {
                    incidentEvent: threshold.event,
                    error: error instanceof Error ? error.message : String(error),
                })
            })
        }
    }
}
