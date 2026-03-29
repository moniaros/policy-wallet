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
import { calculateEngagementScore } from "../engagement-scoring"

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

// ── Severity weights ─────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<string, number> = {
    critical: 100,
    high: 70,
    medium: 40,
    low: 20,
}

// ── Main scoring function ────────────────────────────────────────────

/**
 * Score a single opportunity.
 */
export async function scoreOpportunity(
    opportunityId: string
): Promise<OpportunityScore> {
    const opp = await db.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
            gapInstance: {
                select: { severity: true, detectedAt: true },
            },
            relationship: {
                select: {
                    policyholderUserId: true,
                },
            },
        },
    })

    if (!opp) {
        return {
            opportunityId,
            score: 0,
            likelihood: "low",
            factors: {
                gapSeverity: 0,
                profileCompleteness: 0,
                engagementScore: 0,
                detectionRecency: 0,
            },
        }
    }

    const customerId = opp.relationship.policyholderUserId

    // 1. Gap severity (0-100)
    const gapSeverity = opp.gapInstance
        ? SEVERITY_WEIGHTS[opp.gapInstance.severity] ?? 40
        : 40

    // 2. Profile completeness (0-100)
    const profile = await db.policyholderProfile.findUnique({
        where: { userId: customerId },
    })
    const profileCompleteness = profile ? computeProfileCompleteness(profile) : 0

    // 3. Engagement score (0-100)
    const engagement = await calculateEngagementScore(customerId)
    const engagementScore = engagement.total

    // 4. Detection recency (0-100)
    const detectedAt = opp.gapInstance?.detectedAt || opp.createdAt
    const daysSinceDetection = Math.floor(
        (Date.now() - detectedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const detectionRecency =
        daysSinceDetection <= 1
            ? 100
            : daysSinceDetection <= 7
                ? 80
                : daysSinceDetection <= 14
                    ? 60
                    : daysSinceDetection <= 30
                        ? 40
                        : daysSinceDetection <= 60
                            ? 20
                            : 10

    // Weighted score
    const score = Math.round(
        gapSeverity * 0.4 +
        profileCompleteness * 0.2 +
        engagementScore * 0.2 +
        detectionRecency * 0.2
    )

    const likelihood: ConversionLikelihood =
        score >= 65 ? "high" : score >= 40 ? "medium" : "low"

    return {
        opportunityId,
        score,
        likelihood,
        factors: {
            gapSeverity,
            profileCompleteness,
            engagementScore,
            detectionRecency,
        },
    }
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

    const scores: OpportunityScore[] = []

    for (const opp of opportunities) {
        const score = await scoreOpportunity(opp.id)
        scores.push(score)
    }

    return scores.sort((a, b) => b.score - a.score)
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

function computeProfileCompleteness(profile: any): number {
    const fields = [
        profile.maritalStatus != null,
        profile.employmentStatus != null,
        profile.dateOfBirth != null,
        profile.annualIncome != null,
        profile.occupation != null,
        profile.smokingStatus != null,
    ]

    const filled = fields.filter(Boolean).length
    // Boolean fields (ownsHome, hasPets, etc.) count as always present once profile exists
    const booleanCount = 5 // ownsHome, hasPets, vehiclesCount>0 check, travelsFrequently, hasLoans
    const total = fields.length + booleanCount
    const filledTotal = filled + booleanCount

    return Math.round((filledTotal / total) * 100)
}
