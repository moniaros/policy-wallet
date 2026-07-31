import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

/**
 * Turn detected coverage gaps into agent opportunities, automatically.
 *
 * Opportunity rows were only ever created by an EXPLICIT cross-sell run, so the
 * agent dashboard's pipeline value read €0 no matter how many gaps the analysis
 * found. The demo beat "the agent watches the opportunity appear" did not work
 * because nothing made it appear — a gap and an opportunity were connected only
 * by someone remembering to press a button.
 *
 * Three rules this deliberately keeps:
 *
 *  1. **Consent decides visibility, not the relationship.** A relationship is
 *     created unilaterally by the agent; it is not permission. An opportunity
 *     is therefore only raised for a policy the agent may actually SEE — one
 *     they uploaded, or one the owner granted them per-policy and can revoke.
 *  2. **No LLM call.** This runs on every completed analysis. The gap already
 *     carries its explanation; re-asking a model would add cost and latency to
 *     a hot path for text we already have.
 *  3. **Dedupe on the gap.** `Opportunity.gapInstanceId` is the key, so a
 *     re-analysis updates rather than duplicating. Without this, every re-run
 *     would inflate the agent's pipeline with copies of the same finding.
 */

const POLICY_SCOPE_PREFIX = "policy:"

export interface GapOpportunitySyncResult {
    created: number
    existing: number
    agentsNotified: number
}

/**
 * Agents who may currently see this policy: whoever uploaded it, plus anyone
 * holding an active, policy-scoped grant from the owner.
 */
async function agentsWithVisibility(policyId: string, createdByUserId: string | null) {
    const grants = await db.accessGrant.findMany({
        where: {
            status: "active",
            scope: `${POLICY_SCOPE_PREFIX}${policyId}`,
        },
        select: { granteeUserId: true },
    })

    const ids = new Set(grants.map((g) => g.granteeUserId))
    if (createdByUserId) ids.add(createdByUserId)
    return [...ids]
}

export async function syncOpportunitiesForPolicy(
    policyId: string
): Promise<GapOpportunitySyncResult> {
    const empty: GapOpportunitySyncResult = { created: 0, existing: 0, agentsNotified: 0 }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { id: true, ownerUserId: true, createdByUserId: true, lineOfBusiness: true },
    })
    if (!policy) return empty

    const candidateAgentIds = await agentsWithVisibility(policy.id, policy.createdByUserId)
    // The owner uploading their own policy is not an agent opportunity.
    const agentIds = candidateAgentIds.filter((id) => id !== policy.ownerUserId)
    if (agentIds.length === 0) return empty

    const gaps = await db.gapInstance.findMany({
        where: { policyId: policy.id, status: "open" },
        select: { id: true, severity: true, aiExplanation: true, aiExplanationEl: true },
    })
    if (gaps.length === 0) return empty

    // Only relationships that exist between these agents and this policy's
    // owner — an opportunity has to hang off one.
    const relationships = await db.customerRelationship.findMany({
        where: {
            policyholderUserId: policy.ownerUserId,
            agentUserId: { in: agentIds },
            status: { not: "terminated" },
        },
        select: { id: true, agentUserId: true },
    })
    if (relationships.length === 0) return empty

    const gapIds = gaps.map((g) => g.id)
    const already = await db.opportunity.findMany({
        where: {
            gapInstanceId: { in: gapIds },
            relationshipId: { in: relationships.map((r) => r.id) },
        },
        select: { gapInstanceId: true, relationshipId: true },
    })
    const seen = new Set(already.map((o) => `${o.relationshipId}:${o.gapInstanceId}`))

    let created = 0
    const notified: string[] = []

    for (const relationship of relationships) {
        let createdForAgent = 0

        for (const gap of gaps) {
            if (seen.has(`${relationship.id}:${gap.id}`)) continue

            await db.opportunity.create({
                data: {
                    relationshipId: relationship.id,
                    ownerAgentUserId: relationship.agentUserId,
                    policyId: policy.id,
                    gapInstanceId: gap.id,
                    status: "open",
                    lineOfBusiness: policy.lineOfBusiness,
                    currency: "EUR",
                    // The gap's own explanation, not a fresh model call.
                    notes: gap.aiExplanation || gap.aiExplanationEl || null,
                },
            })
            created += 1
            createdForAgent += 1
        }

        if (createdForAgent > 0) {
            await db.notificationEvent.create({
                data: {
                    // userId only — an audit/notification trail must not become a
                    // second copy of anyone's contact details.
                    userId: relationship.agentUserId,
                    eventType: "opportunities_detected",
                    channel: "in_app",
                    title: "Νέες ευκαιρίες",
                    message: `${createdForAgent}`,
                    relatedObjectType: "policy",
                    relatedObjectId: policy.id,
                },
            })
            notified.push(relationship.agentUserId)
        }
    }

    if (created > 0) {
        logger("info", "Gap opportunities synced", {
            policyId: policy.id,
            created,
            agentsNotified: notified.length,
        })
    }

    return { created, existing: seen.size, agentsNotified: notified.length }
}
