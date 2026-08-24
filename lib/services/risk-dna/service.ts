/**
 * Assembling the risk intelligence picture for one customer.
 *
 * One read, one dimension pass, every reading derived from it. The alternative —
 * each surface computing its own — is how a dashboard ends up showing a health
 * index that disagrees with the trend beneath it.
 *
 * Everything is derived on read. There is still no table behind any of this.
 */

import { db } from "@/lib/db"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { coverageEngineStatus, isPolicyCoverageActive, resolvePolicyLifecycle } from "@/lib/policy-status"
import { assembleRiskGraph, type RiskGraphPolicyInput } from "@/lib/services/risk-graph/service"
import { parseRisks } from "@/lib/services/timeline/diff"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"
import { computeRiskDna, type DimensionResult, type DnaHistoryPoint } from "./compute"
import { RISK_DIMENSIONS, primaryDimensionOf, type RiskDimension } from "./dimensions"
import {
    customerHealthIndex,
    householdOverview,
    riskTrends,
    type CustomerHealthIndex,
    type HouseholdOverview,
    type RiskTrend,
} from "./health-index"
import { monitorRisk, openPredictionHooks, type PredictionSignal, type WatchSignal } from "./monitoring"

export interface RiskIntelligence {
    dimensions: DimensionResult[]
    health: CustomerHealthIndex
    household: HouseholdOverview
    trends: RiskTrend[]
    watch: WatchSignal[]
    predictions: PredictionSignal[]
    /**
     * The one composite this product has.
     *
     * Carried here so a surface rendering dimensions beside it cannot source a
     * different number, and computed by the real scorer for the same reason.
     * Null when there is too little to say — the dimensions still render.
     */
    protectionScore: { value: number; indeterminate: boolean }
    /**
     * The things in their life and how well each is protected.
     *
     * A different question from the dimensions — those are areas of life, this
     * is the specific property, car or dependant and the evidence behind each
     * verdict. Kept because removing it would lose the only surface that shows
     * WHY we believe something, which is the product's whole claim to trust.
     */
    graph: { views: ReturnType<typeof assembleRiskGraph>["views"]; summary: ReturnType<typeof assembleRiskGraph>["summary"] }
}

/**
 * Per-dimension scores as they stood at a historical version.
 *
 * Recomputed from the version's own risk snapshot rather than stored, so a
 * change to the dimension mapping re-reads history correctly instead of leaving
 * old rows meaning something different from new ones.
 */
function dimensionScoresAt(risks: ReturnType<typeof parseRisks>): Partial<Record<RiskDimension, number | null>> {
    const open = new Map<RiskDimension, number>()
    const applicable = new Map<RiskDimension, number>()

    for (const risk of risks) {
        const dimension = primaryDimensionOf(risk.riskId)
        if (!dimension) continue
        // `not_applicable` and `needs_review` are outside the denominator, the
        // same rule the protection score uses.
        if (risk.status === "not_applicable" || risk.status === "needs_review") continue
        applicable.set(dimension, (applicable.get(dimension) ?? 0) + 1)
        if (risk.status === "protection_gap" || risk.status === "opportunity") {
            open.set(dimension, (open.get(dimension) ?? 0) + 1)
        }
    }

    const scores: Partial<Record<RiskDimension, number | null>> = {}
    for (const dimension of RISK_DIMENSIONS) {
        const total = applicable.get(dimension) ?? 0
        scores[dimension] = total === 0 ? null : Math.round(((total - (open.get(dimension) ?? 0)) / total) * 100)
    }
    return scores
}

/**
 * The shared dimension assembly both consumers below build on.
 *
 * `getRiskIntelligence` and `assembleWatch` MUST derive their dimensions
 * through this one function — a second assembly path is how the dashboard's
 * watch would come to disagree with /insights/risk-profile.
 */
function assembleDimensionPicture(
    profile: unknown,
    policies: RiskGraphPolicyInput[],
    latestVersion: { computedAt: Date; risks: unknown } | null
) {
    const ctx = toLifeContext(profile as any)
    const graph = assembleRiskGraph(profile, policies)
    const activeLines = [
        ...new Set(
            policies
                .filter((p) => isPolicyCoverageActive(p as any))
                .map((p) => (p.lineOfBusiness ?? "").toLowerCase())
                .filter(Boolean)
        ),
    ]
    const previous: (DnaHistoryPoint & { at: Date }) | null = latestVersion
        ? { at: latestVersion.computedAt, scores: dimensionScoresAt(parseRisks(latestVersion.risks)) }
        : null
    const dimensions = computeRiskDna({ assessments: graph.assessments, ctx, activeLines, previous })
    return { ctx, graph, activeLines, previous, dimensions }
}

