/**
 * Agent Opportunity Scoring
 *
 * Computes a conversion likelihood score for each sales opportunity,
 * enabling agents to prioritize their outreach.
 *
 * Score = weighted combination of:
 * - Gap severity (40%) — critical gaps convert better (urgency)
 * - Profile completeness (20%) — more data = higher confidence
 * - Engagement score (20%) — active users convert better
 * - Detection recency (20%) — freshly detected = higher urgency
 */

import { db } from "@/lib/db"
import { contextCompleteness, toLifeContext } from "./life-context"
import { calculateEngagementScoresBatch } from "../engagement-scoring"

export type ConversionLikelihood = "high" | "medium" | "low"

export interface OpportunityScore {
    opportunityId: string
    score: number // 0-100
    likelihood: ConversionLikelihood
    factors: {
        gapSeverity: number
        profileCompleteness: number
        engagementScore: number
        detectionRecency: number
    }
}

// Severity is not an input to ordering (PW-TRANSPARENCY-02 B1): a gap-backed
// opportunity carries one flat weight, whatever the rule's unvalidated severity.
const GAP_BACKED_WEIGHT = 40

// ── Main scoring functions ───────────────────────────────────────────

const ZERO_SCORE = (opportunityId: string): OpportunityScore => ({
    opportunityId,
    score: 0,
    likelihood: "low",
    factors: { gapSeverity: 0, profileCompleteness: 0, engagementScore: 0, detectionRecency: 0 },
})

function detectionRecencyScore(detectedAt: Date, now: number): number {
    const days = Math.floor((now - detectedAt.getTime()) / (1000 * 60 * 60 * 24))
    return days <= 1 ? 100
        : days <= 7 ? 80
            : days <= 14 ? 60
                : days <= 30 ? 40
                    : days <= 60 ? 20
                        : 10
}

/**
 * Score many opportunities at once.
 *
 * Scoring one opportunity needs its customer's engagement score and profile —
 * both of which are per-CUSTOMER, not per-opportunity, and many opportunities
 * share a customer. Doing this one opportunity at a time (as the old
 * `scoreOpportunity` loop did) fired ~8 queries EACH; an agent with hundreds of
 * open opportunities turned a dashboard render into thousands of serial round
 * trips. This gathers the opportunities, then engagement + profiles for the
 * distinct customers, in a bounded set of queries and scores in memory.
 *
 * Returns a Map keyed by opportunityId; ids with no matching row are omitted.
 */
export async function scoreOpportunitiesBatch(
    opportunityIds: string[]
): Promise<Map<string, OpportunityScore>> {
    const result = new Map<string, OpportunityScore>()
    const ids = [...new Set(opportunityIds)]
    if (ids.length === 0) return result

    const opps = await db.opportunity.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            createdAt: true,
            gapInstance: { select: { severity: true, detectedAt: true } },
            relationship: { select: { policyholderUserId: true } },
        },
    })

    const customerIds = [...new Set(opps.map((o) => o.relationship.policyholderUserId))]

    const [engagementByCustomer, profiles] = await Promise.all([
        calculateEngagementScoresBatch(customerIds),
        db.policyholderProfile.findMany({ where: { userId: { in: customerIds } } }),
    ])
    const profileByCustomer = new Map(profiles.map((p) => [p.userId, p]))

    const now = Date.now()

    for (const opp of opps) {
        const customerId = opp.relationship.policyholderUserId

        const gapSeverity = opp.gapInstance ? GAP_BACKED_WEIGHT : 40

        const profile = profileByCustomer.get(customerId)
        const profileCompleteness = profile ? computeProfileCompleteness(profile) : 0

        const engagementScore = engagementByCustomer.get(customerId)?.total ?? 0

        const detectionRecency = detectionRecencyScore(
            opp.gapInstance?.detectedAt || opp.createdAt,
            now
        )

        const score = Math.round(
            gapSeverity * 0.4 +
            profileCompleteness * 0.2 +
            engagementScore * 0.2 +
            detectionRecency * 0.2
        )

        const likelihood: ConversionLikelihood =
            score >= 65 ? "high" : score >= 40 ? "medium" : "low"

        result.set(opp.id, {
            opportunityId: opp.id,
            score,
            likelihood,
            factors: { gapSeverity, profileCompleteness, engagementScore, detectionRecency },
        })
    }

    return result
}

/**
 * Score a single opportunity. Thin wrapper over the batch path so both share
 * one implementation.
 */
export async function scoreOpportunity(
    opportunityId: string
): Promise<OpportunityScore> {
    const scores = await scoreOpportunitiesBatch([opportunityId])
    return scores.get(opportunityId) ?? ZERO_SCORE(opportunityId)
}

/**
 * Score all open opportunities for an agent.
 * Returns sorted by score descending.
 */
export async function scoreAgentOpportunities(
    agentUserId: string
): Promise<OpportunityScore[]> {
    const opportunities = await db.opportunity.findMany({
        where: {
            ownerAgentUserId: agentUserId,
            status: { in: ["open", "contacted"] },
        },
        select: { id: true },
    })

    const scores = await scoreOpportunitiesBatch(opportunities.map((o) => o.id))
    return [...scores.values()].sort((a, b) => b.score - a.score)
}

/**
 * Get a summary of opportunity scores for an agent's dashboard.
 */
export async function getOpportunitySummary(agentUserId: string): Promise<{
    total: number
    highLikelihood: number
    mediumLikelihood: number
    lowLikelihood: number
    topOpportunities: OpportunityScore[]
}> {
    const scores = await scoreAgentOpportunities(agentUserId)

    return {
        total: scores.length,
        highLikelihood: scores.filter((s) => s.likelihood === "high").length,
        mediumLikelihood: scores.filter((s) => s.likelihood === "medium").length,
        lowLikelihood: scores.filter((s) => s.likelihood === "low").length,
        topOpportunities: scores.slice(0, 10),
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * How much of the client's life we know — the SAME measure the customer sees.
 *
 * This carried its own six-field definition, which was a third independent
 * answer to one question (the customer-facing score had two of its own). It also
 * predated `answeredFields`, so a client who had carefully answered "no" to
 * every boolean read as 0% complete to their advisor while reading ~100% to
 * themselves. Two surfaces describing the same person differently is how an
 * advisor loses trust in the number.
 *
 * `contextCompleteness` counts answered CONTEXT FACTORS, which is what the
 * phrase means on both sides.
 */
function computeProfileCompleteness(profile: any): number {
    return contextCompleteness(toLifeContext(profile ?? null))
}
