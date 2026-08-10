/**
 * Versioned risk profiles.
 *
 * `ProtectionScore` is a single upserted row per user, so the product has never
 * been able to answer "what changed, and why". This writes a version whenever
 * the assessment MATERIALLY differs, stamped with what triggered it.
 *
 * The fingerprint is what makes the history worth keeping. A nightly cron that
 * recomputes an unchanged assessment writes nothing, so the table records
 * *changes* rather than *ticks* — and a version history full of ticks would be
 * indistinguishable from no history at all.
 */

import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { RiskAssessment } from "@/lib/services/gap-engine/risk-types"
import type { ProtectionScoreResult } from "@/lib/services/gap-engine/protection-score"
import type { RiskSnapshot } from "@/lib/services/timeline/diff"

export type RecalculationTrigger =
    | "life_event"
    | "policy_change"
    | "profile_update"
    | "cron"
    | "manual"

/**
 * Fingerprint of an assessment.
 *
 * Deliberately covers status, priority and coverage — not the prose. Rewording a
 * risk explanation must not manufacture a version, because a version is a claim
 * that the customer's position changed.
 */
export function fingerprintAssessment(
    assessments: RiskAssessment[],
    score: ProtectionScoreResult
): string {
    const material = assessments
        .map((a) => `${a.riskId}:${a.status}:${a.priority}:${a.coveredBy.slice().sort().join("+")}`)
        .sort()
        .join("|")
    return createHash("sha256")
        .update(`${score.overallScore}::${score.indeterminate ? 1 : 0}::${material}`)
        .digest("hex")
        .slice(0, 32)
}

/**
 * Read back a stored snapshot.
 *
 * `risks` is a Json column, so it is `unknown` until proven otherwise — a row
 * written by an older shape must degrade to "no previous snapshot" rather than
 * throw through the version writer.
 */
function parseSnapshot(raw: unknown): RiskSnapshot[] | null {
    if (!Array.isArray(raw)) return null
    return raw.filter(
        (r): r is RiskSnapshot =>
            Boolean(r) && typeof r === "object" && typeof (r as RiskSnapshot).riskId === "string"
    )
}

/** The per-risk snapshot stored on a version. Prose is deliberately excluded. */
function snapshotRisks(assessments: RiskAssessment[]) {
    return assessments.map((a) => ({
        riskId: a.riskId,
        lineOfBusiness: a.lineOfBusiness,
        status: a.status,
        priority: a.priority,
        confidence: a.confidence,
        coveredBy: a.coveredBy,
    }))
}

export interface RecordVersionArgs {
    userId: string
    assessments: RiskAssessment[]
    score: ProtectionScoreResult
    trigger: RecalculationTrigger
    lifeEventId?: string | null
}

export interface RecordVersionResult {
    /** False when the assessment was unchanged — no row written. */
    written: boolean
    version: number | null
    previousScore: number | null
    delta: number | null
}

/**
 * Write a new version if — and only if — the assessment materially changed.
 *
 * Never throws into the caller. Versioning is observability: a failure here must
 * not take down an upload, a questionnaire submission or a cron batch that had
 * otherwise succeeded.
 */
export async function recordRiskProfileVersion(
    args: RecordVersionArgs
): Promise<RecordVersionResult> {
    const { userId, assessments, score, trigger, lifeEventId = null } = args
    const contextHash = fingerprintAssessment(assessments, score)

    try {
        const latest = await db.riskProfileVersion.findFirst({
            where: { userId },
            orderBy: { version: "desc" },
            // `risks` and `indeterminate` are selected so the notifications
            // below can be DERIVED from the same diff the timeline draws,
            // rather than from a second opinion about what changed.
            select: {
                version: true,
                contextHash: true,
                overallScore: true,
                risks: true,
                indeterminate: true,
            },
        })

        if (latest?.contextHash === contextHash) {
            return { written: false, version: latest.version, previousScore: latest.overallScore, delta: 0 }
        }

        const openFindingCount = assessments.filter(
            (a) => a.status === "protection_gap" || a.status === "opportunity"
        ).length

        const categoryScores: Record<string, number> = {}
        for (const [key, value] of Object.entries(score.categoryScores)) {
            categoryScores[key] = value.score
        }

        const version = (latest?.version ?? 0) + 1
        const risks = snapshotRisks(assessments)
        await db.riskProfileVersion.create({
            data: {
                userId,
                version,
                trigger,
                lifeEventId,
                overallScore: score.overallScore,
                assessmentCoverage: score.assessmentCoverage ?? null,
                indeterminate: score.indeterminate ?? false,
                risks: risks as any,
                categoryScores: categoryScores as any,
                openFindingCount,
                contextHash,
            },
        })

        // A material change just landed, so this is where the risk
        // notifications belong — one seam, after the row is committed. The
        // whole family (new gaps, risk-level movement, score movement) derives
        // from the same diff the timeline uses, so an alert cannot contradict
        // the history it links to. `emit` never throws, and the outer catch
        // here means versioning still cannot fail an upload or a cron batch.
        const { emitRiskEvents } = await import("@/lib/notifications/risk-events")
        await emitRiskEvents({
            userId,
            current: risks,
            previous: latest ? parseSnapshot(latest.risks) : null,
            overallScore: score.overallScore,
            previousScore: latest?.overallScore ?? null,
            indeterminate: score.indeterminate ?? false,
            previousIndeterminate: latest?.indeterminate ?? false,
            version,
        })

        return {
            written: true,
            version,
            previousScore: latest?.overallScore ?? null,
            delta: latest ? score.overallScore - latest.overallScore : null,
        }
    } catch (error) {
        // A unique-constraint collision means a concurrent writer got there
        // first with the same version number. That is a benign race — the other
        // writer recorded the same assessment — and must not surface.
        logger("warn", "risk profile versioning failed (non-blocking)", {
            userId,
            trigger,
            error: error instanceof Error ? error.message : String(error),
        })
        return { written: false, version: null, previousScore: null, delta: null }
    }
}

export interface RiskProfileHistoryEntry {
    version: number
    computedAt: Date
    trigger: string
    lifeEventId: string | null
    overallScore: number
    indeterminate: boolean
    openFindingCount: number
    /** Movement against the previous version; null for the first. */
    delta: number | null
}

/** Version history, newest first, with movement computed against its predecessor. */
export async function getRiskProfileHistory(
    userId: string,
    limit = 20
): Promise<RiskProfileHistoryEntry[]> {
    const rows = await db.riskProfileVersion.findMany({
        where: { userId },
        orderBy: { version: "desc" },
        take: limit,
        select: {
            version: true,
            computedAt: true,
            trigger: true,
            lifeEventId: true,
            overallScore: true,
            indeterminate: true,
            openFindingCount: true,
        },
    })

    return rows.map((row, i) => {
        const previous = rows[i + 1]
        return {
            ...row,
            // An indeterminate score is not a number the customer was shown, so
            // a delta against it would be a movement that never happened.
            delta:
                previous && !row.indeterminate && !previous.indeterminate
                    ? row.overallScore - previous.overallScore
                    : null,
        }
    })
}
