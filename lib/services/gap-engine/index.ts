/**
 * Gap Detection & Recommendation Engine — Orchestrator
 *
 * Single entry point that:
 * 1. Loads user profile + policies + existing gap instances
 * 2. Runs profile-based gap detection rules
 * 3. Calculates unified protection score
 * 4. Generates and persists recommendations
 * 5. Caches protection score
 *
 * Used by:
 * - GET /api/v1/protection-score (on-demand)
 * - GET /api/v1/recommendations (on-demand)
 * - POST /api/v1/jobs/protection-score-refresh (cron)
 * - Coverage insights page (server component)
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
    detectProfileGaps,
    toProfileFields,
    type ProfileGap,
    type ProfileFields,
    type PolicyFields,
} from "./profile-gap-rules"
import {
    calculateProtectionScore,
    getScoreTier,
    type ProtectionScoreResult,
} from "./protection-score"
import {
    assessmentsToRecommendations,
    policyGapsToRecommendations,
    prioritizeRecommendations,
    syncRecommendations,
    getActiveRecommendations,
    matchProductsToRecommendations,
    deriveProfileTags,
    type RecommendationInput,
    type RecommendationOutput,
} from "./recommendation-generator"
import {
    toLifeContext,
    contextCompleteness,
    type LifeContext,
    type ContextFactorKey,
} from "./life-context"
import { assessRisks, factorsToResolve, statusCounts } from "./risk-assessment"
import { withRecommendationContext, risksExposedBy } from "./recommendation-context"
import { attributeRecommendationCause } from "@/lib/services/timeline/build"
import { parseRisks } from "@/lib/services/timeline/diff"
import type { RiskAssessment } from "./risk-types"
import {
    evaluatePortfolioRules,
    type PortfolioGap,
    type SmartCardContent,
} from "./portfolio-rules"
import type { AIRiskProfileAnalysisResponse } from "@/lib/services/ai/ai-service.interface"
import { coverageEngineStatus, isPolicyCoverageActive } from "@/lib/policy-status"
import {
    assembleRiskGraph,
    type RiskGraphPolicyInput,
    type RiskGraphResult,
} from "@/lib/services/risk-graph/service"

// ── Public types ─────────────────────────────────────────────────────

export interface GapEngineResult {
    protectionScore: ProtectionScoreResult
    /**
     * The risk-profile version this run wrote, when it wrote one.
     *
     * `written: false` means the assessment was unchanged (contextHash matched)
     * and the history correctly recorded nothing. Exposed so a caller that
     * needs the movement — the life-event flow reports it back to the customer
     * — can have the real numbers rather than re-reading the table.
     */
    version: {
        written: boolean
        version: number | null
        previousScore: number | null
        delta: number | null
    } | null
    scoreTier: ReturnType<typeof getScoreTier>
    profileGaps: ProfileGap[]
    /**
     * Every risk in the catalog, assessed against this customer's life —
     * including the ones that do NOT apply. The dashboard needs to be able to
     * say "we checked this and it is not your risk", which is a different and
     * more trustworthy statement than saying nothing at all.
     */
    riskAssessments: RiskAssessment[]
    /**
     * The risk graph the assessments were reconciled against.
     *
     * Returned rather than left for the caller to rebuild: the page renders the
     * graph beside the risk list, and computing it twice from two independent
     * reads means a policy added between them would leave the two panels
     * describing different wallets. Null only if the projection failed, in which
     * case `riskAssessments` is the bare assessment.
     */
    riskGraph: RiskGraphResult | null
    /** Counts per RiskStatus — the assessment summary band. */
    riskSummary: ReturnType<typeof statusCounts>
    /** Factors that, if answered, would resolve at least one `needs_review`. */
    unansweredFactors: ReturnType<typeof factorsToResolve>
    recommendations: RecommendationOutput[]
    profileCompleteness: number // 0-100
    syncStats: { created: number; dismissed: number }
    /** AI-generated risk insights (null if AI unavailable or failed) */
    aiInsights: AIRiskProfileAnalysisResponse | null
    /** Evidence / next-action / review-target per recommendation ruleId,
     *  computed fresh from the live portfolio on every run. */
    smartContent: Record<string, SmartCardContent>
    /** Whether the user has an active advisor relationship. */
    hasAgent: boolean
}

