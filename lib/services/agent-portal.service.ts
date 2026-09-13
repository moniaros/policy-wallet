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
import { readLiveGapRows } from "@/lib/gaps/gap-rows"

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
    | "run_analysis"
    | "check_in"
    | "all_good"

export interface CustomerIntelligence {
    customerId: string
    nextRenewalDate: string | null
    gapCount: number
    criticalGapCount: number
    /** Findings no human has classified yet — a labelled figure beside the headline, never inside it (A-02). */
    underReviewCount?: number
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
    /** Active policies a completed analysis has read. Zero with policies present means «all good» would be a verdict over nothing (H-V13). */
    analysedPolicyCount: number
    consentStatus: ConsentStatus
    nextRenewalDate: Date | null
    gapCount: number
    criticalGapCount: number
    /** Findings no human has classified yet — a labelled figure beside the headline, never inside it (A-02). */
    underReviewCount?: number
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
    // Nothing has read the book yet: a gap count of zero is not evidence of no
    // gaps, so «all good» would render the absence of a check as reassurance.
    if (facts.activePolicyCount > 0 && facts.analysedPolicyCount === 0) {
        return "run_analysis"
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
                where: { agentUserId, status: { not: "terminated" } },
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
                                select: { id: true, status: true, coverageEndDate: true, lastAnalyzedAt: true },
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

    // The per-client protection score used to be fetched here alongside the gaps
    // and filtered to visible owners; nothing renders it since B1.7 — removed with
    // its owner-set query (PW-BRIDGE-01 A-11).
    const [openGaps] = await Promise.all([
        clientIds.length
            ? readLiveGapRows({ scope: "disclosed",
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
                      // The accessor tags provenance from the slug (B3); the tag splits the headline
                      // (classified) from the labelled under-review figure (PW-BRIDGE-01 A-02).
                      definition: { select: { slug: true } },
                  },
              })
            : Promise.resolve([]),
    ])

    // `total` and `critical` are CLASSIFIED (the conversation number, D-B1); `underReview` is the
    // separate labelled figure the customer's home already shows and the agent could not see (A-02).
    const gapsByClient = new Map<string, { total: number; critical: number; underReview: number }>()
    for (const gap of openGaps) {
        const ownerId = gap.policy?.ownerUserId || gap.userId
        if (!ownerId) continue
        const entry = gapsByClient.get(ownerId) || { total: 0, critical: 0, underReview: 0 }
        if (gap.provenance === "under_review") {
            entry.underReview += 1
        } else {
            entry.total += 1
            if (gap.severity === "critical" || gap.severity === "high") entry.critical += 1
        }
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

        const gaps = gapsByClient.get(clientId) || { total: 0, critical: 0, underReview: 0 }
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
            analysedPolicyCount: activePolicies.filter((p) => p.lastAnalyzedAt).length,
            consentStatus,
            nextRenewalDate: nextRenewal,
            gapCount: gaps.total,
            criticalGapCount: gaps.critical,
            lastInteractionAt: rel.lastInteractionAt,
            now,
        })

        intelligence[clientId] = {
            customerId: clientId,
            nextRenewalDate: nextRenewal ? nextRenewal.toISOString() : null,
            gapCount: gaps.total,
            criticalGapCount: gaps.critical,
            underReviewCount: gaps.underReview,
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
            // F2 (PW-TRANSPARENCY-02): the averaged protection score left the KPI
            // strip; nothing renders it, so nothing is computed for it here.
        },
        intelligence,
    }
}