/**
 * The lapse watch's policy universe — ONE mapping, used by both assemblers.
 *
 * Two rules, both learned from §2.8's «1 έχει ήδη λήξει» beside the
 * dashboard's «5 έχουν λήξει» (the same wallet, the same day):
 *
 * 1. **The end date is the LIFECYCLE's, never the stored column.** The
 *    `endDate` column is placeholder-prone (sentinel dates from failed
 *    extractions); `resolvePolicyLifecycle` resolves the real one from the
 *    extracted document. Feeding the raw column into `monitorRisk` made the
 *    watch count a different portfolio from the dashboard hero.
 * 2. **Only policies the owner holds, in states the calendar can judge.** A
 *    soft-deleted row is not held; a cancelled policy's end date is not a
 *    lapse (the dashboard's `expiredCount` excludes it via the lifecycle, so
 *    the watch must too, or the two disagree by exactly the cancelled rows).
 *
 * After this mapping, the watch's "already ended" count is definitionally the
 * portfolio's `expiredCount`: lifecycle end date in the past, not cancelled.
 */
function toWatchPolicies(
    policies: Array<{
        id: string
        lineOfBusiness: string | null
        status?: string | null
        policyNumber?: string | null
        insurerName?: string | null
        endDate?: Date | string | null
        acordData?: unknown
    }>,
    now: Date
): Array<{ id: string; endDate: Date | null; lineOfBusiness: string | null }> {
    return policies
        .filter((policy) => String(policy.status || "").toLowerCase() !== "deleted")
        .map((policy) => ({ policy, lifecycle: resolvePolicyLifecycle(policy, now) }))
        .filter(({ lifecycle }) => lifecycle.status !== "cancelled")
        .map(({ policy, lifecycle }) => ({
            id: policy.id,
            endDate: lifecycle.endDate,
            lineOfBusiness: policy.lineOfBusiness,
        }))
}

export interface WatchAssemblyInputs {
    /** The policyholderProfile row, or null when none exists. */
    profile: unknown
    policies: RiskGraphPolicyInput[]
    /** The newest RiskProfileVersion row, or null (table may be unmigrated). */
    latestVersion: { computedAt: Date; risks: unknown } | null
    /**
     * When the picture was last actually computed. The dashboard passes
     * ProtectionScore.computedAt — the last engine RUN — rather than the newest
     * version's timestamp: versions are written only on MATERIAL change, so a
     * customer whose stable profile the cron re-checked yesterday must not be
     * told their position was last assessed 200 days ago.
     */
    lastAssessedAt: Date | null
    now?: Date
}

/**
 * The standing watch, assembled from data the caller already holds.
 *
 * Pure CPU — no queries. Exported for the dashboard, which has already loaded
 * the profile, the full wallet and the newest version in its own batch;
 * calling `getRiskIntelligence` there would re-fetch all three and compute
 * household/trend/graph views the page never renders.
 */
export function assembleWatch(inputs: WatchAssemblyInputs): WatchSignal[] {
    const now = inputs.now ?? new Date()
    const { ctx, dimensions } = assembleDimensionPicture(inputs.profile, inputs.policies, inputs.latestVersion)
    return monitorRisk({
        ctx,
        dimensions,
        lastAssessedAt: inputs.lastAssessedAt,
        policies: toWatchPolicies(inputs.policies, now),
        now,
    })
}

export async function getRiskIntelligence(userId: string, now: Date = new Date()): Promise<RiskIntelligence> {
    const [profile, policies, versions] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId } }),
        db.policy.findMany({
            // A soft-deleted row is not a policy the owner holds — it must not
            // feed the graph's heldInLine, the dimensions, or the lapse watch.
            where: { ownerUserId: userId, status: { not: "deleted" } },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                endDate: true,
                acordData: true,
            },
        }),
        // Fails soft: this table sits behind an unapplied migration, and the
        // whole picture except trend works without it.
        db.riskProfileVersion
            .findMany({
                where: { userId },
                select: { computedAt: true, risks: true },
                orderBy: { version: "asc" },
                take: 60,
            })
            .catch(() => [] as Array<{ computedAt: Date; risks: unknown }>),
    ])

    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null
    const { ctx, graph, activeLines, previous, dimensions } = assembleDimensionPicture(
        profile,
        policies,
        latestVersion
    )

    const score = calculateScoreFromAssessments(graph.assessments, activeLines)
    const series = versions.map((v) => ({ at: v.computedAt, scores: dimensionScoresAt(parseRisks(v.risks)) }))

    return {
        dimensions,
        health: customerHealthIndex({
            ctx,
            dimensions,
            lastAssessedAt: previous?.at ?? null,
            versionCount: versions.length,
            now,
        }),
        household: householdOverview(graph.graph, dimensions),
        trends: riskTrends(series, dimensions),
        watch: monitorRisk({
            ctx,
            dimensions,
            lastAssessedAt: previous?.at ?? null,
            policies: toWatchPolicies(policies, now),
            now,
        }),
        predictions: openPredictionHooks(ctx, dimensions),
        protectionScore: {
            value: score.overallScore,
            indeterminate: score.indeterminate ?? false,
        },
        graph: { views: graph.views, summary: graph.summary },
    }
}