export interface RunGapEngineOptions {
    /** Run AI risk profile analysis (slower, costs tokens). Default: false */
    includeAiInsights?: boolean
    /**
     * What caused this run, stamped on the risk-profile version.
     *
     * Defaults to `policy_change` because the upload pipeline is the busiest
     * caller — but a questionnaire submission and a nightly cron are not policy
     * changes, and recording them as such makes the one column that explains a
     * score movement say the wrong thing.
     */
    trigger?: "life_event" | "policy_change" | "profile_update" | "cron" | "manual"
    /**
     * The life event that caused this run, when one did.
     *
     * Stamped on the risk-profile version so the timeline can say "this risk
     * opened because you declared a mortgage on the 14th" rather than only
     * "a recalculation happened". Without this the life-event path had to call
     * a reduced, version-only recompute in order to keep the link — which is
     * how it came to skip the score cache and the recommendation sync.
     */
    lifeEventId?: string | null
}

export interface CachedProtectionScore {
    overallScore: number
    categoryScores: Record<string, any>
    gapCount: number
    expectedLines: string[]
    actualLines: string[]
    computedAt: Date
    /** Share of the risk catalog decided, 0-100. Null on rows cached before this existed. */
    assessmentCoverage: number | null
    /** True when too little was decided for `overallScore` to mean anything. */
    indeterminate: boolean
}

/**
 * Assess this customer's risks, then reconcile the result against the risk graph.
 *
 * The graph answers the half of the question the assessment cannot: not "does a
 * policy on this line exist" but "does the cover that exists actually answer the
 * risk". It may only ever downgrade `already_covered` to `needs_review`, never
 * invent coverage (§lib/services/risk-graph/reconcile).
 *
 * **Falls back to the bare assessment if the projection throws.** Both engine
 * entry points feed the whole coverage page — score, recommendations, risk list —
 * and before the graph existed this path could not fail. A defect in a derived,
 * additive layer must degrade the answer, not blank the page.
 */
function reconciledAssessments(
    profileRecord: unknown,
    policies: RiskGraphPolicyInput[],
    lifeContext: LifeContext,
    policyFields: PolicyFields[]
): { assessments: RiskAssessment[]; riskGraph: RiskGraphResult | null } {
    try {
        const riskGraph = assembleRiskGraph(profileRecord, policies)
        return { assessments: riskGraph.assessments, riskGraph }
    } catch (err) {
        logger("error", "Risk graph reconciliation failed; scoring the bare assessment", {
            error: err instanceof Error ? err.message : String(err),
        })
        return { assessments: assessRisks(lifeContext, policyFields), riskGraph: null }
    }
}


/**
 * Attach urgency, evidence, advisor opportunity and customer benefit.
 *
 * Derived from the live assessment and graph rather than from the persisted row,
 * so these four are correct the instant a profile changes even if the row behind
 * them has not been rewritten yet.
 *
 * The life-event read is what separates urgency from priority: a gap opened by a
 * mortgage taken last month is a different proposition from the same gap carried
 * for a decade, and nothing else in the engine knows the difference. Failing soft
 * — an unreadable event history costs the recency signal, not the recommendation.
 */
async function enrichRecommendations(
    userId: string,
    recommendations: RecommendationOutput[],
    assessments: RiskAssessment[],
    lifeContext: LifeContext,
    riskGraph: RiskGraphResult | null
): Promise<RecommendationOutput[]> {
    // Both reads fail soft: the two tables involved sit behind migrations that
    // are not applied yet, and a recommendation without its provenance is worth
    // more than no recommendation.
    const [events, versionRows] = await Promise.all([
        db.lifeEventInstance
            .findMany({
                where: { userId },
                select: { id: true, definitionId: true, occurredAt: true },
                orderBy: { occurredAt: "desc" },
                take: 20,
            })
            .catch(() => [] as Array<{ id: string; definitionId: string; occurredAt: Date }>),
        db.riskProfileVersion
            .findMany({
                where: { userId },
                select: {
                    version: true,
                    computedAt: true,
                    trigger: true,
                    lifeEventId: true,
                    overallScore: true,
                    indeterminate: true,
                    openFindingCount: true,
                    risks: true,
                },
                orderBy: { version: "asc" },
                take: 200,
            })
            .catch(() => [] as any[]),
    ])

    const versions = versionRows.map((v: any) => ({
        version: v.version,
        computedAt: v.computedAt,
        trigger: v.trigger,
        lifeEventId: v.lifeEventId,
        overallScore: v.overallScore,
        indeterminate: v.indeterminate,
        openFindingCount: v.openFindingCount,
        risks: parseRisks(v.risks),
    }))

    const withContext = withRecommendationContext(recommendations, assessments, {
        age: lifeContext.age,
        recentEvents: events,
        eventExposes: risksExposedBy,
        graphRisks: riskGraph?.risks ?? [],
    })

    // Provenance: the change that put each recommendation on the screen.
    return withContext.map((rec) => {
        const cause = attributeRecommendationCause(rec.riskId, rec.createdAt, versions, events)
        return {
            ...rec,
            cause: cause ? { source: cause.source, explanation: cause.explanation } : null,
        }
    })
}

