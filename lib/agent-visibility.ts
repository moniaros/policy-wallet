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
 */

const POLICY_SCOPE_PREFIX = "policy:"

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
            { createdByUserId: agentUserId },
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

/** In-memory predicate for already-loaded policies (same rule as the where). */
export function isPolicyVisibleToAgent(
    policy: { id: string; createdByUserId: string },
    agentUserId: string,
    grantedPolicyIds: Set<string>
): boolean {
    return policy.createdByUserId === agentUserId || grantedPolicyIds.has(policy.id)
}
