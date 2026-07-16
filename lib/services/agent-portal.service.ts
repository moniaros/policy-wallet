/**
 * Agent Portal Intelligence
 *
 * Computes the B2B dashboard KPIs and per-customer intelligence (health
 * score, next renewal, real gap counts, consent state, recommended action)
 * from the agent's book of business. One entry point — getAgentPortalData —
 * batches all lookups; the derivation helpers are pure and unit-tested.
 */

import { db } from "@/lib/db"
import { isAgentAttestedConsent } from "@/lib/ai-consent"
import { agentPolicyVisibilityWhere, getGrantedPolicyIds } from "@/lib/agent-visibility"
import { isCoveredByEndDate } from "@/lib/policy-status"

const DAY_MS = 24 * 60 * 60 * 1000
const EXPIRING_WINDOW_DAYS = 30
const STALE_INTERACTION_DAYS = 60
const STALE_INVITE_DAYS = 7

export type ConsentStatus = "granted" | "attested" | "none"

export type RecommendedActionKey =
    | "resend_invite"
    | "add_first_policy"
    | "request_consent"
    | "review_renewal"
    | "discuss_gaps"
    | "check_in"
    | "all_good"

export interface CustomerIntelligence {
    customerId: string
    healthScore: number | null
    nextRenewalDate: string | null
    gapCount: number
    criticalGapCount: number
    consentStatus: ConsentStatus
    recommendedAction: RecommendedActionKey
}

export interface AgentPortalStats {
    totalClients: number
    clientsWithExpiring: number
    clientsWithGaps: number
    pendingInvites: number
    policiesThisMonth: number
    recommendedFollowUps: number
    /** Sum of estimatedPremium over the agent's open opportunities (EUR). */
    pipelineEstimateEur: number
    /** Average client protection score (0-100); null when no client is scored yet. */
    portfolioCompleteness: number | null
}

export interface AgentPortalData {
    stats: AgentPortalStats
    intelligence: Record<string, CustomerIntelligence>
}

// ── Pure derivation helpers (unit-tested) ────────────────────────────

export function deriveConsentStatus(version: string | null | undefined): ConsentStatus {
    if (!version) return "none"
    return isAgentAttestedConsent(version) ? "attested" : "granted"
}

export interface RecommendedActionFacts {
    activationStatus: "invited" | "activated" | "inactive"
    relationshipCreatedAt: Date
    activePolicyCount: number
    consentStatus: ConsentStatus
    nextRenewalDate: Date | null
    gapCount: number
    criticalGapCount: number
    healthScore: number | null
    lastInteractionAt: Date | null
    now?: Date
}

/**
 * One concrete next step per client, in priority order: activation first,
 * then data completeness, then time-critical renewals, then risk topics,
 * then relationship hygiene.
 */
export function deriveRecommendedAction(facts: RecommendedActionFacts): RecommendedActionKey {
    const now = facts.now ?? new Date()

    if (
        facts.activationStatus === "invited" &&
        now.getTime() - facts.relationshipCreatedAt.getTime() > STALE_INVITE_DAYS * DAY_MS
    ) {
        return "resend_invite"
    }
    if (facts.activePolicyCount === 0) {
        return "add_first_policy"
    }
    if (facts.consentStatus === "none") {
        return "request_consent"
    }
    if (
        facts.nextRenewalDate &&
        facts.nextRenewalDate.getTime() - now.getTime() <= EXPIRING_WINDOW_DAYS * DAY_MS
    ) {
        return "review_renewal"
    }
    if (facts.criticalGapCount > 0 || facts.gapCount >= 2) {
        return "discuss_gaps"
    }
    if (
        !facts.lastInteractionAt ||
        now.getTime() - facts.lastInteractionAt.getTime() > STALE_INTERACTION_DAYS * DAY_MS
    ) {
        return "check_in"
    }
    return "all_good"
}