/**
 * The recommendation list for a user, complete.
 *
 * `getActiveRecommendations` is the raw row read; it returns the persisted
 * columns and leaves urgency, evidence, advisor opportunity and customer benefit
 * null because those are derived from the live assessment. Two pages called it
 * directly and rendered cards missing four of the nine things a recommendation
 * is supposed to say — a field set that depends on which function you happened
 * to call is exactly how surfaces drift apart.
 *
 * Every reader outside the engine should call this. The engine itself keeps
 * using the in-memory path, because it already holds the assessment and graph
 * and has no reason to load them twice.
 */
export async function getEnrichedRecommendations(userId: string): Promise<RecommendationOutput[]> {
    const [profileRecord, policies] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId } }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                endDate: true,
                acordData: true,
            },
        }),
    ])
    const lifeContext = toLifeContext(profileRecord)
    const policyFields: PolicyFields[] = policies.map((p) => ({
        lineOfBusiness: p.lineOfBusiness,
        status: coverageEngineStatus(p as any),
    }))
    const { assessments, riskGraph } = reconciledAssessments(
        profileRecord,
        policies,
        lifeContext,
        policyFields
    )
    return enrichRecommendations(
        userId,
        await getActiveRecommendations(userId),
        assessments,
        lifeContext,
        riskGraph
    )
}

// ── Main orchestrator ────────────────────────────────────────────────

/**
 * Run the full gap detection and scoring engine for a user.
 * This is the primary entry point.
 */
