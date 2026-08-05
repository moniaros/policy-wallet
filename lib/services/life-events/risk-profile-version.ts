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
            select: { version: true, contextHash: true, overallScore: true },
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
        await db.riskProfileVersion.create({
            data: {
                userId,
                version,
                trigger,
                lifeEventId,
                overallScore: score.overallScore,
                assessmentCoverage: score.assessmentCoverage ?? null,
                indeterminate: score.indeterminate ?? false,
                risks: snapshotRisks(assessments) as any,
                categoryScores: categoryScores as any,
                openFindingCount,
                contextHash,
            },
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