export function computePortfolioCompleteness(scores: number[]): number | null {
    if (scores.length === 0) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// ── Data assembly ────────────────────────────────────────────────────

export async function getAgentPortalData(agentUserId: string): Promise<AgentPortalData> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const expiryHorizon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS)

    const visibilityWhere = agentPolicyVisibilityWhere(
        agentUserId,
        await getGrantedPolicyIds(agentUserId)
    )

    const [relationships, pendingInvites, policiesThisMonth, openOpportunities] =
        await Promise.all([
            db.customerRelationship.findMany({
                where: { agentUserId },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    lastInteractionAt: true,
                    customer: {
                        select: {
                            id: true,
                            aiProcessingConsentVersion: true,
                            // Only the agent's own uploads + owner-granted policies.
                            // coverageEndDate (denormalized resolved end date)
                            // replaces the acordData deserialization + the
                            // placeholder-prone endDate column.
                            policiesOwned: {
                                where: visibilityWhere,
                                select: { id: true, status: true, coverageEndDate: true },
                            },
                        },
                    },
                },
            }),
            db.invite.count({
                where: {
                    inviterUserId: agentUserId,
                    consumedAt: null,
                    expiresAt: { gt: now },
                },
            }),
            db.policy.count({
                where: {
                    createdByUserId: agentUserId,
                    createdAt: { gte: startOfMonth },
                    status: { not: "deleted" },
                },
            }),
            db.opportunity.findMany({
                // Pipeline = every still-open deal (open/contacted/quoted…), not
                // just the first "open" stage — otherwise the KPI shrank as a deal
                // advanced toward closing. Matches insights' totalPotentialValue.
                where: { ownerAgentUserId: agentUserId, status: { notIn: ["won", "lost"] } },
                select: { estimatedPremium: true },
            }),
        ])

    const clientIds = relationships.map((rel) => rel.customer.id)

    const [protectionScores, openGaps, visiblePolicyOwners] = await Promise.all([
        clientIds.length
            ? db.protectionScore.findMany({
                  where: { userId: { in: clientIds } },
                  select: { userId: true, overallScore: true },
              })
            : Promise.resolve([]),
        clientIds.length
            ? db.gapInstance.findMany({
                  where: {
                      status: { in: ["open", "detected", "acknowledged"] },
                      // Gaps only from policies the agent may see — a gap count
                      // over a policy they were never given leaks its existence.
                      policy: {
                          ownerUserId: { in: clientIds },
                          ...visibilityWhere,
                      },
                  },
                  select: {
                      userId: true,
                      severity: true,
                      policy: { select: { ownerUserId: true } },
                  },
              })
            : Promise.resolve([]),
        // Clients the agent has ≥1 visible policy for — same rule as the gaps
        // query, so the protection score (computed over the WHOLE portfolio) is
        // only surfaced for customers whose policies the agent may actually see.
        clientIds.length
            ? db.policy.findMany({
                  where: { ownerUserId: { in: clientIds }, ...visibilityWhere },
                  select: { ownerUserId: true },
                  distinct: ["ownerUserId"],
              })
            : Promise.resolve([]),
    ])

    const visibleOwners = new Set(visiblePolicyOwners.map((p) => p.ownerUserId))
    const scoreByClient = new Map(
        protectionScores.filter((s) => visibleOwners.has(s.userId)).map((s) => [s.userId, s.overallScore])
    )

    const gapsByClient = new Map<string, { total: number; critical: number }>()
    for (const gap of openGaps) {
        const ownerId = gap.policy?.ownerUserId || gap.userId
        if (!ownerId) continue
        const entry = gapsByClient.get(ownerId) || { total: 0, critical: 0 }
        entry.total += 1
        if (gap.severity === "critical" || gap.severity === "high") entry.critical += 1
        gapsByClient.set(ownerId, entry)
    }

    const intelligence: Record<string, CustomerIntelligence> = {}
    let clientsWithExpiring = 0
    let clientsWithGaps = 0
    let recommendedFollowUps = 0

    for (const rel of relationships) {
        const clientId = rel.customer.id
        const activePolicies = rel.customer.policiesOwned.filter((p) => isCoveredByEndDate(p))
        const upcomingRenewals = activePolicies
            .map((p) => p.coverageEndDate)
            .filter((d): d is Date => Boolean(d && d.getTime() > now.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())
        const nextRenewal = upcomingRenewals[0] ?? null

        const gaps = gapsByClient.get(clientId) || { total: 0, critical: 0 }
        const consentStatus = deriveConsentStatus(rel.customer.aiProcessingConsentVersion)
        const activationStatus =
            rel.status === "pending_activation"
                ? ("invited" as const)
                : rel.status === "active"
                    ? ("activated" as const)
                    : ("inactive" as const)

        const recommendedAction = deriveRecommendedAction({
            activationStatus,
            relationshipCreatedAt: rel.createdAt,
            activePolicyCount: activePolicies.length,
            consentStatus,
            nextRenewalDate: nextRenewal,
            gapCount: gaps.total,
            criticalGapCount: gaps.critical,
            healthScore: scoreByClient.get(clientId) ?? null,
            lastInteractionAt: rel.lastInteractionAt,
            now,
        })

        intelligence[clientId] = {
            customerId: clientId,
            healthScore: scoreByClient.get(clientId) ?? null,
            nextRenewalDate: nextRenewal ? nextRenewal.toISOString() : null,
            gapCount: gaps.total,
            criticalGapCount: gaps.critical,
            consentStatus,
            recommendedAction,
        }

        if (nextRenewal && nextRenewal <= expiryHorizon) clientsWithExpiring += 1
        if (gaps.total > 0) clientsWithGaps += 1
        if (recommendedAction !== "all_good") recommendedFollowUps += 1
    }

    const pipelineEstimateEur = openOpportunities.reduce(
        (sum, opp) => sum + (opp.estimatedPremium ? Number(opp.estimatedPremium) : 0),
        0
    )

    return {
        stats: {
            totalClients: relationships.length,
            clientsWithExpiring,
            clientsWithGaps,
            pendingInvites,
            policiesThisMonth,
            recommendedFollowUps,
            pipelineEstimateEur,
            portfolioCompleteness: computePortfolioCompleteness(
                [...scoreByClient.values()].filter((s) => Number.isFinite(s))
            ),
        },
        intelligence,
    }
}