export async function runGapEngine(userId: string, opts?: RunGapEngineOptions): Promise<GapEngineResult> {
    // 1. Load user data in parallel
    const [profileRecord, policies, openGapInstances, activeRelationships] = await Promise.all([
        db.policyholderProfile.findUnique({
            where: { userId },
        }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                premiumAmount: true,
                policyNumber: true,
                startDate: true,
                endDate: true,
                coverageSummary: true,
                acordData: true,
            },
        }),
        db.gapInstance.findMany({
            where: {
                OR: [
                    { policy: { ownerUserId: userId } },
                    { userId },
                ],
                status: { in: ["open", "detected", "acknowledged"] },
            },
            include: {
                definition: {
                    select: {
                        name: true,
                        slug: true,
                        description: true,
                        // Attributes the gap to a score category when it has no
                        // policy of its own (profile-level gaps).
                        lineOfBusiness: true,
                    },
                },
                policy: {
                    select: {
                        lineOfBusiness: true,
                        insurerName: true,
                    },
                },
            },
        }),
        db.customerRelationship.count({
            where: { policyholderUserId: userId, status: "active" },
        }),
    ])
    const hasAgent = activeRelationships > 0

    // 2. Convert to engine types.
    // CRITICAL: every rule below asks "does the user have coverage for X?".
    // Policy.status is written once at creation and never recomputed, so an
    // expired policy still reads 'active' — that is how a health policy that
    // lapsed in May 2025 kept telling the user they were insured. Coverage
    // liveness is derived from the REAL end date (lib/policy-status).
    const profile = toProfileFields(profileRecord)
    const coverageActive = new Map(policies.map((p) => [p.id, isPolicyCoverageActive(p)]))
    const policyFields: PolicyFields[] = policies.map((p) => ({
        lineOfBusiness: p.lineOfBusiness,
        status: coverageEngineStatus(p),
    }))
    const activeLobs = [
        ...new Set(
            policies
                .filter((p) => coverageActive.get(p.id))
                .map((p) => p.lineOfBusiness.toLowerCase())
        ),
    ]
    // Gaps found inside a policy that no longer covers anything are not the
    // user's current risk — they must not generate recommendations or drag
    // the protection score. (They stay visible on that policy's own page.)
    const liveGapInstances = openGapInstances.filter(
        (gap) => !gap.policyId || coverageActive.get(gap.policyId)
    )

    // 3. Assess the catalog against this customer's life, then reconcile that
    // against the risk graph.
    //
    // The ordering inside assessRisks is the whole point: a risk that does not
    // apply is never examined for cover, so it can never become a
    // recommendation. The graph adds the second half of the question — whether
    // the cover that exists actually answers the risk — and can only ever
    // downgrade `already_covered` to `needs_review`, never invent coverage
    // (§lib/services/risk-graph/reconcile). Without it the score credited a
    // fire-only home policy as full home protection.
    const lifeContext = toLifeContext(profileRecord)
    const { assessments: riskAssessments, riskGraph } = reconciledAssessments(
        profileRecord,
        policies,
        lifeContext,
        policyFields
    )

    // Legacy profile gaps are still computed — the agent playbook speaks that
    // shape — but they no longer drive the score or the recommendation list.
    const profileGaps = detectProfileGaps(profile, policyFields)

    // 4. Calculate protection score from the ASSESSMENT, so only risks that
    // genuinely apply reach the denominator. Policy gaps are still passed as
    // refs so each is charged to its own category rather than to all of them.
    const protectionScore = calculateProtectionScore(
        profile,
        activeLobs,
        profileGaps,
        liveGapInstances.map((gap) => ({
            lineOfBusiness: gap.policy?.lineOfBusiness ?? gap.definition?.lineOfBusiness,
        })),
        riskAssessments
    )
    const scoreTier = getScoreTier(protectionScore.overallScore)

    // 4b. Detect portfolio-level gaps (expiring policies, duplicates,
    // low limits, unclear exclusions, missing advisor)
    const portfolioGaps = evaluatePortfolioRules(
        policies.map((p) => ({
            id: p.id,
            lineOfBusiness: p.lineOfBusiness,
            status: coverageEngineStatus(p),
            insurerName: p.insurerName,
            policyNumber: p.policyNumber,
            startDate: p.startDate,
            endDate: p.endDate,
            acordData: p.acordData,
        })),
        { hasAgent }
    )

    // 5. Generate recommendations. Only OPEN findings become recommendations:
    // `not_applicable`, `needs_review` and `already_covered` are returned to the
    // dashboard but never persisted as suggestions, because none of the three is
    // something we are asking the customer to consider.
    const riskRecs = assessmentsToRecommendations(userId, riskAssessments)
    const policyRecs = policyGapsToRecommendations(userId, liveGapInstances)

    // 5b. Match recommendations to insurance products from catalog.
    // Portfolio recs are deliberately excluded — suggesting a product on a
    // "duplicate coverage" or "expiring policy" card would read as a pitch.
    const profileTags = deriveProfileTags(profile)
    const matchedRecs = await matchProductsToRecommendations(
        prioritizeRecommendations([...riskRecs, ...policyRecs]),
        profileTags
    )
    const portfolioRecs: RecommendationInput[] = portfolioGaps.map((gap) => ({
        userId,
        lineOfBusiness: gap.lineOfBusiness,
        ruleId: gap.ruleId,
        gapInstanceId: null,
        title: gap.name,
        description: gap.reason,
        urgency: gap.severity,
        estimatedCostEur: null,
        personalReason: gap.reason,
        // Portfolio findings are about a policy the customer already holds, not
        // about a life risk, so they carry no catalog assessment.
        riskId: null,
        riskStatus: null,
        confidence: null,
        expectedImpact: null,
        suggestedSolution: null,
        eligibilityNote: null,
    }))

    // 6. Sync recommendations to DB
    const syncStats = await syncRecommendations(userId, [...matchedRecs, ...portfolioRecs])

    // 6b. Smart-card content (evidence / next action / review target),
    // recomputed from live data every run so it never goes stale.
    const smartContent: Record<string, SmartCardContent> = {}
    for (const gap of portfolioGaps) {
        smartContent[gap.ruleId] = {
            evidence: gap.evidence,
            nextAction: gap.nextAction,
            reviewHref: gap.reviewHref,
        }
    }
    // Profile-gap evidence is deliberately NOT populated any more. Its keys are
    // legacy rule ids that no recommendation carries since risk findings became
    // the source, so every entry was dead — and its fallback line ("we checked
    // your N policies, none covers X") is the product-absence framing the audit
    // objected to. Risk cards carry their own risk / why / impact / solution,
    // which is what that block was standing in for.

    // 7. Cache protection score, and version it.
    //
    // Fingerprinted: an unchanged assessment writes no row, so a nightly cron
    // over a stable book costs nothing and the history records CHANGES rather
    // than ticks.
    //
    // AWAITED, not fire-and-forget. This used to be
    // `void import(...).then(...).catch(() => {})` on the reasoning that
    // versioning is observability and must never block an upload. That was true
    // when the only consumer was the timeline. It stopped being true when the
    // risk NOTIFICATIONS — GAP_DETECTED, risk_level_changed — were hung off
    // `recordRiskProfileVersion`: a floating
    // promise in a serverless function may be terminated when the response
    // returns, so the customer-facing consequence of an upload could simply
    // never fire. Awaiting costs one write on the path that just ran an AI
    // extraction.
    //
    // Still non-fatal: `recordRiskProfileVersion` never throws into its caller
    // (it catches internally and returns `written: false`), and the try/catch
    // here is the belt to that braces — the score is the product of this
    // function, and no failure downstream of it may lose that.
    await cacheProtectionScore(userId, protectionScore)
    let versionResult: GapEngineResult["version"] = null
    try {
        const { recordRiskProfileVersion } = await import(
            "@/lib/services/life-events/risk-profile-version"
        )
        versionResult = await recordRiskProfileVersion({
            userId,
            assessments: riskAssessments,
            score: protectionScore,
            trigger: opts?.trigger ?? "policy_change",
            lifeEventId: opts?.lifeEventId ?? null,
        })
    } catch (error) {
        logger("warn", "risk profile versioning failed (non-blocking)", {
            userId,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    // 8. Fetch final recommendation list (includes existing + newly created),
    // then attach the four context fields from the LIVE assessment.
    const recommendations = await enrichRecommendations(
        userId,
        await getActiveRecommendations(userId),
        riskAssessments,
        lifeContext,
        riskGraph
    )

    // 9. How much of the customer's life we actually know. Measured over
    // ANSWERED context factors, not over non-null columns — the old measure
    // counted a defaulted `false` as filled in.
    const profileCompleteness = contextCompleteness(lifeContext)

    // 10. AI risk insights (optional, non-blocking)
    let aiInsights: AIRiskProfileAnalysisResponse | null = null
    if (opts?.includeAiInsights) {
        aiInsights = await runAiRiskAnalysis(profile, policies, userId, lifeContext)
    }

    const riskSummary = statusCounts(riskAssessments)

    logger("info", `Gap engine completed for user ${userId}`, {
        score: protectionScore.overallScore,
        risks: riskSummary,
        policyGaps: openGapInstances.length,
        recommendations: recommendations.length,
        syncStats,
        hasAiInsights: aiInsights !== null,
    })

    return {
        protectionScore,
        version: versionResult,
        scoreTier,
        profileGaps,
        riskAssessments,
        riskGraph,
        riskSummary,
        unansweredFactors: factorsToResolve(riskAssessments),
        recommendations,
        profileCompleteness,
        syncStats,
        aiInsights,
        smartContent,
        hasAgent,
    }
}

// ── Read-only snapshot ───────────────────────────────────────────────

export type GapEngineSnapshot = Omit<GapEngineResult, "syncStats" | "aiInsights" | "version">

/**
 * Read-only counterpart of runGapEngine for page renders: identical
 * computation minus every write — no gap-instance creation, no
 * recommendation sync, no score caching. The score, profile gaps and
 * smart-card evidence are computed live from current data (pure
 * functions); the recommendation list is the persisted set from the
 * last engine run, so dismissals stay respected. To actually refresh
 * the persisted state, call runGapEngine (upload pipeline, cron, or
 * the explicit refresh action).
 */
export async function getGapEngineSnapshot(userId: string): Promise<GapEngineSnapshot> {
    const [profileRecord, policies, openGapInstances, activeRelationships] = await Promise.all([
        db.policyholderProfile.findUnique({
            where: { userId },
        }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                premiumAmount: true,
                policyNumber: true,
                startDate: true,
                endDate: true,
                coverageSummary: true,
                acordData: true,
            },
        }),
        // Selected (not counted) so gaps belonging to lapsed policies can be
        // dropped — see the coverage-liveness note in runGapEngine.
        db.gapInstance.findMany({
            where: {
                OR: [
                    { policy: { ownerUserId: userId } },
                    { userId },
                ],
                status: { in: ["open", "detected", "acknowledged"] },
            },
            select: {
                id: true,
                policyId: true,
                // Needed to charge each gap to its own score category.
                policy: { select: { lineOfBusiness: true } },
                definition: { select: { lineOfBusiness: true } },
            },
        }),
        db.customerRelationship.count({
            where: { policyholderUserId: userId, status: "active" },
        }),
    ])
    const hasAgent = activeRelationships > 0

    const profile = toProfileFields(profileRecord)
    const coverageActive = new Map(policies.map((p) => [p.id, isPolicyCoverageActive(p)]))
    const policyFields: PolicyFields[] = policies.map((p) => ({
        lineOfBusiness: p.lineOfBusiness,
        status: coverageEngineStatus(p),
    }))
    const activeLobs = [
        ...new Set(
            policies
                .filter((p) => coverageActive.get(p.id))
                .map((p) => p.lineOfBusiness.toLowerCase())
        ),
    ]
    const liveGaps = openGapInstances.filter(
        (gap) => !gap.policyId || coverageActive.get(gap.policyId)
    )

    // Same reconciliation as the write path, so the score the page renders and
    // the score the engine persists cannot disagree.
    const lifeContext = toLifeContext(profileRecord)
    const { assessments: riskAssessments, riskGraph } = reconciledAssessments(
        profileRecord,
        policies,
        lifeContext,
        policyFields
    )
    const profileGaps = detectProfileGaps(profile, policyFields)
    const protectionScore = calculateProtectionScore(
        profile,
        activeLobs,
        profileGaps,
        liveGaps.map((gap) => ({
            lineOfBusiness: gap.policy?.lineOfBusiness ?? gap.definition?.lineOfBusiness,
        })),
        riskAssessments
    )
    const scoreTier = getScoreTier(protectionScore.overallScore)

    const portfolioGaps = evaluatePortfolioRules(
        policies.map((p) => ({
            id: p.id,
            lineOfBusiness: p.lineOfBusiness,
            status: coverageEngineStatus(p),
            insurerName: p.insurerName,
            policyNumber: p.policyNumber,
            startDate: p.startDate,
            endDate: p.endDate,
            acordData: p.acordData,
        })),
        { hasAgent }
    )

    const smartContent: Record<string, SmartCardContent> = {}
    for (const gap of portfolioGaps) {
        smartContent[gap.ruleId] = {
            evidence: gap.evidence,
            nextAction: gap.nextAction,
            reviewHref: gap.reviewHref,
        }
    }
    // Profile-gap evidence is deliberately NOT populated any more. Its keys are
    // legacy rule ids that no recommendation carries since risk findings became
    // the source, so every entry was dead — and its fallback line ("we checked
    // your N policies, none covers X") is the product-absence framing the audit
    // objected to. Risk cards carry their own risk / why / impact / solution,
    // which is what that block was standing in for.

    const recommendations = await enrichRecommendations(
        userId,
        await getActiveRecommendations(userId),
        riskAssessments,
        lifeContext,
        riskGraph
    )
    const profileCompleteness = contextCompleteness(lifeContext)

    return {
        protectionScore,
        scoreTier,
        profileGaps,
        riskAssessments,
        riskGraph,
        riskSummary: statusCounts(riskAssessments),
        unansweredFactors: factorsToResolve(riskAssessments),
        recommendations,
        profileCompleteness,
        smartContent,
        hasAgent,
    }
}

