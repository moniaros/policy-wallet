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
}

type IncidentSeverity = "critical" | "error" | "warning" | "info"

function mapIncidentSeverity(event: string): IncidentSeverity {
    if (event === "AI_ANALYSIS_FAILURE_RATE_HIGH") return "error"
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
                        `Threshold: ${thresholdText}`,
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

export async function evaluateAnalysisIncidentThresholds(): Promise<void> {
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
