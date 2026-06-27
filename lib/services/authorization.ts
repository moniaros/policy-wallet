import { PrismaClient } from "@prisma/client"
import { db } from "@/lib/db"

export interface PolicyAccessResult {
    /** True when the user owns the policy. */
    isOwner: boolean
    /** True when an active AccessGrant exists from the owner to the user. */
    hasGrant: boolean
    /** True when the user is an agent linked to the owner. Only evaluated when requested. */
    hasAgentRelationship: boolean
    /** Final decision: owner, OR an active grant, OR (when requested) an agent relationship. */
    allowed: boolean
}

/** Minimal Prisma surface this helper needs — keeps it unit-testable with a stub. */
type AccessClient = Pick<PrismaClient, "accessGrant" | "customerRelationship">

/**
 * Resolve whether `userId` may access a policy owned by `ownerUserId`.
 *
 * Centralizes the "owner OR active grant [OR agent relationship]" check that was
 * hand-rolled across the gap and policy services. It returns a decision rather
 * than throwing, so each call site keeps its own error message and control flow
 * — which is what makes lifting this out behaviour-preserving.
 *
 * Query ordering matches the original inline checks exactly:
 *   - an owner short-circuits with no DB query;
 *   - the agent-relationship lookup runs only when `includeAgentRelationship`
 *     is set AND no active grant was found.
 *
 * `policyScopeId` mirrors the two grant-query shapes that exist in the codebase:
 * when set, the grant lookup is narrowed to a `policy:<id>`-scoped grant (as the
 * wallet actions do); when omitted, any active owner→grantee grant matches (as
 * the gap service and analysis-run routes do). Passing it never broadens access.
 */
export async function resolvePolicyAccess(
    ownerUserId: string,
    userId: string,
    options: { includeAgentRelationship?: boolean; policyScopeId?: string } = {},
    client: AccessClient = db,
): Promise<PolicyAccessResult> {
    if (ownerUserId === userId) {
        return { isOwner: true, hasGrant: false, hasAgentRelationship: false, allowed: true }
    }

    const grant = await client.accessGrant.findFirst({
        where: {
            granterUserId: ownerUserId,
            granteeUserId: userId,
            status: "active",
            ...(options.policyScopeId ? { scope: `policy:${options.policyScopeId}` } : {}),
        },
    })
    const hasGrant = !!grant

    let hasAgentRelationship = false
    if (options.includeAgentRelationship && !hasGrant) {
        const relationship = await client.customerRelationship.findFirst({
            where: { agentUserId: userId, policyholderUserId: ownerUserId },
        })
        hasAgentRelationship = !!relationship
    }

    return {
        isOwner: false,
        hasGrant,
        hasAgentRelationship,
        allowed: hasGrant || hasAgentRelationship,
    }
}