// ── Cached score access ──────────────────────────────────────────────

/**
 * Read-only cached protection score — NEVER runs the engine.
 *
 * Use this on render paths (e.g. /home). `getProtectionScore` recomputes via
 * `runGapEngine` (a write transaction) when the cache is stale, which turns a
 * page GET into a synchronous write + heavy compute — a thundering-herd hazard
 * at scale. This returns whatever is cached (even if older than a day) or null;
 * freshness is the cron / upload pipeline's job, and callers fall back to a
 * lightweight inline estimate when null.
 */
export async function getCachedProtectionScore(
    userId: string
): Promise<CachedProtectionScore | null> {
    const cached = await db.protectionScore.findUnique({ where: { userId } })
    if (!cached) return null
    return toCachedScore(cached)
}

/**
 * Shape a persisted row for readers.
 *
 * `assessmentCoverage` is null on rows written before it existed. Those are
 * treated as determinate: they were computed by an engine that answered every
 * risk it knew about, and retro-labelling them "not enough information" would
 * blank a score the customer has already seen.
 */
function toCachedScore(cached: {
    overallScore: number
    categoryScores: unknown
    gapCount: number
    expectedLines: unknown
    actualLines: unknown
    computedAt: Date
    assessmentCoverage: number | null
}): CachedProtectionScore {
    return {
        overallScore: cached.overallScore,
        categoryScores: cached.categoryScores as Record<string, any>,
        gapCount: cached.gapCount,
        expectedLines: cached.expectedLines as string[],
        actualLines: cached.actualLines as string[],
        computedAt: cached.computedAt,
        assessmentCoverage: cached.assessmentCoverage,
        indeterminate: cached.assessmentCoverage != null && cached.assessmentCoverage < 50,
    }
}

