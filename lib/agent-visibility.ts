import { db } from "@/lib/db"

/**
 * What an agent is allowed to SEE of a customer's portfolio.
 *
 * A CustomerRelationship is not consent: the agent creates it unilaterally
 * (an invite that was never accepted, or "add customer" by email). Reading a
 * relationship as permission let an agent open every policy a policyholder
 * had ever uploaded themselves — silently. Visibility is therefore per-policy
 * and comes from exactly two places:
 *
 *   1. the agent uploaded the policy for that customer (Policy.createdByUserId),
 *   2. the owner granted access to that policy (AccessGrant scope
 *      `policy:<id>`) — their own share action, or the revocable grant
 *      auto-minted for a policy the agent uploaded.
 *
 * Everything the agent sees is therefore either their own work or explicitly
 * shared with them, and the owner can revoke it at any time.
 *
 * BOTH arms are conditional on a living relationship. The upload arm used not
 * to be, and that was a leak with no expiry: terminating a relationship revokes
 * the grants (agent/relationship-actions.ts) but cannot revoke
 * `Policy.createdByUserId`, which is immutable history. An agent who had been
 * dismissed therefore kept seeing every policy they had ever uploaded for that
 * customer — dashboards, protection scores, and the branded report, which
 * serves the analysis itself — while the termination action's own docstring
 * promised that access had stopped. `lib/policy-access.ts` had the rule right
 * (`isManagingAgent` requires `hasAgentRelationship`); this module did not.
 *
 * "Living" means not `inactive` and not `terminated` — deliberately NOT
 * `status === "active"`. The column defaults to `pending_activation`, which is
 * the normal state while a customer has yet to accept, and an agent must still
 * be able to see the policy they just uploaded for them. This mirrors
 * computePolicyAccess exactly; the two must not drift again.
 */

const POLICY_SCOPE_PREFIX = "policy:"

/** Relationship states that end an agent's access. Mirrors computePolicyAccess. */
export const ENDED_RELATIONSHIP_STATUSES = ["inactive", "terminated"] as const

/** Policy ids this agent holds an active, policy-scoped grant for. */
export async function getGrantedPolicyIds(agentUserId: string): Promise<string[]> {
    const grants = await db.accessGrant.findMany({
        where: {
            granteeUserId: agentUserId,
            status: "active",
            scope: { startsWith: POLICY_SCOPE_PREFIX },
        },
        select: { scope: true },
    })
    return grants
        .map((grant) => grant.scope.slice(POLICY_SCOPE_PREFIX.length))
        .filter(Boolean)
}

/**
 * Prisma `where` fragment restricting policies to the ones an agent may see.
 * Compose it into any policy query an agent-facing surface runs.
 */
export function agentPolicyVisibilityWhere(agentUserId: string, grantedPolicyIds: string[]) {
    return {
        OR: [
            {
                createdByUserId: agentUserId,
                // The relationship is re-checked here rather than by the caller
                // so that every consumer of this fragment gets the rule, and a
                // new agent-facing query cannot opt out of it by accident.
                owner: {
                    customerRelationshipsAsCustomer: {
                        some: {
                            agentUserId,
                            status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] },
                        },
                    },
                },
            },
            ...(grantedPolicyIds.length > 0 ? [{ id: { in: grantedPolicyIds } }] : []),
        ],
    }
}

/** One-call convenience for server code that has no grant list yet. */
export async function getAgentPolicyVisibilityWhere(agentUserId: string) {
    const grantedPolicyIds = await getGrantedPolicyIds(agentUserId)
    return agentPolicyVisibilityWhere(agentUserId, grantedPolicyIds)
}

/**
 * Per-owner count of policies this agent may see, for a batch of customers in
 * one query. Feeds the identity-consent rule (visiblePolicyCount) and gates
 * portfolio-derived data (protection scores, gap counts) on surfaces that
 * would otherwise serve whole-portfolio numbers for unconsented customers.
 */
export async function getVisiblePolicyCountsByOwner(
    agentUserId: string,
    ownerUserIds: string[]
): Promise<Map<string, number>> {
    if (ownerUserIds.length === 0) return new Map()
    const visibilityWhere = await getAgentPolicyVisibilityWhere(agentUserId)
    const rows = await db.policy.groupBy({
        by: ["ownerUserId"],
        where: { ownerUserId: { in: ownerUserIds }, ...visibilityWhere },
        _count: { _all: true },
    })
    return new Map(rows.map((row) => [row.ownerUserId, row._count._all]))
}

/**
 * Owners this agent still has a living relationship with.
 *
 * The companion to the `where` fragment for code that decides in memory. Fetch
 * it once per request and pass it down; it is a small set (an agent's own book).
 */
export async function getLiveCustomerUserIds(agentUserId: string): Promise<Set<string>> {
    const rows = await db.customerRelationship.findMany({
        where: { agentUserId, status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] } },
        select: { policyholderUserId: true },
    })
    return new Set(rows.map((row) => row.policyholderUserId))
}

/**
 * In-memory predicate for already-loaded policies (same rule as the where).
 *
 * `ownerUserId` and `liveCustomerUserIds` are REQUIRED, and deliberately not
 * optional with a permissive default: every existing call site had to be
 * revisited to supply them, which is the point. An optional parameter here
 * would have let the leak survive at whichever call site nobody remembered.
 */
export function isPolicyVisibleToAgent(
    policy: { id: string; createdByUserId: string; ownerUserId: string },
    agentUserId: string,
    grantedPolicyIds: Set<string>,
    liveCustomerUserIds: Set<string>
): boolean {
    if (grantedPolicyIds.has(policy.id)) return true
    return (
        policy.createdByUserId === agentUserId &&
        liveCustomerUserIds.has(policy.ownerUserId)
    )
}