/**
 * Get the cached protection score, or compute if stale/missing.
 * Use this for lightweight reads (e.g., dashboard cards, agent client lists).
 */
export async function getProtectionScore(
    userId: string,
    maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<CachedProtectionScore | null> {
    const cached = await db.protectionScore.findUnique({
        where: { userId },
    })

    if (cached) {
        const age = Date.now() - cached.computedAt.getTime()
        if (age < maxAgeMs) {
            return toCachedScore(cached)
        }
    }

    // Stale or missing — recompute
    const result = await runGapEngine(userId)
    return {
        overallScore: result.protectionScore.overallScore,
        categoryScores: result.protectionScore.categoryScores,
        gapCount: result.protectionScore.gapCount,
        expectedLines: result.protectionScore.expectedLines,
        actualLines: result.protectionScore.actualLines,
        computedAt: new Date(),
        assessmentCoverage: result.protectionScore.assessmentCoverage ?? null,
        indeterminate: result.protectionScore.indeterminate ?? false,
    }
}

/**
 * Force refresh the protection score (e.g., after profile update or policy change).
 */
export async function refreshProtectionScore(
    userId: string,
    trigger: RunGapEngineOptions["trigger"] = "profile_update"
): Promise<GapEngineResult> {
    return runGapEngine(userId, { trigger })
}

// ── AI risk analysis ─────────────────────────────────────────────────

async function runAiRiskAnalysis(
    profile: ProfileFields,
    policies: Array<{
        id: string; lineOfBusiness: string; status: string; insurerName: string;
        premiumAmount: any; policyNumber: string; startDate: Date; endDate: Date;
        coverageSummary: string | null;
    }>,
    userId: string,
    ctx: LifeContext
): Promise<AIRiskProfileAnalysisResponse | null> {
    try {
        const { getAIService } = await import("@/lib/services/ai/ai-service.factory")
        const aiService = getAIService()
        if (!aiService.isAvailable()) return null

        const policyMetadata = policies.map((p) => ({
            insurerName: p.insurerName || "Unknown",
            policyNumber: p.policyNumber,
            lineOfBusiness: p.lineOfBusiness,
            startDate: p.startDate,
            endDate: p.endDate,
            premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : null,
            coverageSummary: p.coverageSummary,
        }))

        // Route through the AI gateway so the model + output cap come from the
        // per-call route decision (portfolio size escalates the tier).
        const { aiGateway } = await import("@/lib/services/ai/gateway")
        // Unknown must reach the model as unknown. Every defaulted column is sent
        // as null unless the customer actually answered it, so the prompt renders
        // "Unknown (not asked)" instead of asserting a fact nobody stated.
        const ifKnown = <T,>(factor: Parameters<typeof ctxKnown>[1], value: T): T | null =>
            ctxKnown(ctx, factor) ? value : null

        return await aiGateway.analyzeRiskProfile(
            {
                maritalStatus: profile.maritalStatus,
                dependentsCount: ifKnown("dependents", profile.dependentsCount),
                employmentStatus: profile.employmentStatus,
                ownsHome: ifKnown("residence", profile.ownsHome),
                mortgageAmount: profile.mortgageAmount ? Number(profile.mortgageAmount) : null,
                hasPets: ifKnown("pets", profile.hasPets),
                vehiclesCount: ifKnown("vehicles", profile.vehiclesCount),
                annualIncome: profile.annualIncome ? Number(profile.annualIncome) : null,
                occupation: profile.occupation,
                travelsFrequently: ifKnown("travelFrequency", profile.travelsFrequently),
                hasLoans: ifKnown("loans", profile.hasLoans),
                loanAmount: profile.loanAmount ? Number(profile.loanAmount) : null,
                smokingStatus: profile.smokingStatus,
                dateOfBirth: profile.dateOfBirth?.toISOString().split("T")[0] ?? null,
                lifeEvents: profile.lifeEvents as Array<{ type: string; date: string }> | null,
                gender: profile.gender,
                heightCm: profile.heightCm,
                weightKg: profile.weightKg,
                chronicConditions: profile.chronicConditions,
                familyMedicalHistory: profile.familyMedicalHistory,
                drivingRecord: profile.drivingRecord,
                activityLevel: profile.activityLevel,
            },
            policyMetadata,
            { userId }
        )
    } catch (err) {
        logger("warn", "AI risk profile analysis failed (non-blocking)", {
            userId,
            error: err instanceof Error ? err.message : String(err),
        })
        return null
    }
}

// ── Internal helpers ─────────────────────────────────────────────────

/** Narrow read of the knownness map, so the AI mapping stays declarative. */
function ctxKnown(ctx: LifeContext, factor: ContextFactorKey): boolean {
    return ctx.known[factor]
}

async function cacheProtectionScore(
    userId: string,
    score: ProtectionScoreResult
): Promise<void> {
    const categoryScoresJson: Record<string, number> = {}
    for (const [key, val] of Object.entries(score.categoryScores)) {
        categoryScoresJson[key] = val.score
    }

    const computedAt = new Date()

    // Read the previous reading BEFORE overwriting it — ProtectionScore keeps
    // only the latest value, so this is the one moment the delta is knowable.
    const previous = await db.protectionScore.findUnique({
        where: { userId },
        select: { overallScore: true },
    })

    await db.protectionScore.upsert({
        where: { userId },
        update: {
            overallScore: score.overallScore,
            categoryScores: categoryScoresJson,
            gapCount: score.gapCount,
            expectedLines: score.expectedLines,
            actualLines: score.actualLines,
            assessmentCoverage: score.assessmentCoverage ?? null,
            // Hoisted above so create and update stamp the SAME instant.
            computedAt,
        },
        create: {
            userId,
            overallScore: score.overallScore,
            categoryScores: categoryScoresJson,
            gapCount: score.gapCount,
            expectedLines: score.expectedLines,
            actualLines: score.actualLines,
            assessmentCoverage: score.assessmentCoverage ?? null,
            // Hoisted above so create and update stamp the SAME instant.
            computedAt,
        },
    })

    // The score trend is recorded by RiskProfileVersion, which fingerprints the
    // whole assessment rather than just the number — so it captures a change of
    // WHICH risks are open even when the total happens to land the same, and
    // writes nothing when genuinely nothing moved. A second parallel history
    // here would be a second answer to one question.
}

/**
 * Calculate how complete the user's risk profile is (0-100).
 *
 * Split into two weighted sections to avoid regressing existing users when
 * new health fields are added:
 *
 *   Core (65%): original fields — identity, financial, lifestyle booleans.
 *               A user who filled these before the health section shipped keeps
 *               ~65, sees the wizard, and is nudged to fill the health section.
 *
 *   Health (35%): new health & lifestyle fields. drivingRecord is only included
 *                 in the denominator when the user has vehicles — non-drivers
 *                 aren't penalised for not answering it.
 *
 * Boolean fields (ownsHome, hasPets, etc.) default to `false` in the DB and are
 * only counted as filled once the profile has been touched (any nullable set, or
 * any boolean toggled to true).
 */
function calculateProfileCompleteness(profile: ProfileFields): number {
    // ── Core section (weight: 65%) ────────────────────────────────────
    const coreNullable = [
        profile.maritalStatus != null,
        profile.employmentStatus != null,
        profile.dateOfBirth != null,
        profile.annualIncome != null,
        profile.occupation != null,
        profile.smokingStatus != null,
    ]

    const hasAnyNullableFilled = coreNullable.some(Boolean)
    const hasAnyBooleanToggled =
        profile.ownsHome ||
        profile.hasPets ||
        profile.travelsFrequently ||
        profile.hasLoans ||
        profile.vehiclesCount > 0 ||
        profile.dependentsCount > 0

    const profileTouched = hasAnyNullableFilled || hasAnyBooleanToggled

    const coreBooleans = profileTouched
        ? [true, true, true, true, true] // ownsHome, hasPets, vehiclesCount, travelsFrequently, hasLoans
        : [false, false, false, false, false]

    const coreChecks = [...coreNullable, ...coreBooleans]
    const coreRatio = coreChecks.filter(Boolean).length / coreChecks.length

    // ── Health section (weight: 35%) ──────────────────────────────────
    // drivingRecord is only expected for users who own vehicles.
    const healthChecks = [
        profile.gender != null,
        profile.heightCm != null,
        profile.weightKg != null,
        profile.chronicConditions != null,    // null = never answered; [] = "none"
        profile.familyMedicalHistory != null, // same semantics
        profile.activityLevel != null,
        ...(profile.vehiclesCount > 0 ? [profile.drivingRecord != null] : []),
    ]

    const healthRatio = healthChecks.length > 0
        ? healthChecks.filter(Boolean).length / healthChecks.length
        : 1 // no health checks applicable → full credit

    return Math.round((coreRatio * 0.65 + healthRatio * 0.35) * 100)
}

// ── Re-exports ───────────────────────────────────────────────────────

export { detectProfileGaps, toProfileFields } from "./profile-gap-rules"
export { calculateProtectionScore, getScoreTier, SCORE_CATEGORIES } from "./protection-score"
export {
    getActiveRecommendations,
    dismissRecommendation,
    actionRecommendation,
    getEstimatedPremium,
    matchProductsToRecommendations,
    deriveProfileTags,
    dedupeRecommendationInputs,
    recommendationDedupeKey,
    policyGapRuleId,
    policyGapConcept,
    POLICY_GAP_RULE_PREFIX,
} from "./recommendation-generator"
export { generatePlaybook, generateAgentPlaybooks } from "./agent-playbook"
export { evaluatePortfolioRules, buildProfileGapEvidence } from "./portfolio-rules"
export type { PortfolioGap, PortfolioPolicyFacts, SmartCardContent } from "./portfolio-rules"
export type { ProfileGap, ProfileFields, GapSeverity } from "./profile-gap-rules"
export type { ProtectionScoreResult, CategoryScore } from "./protection-score"
export type { RecommendationOutput, MatchedProduct } from "./recommendation-generator"
export type { AgentPlaybook, PlaybookStep } from "./agent-playbook"
