import { db } from "@/lib/db"
import { parseRoles } from "@/lib/api-auth"

/**
 * Central policy authorization — the single place that decides what a viewer
 * may do with a policy. Replaces the previously divergent inline checks
 * (owner-only writes, three different read rules across surfaces).
 *
 * Model: `Policy.ownerUserId` is ALWAYS the policyholder (possibly a phantom
 * user who has not activated an account). Agents never own customer policies;
 * their capabilities come from an active, policy-scoped AccessGrant. When an
 * agent creates a policy for a customer, a "manage" grant
 * ({granter: owner, grantee: agent, scope: "policy:<id>"}) is minted at
 * creation, and the owner can revoke it at any time through the normal
 * granter-only revoke paths.
 *
 * Permission levels (AccessGrant.permissions is a legacy free-string column;
 * CSV values are split and the HIGHEST level wins; unknown tokens are READ):
 *   read/view -> READ, edit -> WRITE, manage -> MANAGE.
 *
 * Grants confer capabilities ONLY when status === "active" AND the scope is
 * exactly `policy:<id>` — the policy-scoped rule established by the
 * analysis-runs IDOR fix. `portfolio` / `upload_only` scopes intentionally
 * confer nothing here.
 *
 * Editing is available to managing agents on every subscription tier — it is
 * a core management function; tier limits bound VOLUME (maxPoliciesPerCustomer
 * at creation) and AI usage, not the ability to correct data.
 */

export type PolicyPermissionLevel = "none" | "read" | "write" | "manage"

export interface PolicyAccessViewer {
    id: string
    /** Comma-separated roles string as stored on User.roles. */
    roles?: string | null
}

export interface PolicyAccessInput {
    policy: { id: string; ownerUserId: string; createdByUserId: string } | null
    viewer: PolicyAccessViewer
    /** Active grant rows for this viewer (any scope; filtering happens here). */
    grants: { scope: string; permissions: string; status: string }[]
    /** Relationship between viewer-as-agent and the policy owner, if any. */
    relationship: { status: string } | null
}

export interface PolicyAccess {
    exists: boolean
    isOwner: boolean
    /** Highest active policy-scoped grant level held by the viewer. */
    grantLevel: PolicyPermissionLevel
    /** True when the viewer is an agent with a usable relationship to the owner. */
    hasAgentRelationship: boolean
    canRead: boolean
    canWrite: boolean
    canManageDocuments: boolean
    canAnalyze: boolean
    canDelete: boolean
}

const NO_ACCESS: PolicyAccess = {
    exists: false,
    isOwner: false,
    grantLevel: "none",
    hasAgentRelationship: false,
    canRead: false,
    canWrite: false,
    canManageDocuments: false,
    canAnalyze: false,
    canDelete: false,
}

const LEVEL_ORDER: Record<PolicyPermissionLevel, number> = {
    none: 0,
    read: 1,
    write: 2,
    manage: 3,
}

function normalizePermissionToken(token: string): PolicyPermissionLevel {
    switch (token.trim().toLowerCase()) {
        case "manage":
            return "manage"
        case "edit":
            return "write"
        case "read":
        case "view":
            return "read"
        default:
            // Unknown legacy tokens degrade safely to read-only.
            return token.trim() ? "read" : "none"
    }
}

/** Highest level expressed by a permissions string (possibly CSV). */
export function normalizePermissions(permissions: string): PolicyPermissionLevel {
    return permissions
        .split(",")
        .map(normalizePermissionToken)
        .reduce<PolicyPermissionLevel>(
            (highest, level) => (LEVEL_ORDER[level] > LEVEL_ORDER[highest] ? level : highest),
            "none"
        )
}

/** Pure decision function — all I/O stays in getPolicyAccess. */
export function computePolicyAccess(input: PolicyAccessInput): PolicyAccess {
    const { policy, viewer, grants, relationship } = input
    if (!policy) return NO_ACCESS

    const isOwner = policy.ownerUserId === viewer.id

    const policyScope = `policy:${policy.id}`
    const grantLevel = grants
        .filter((grant) => grant.status === "active" && grant.scope === policyScope)
        .map((grant) => normalizePermissions(grant.permissions))
        .reduce<PolicyPermissionLevel>(
            (highest, level) => (LEVEL_ORDER[level] > LEVEL_ORDER[highest] ? level : highest),
            "none"
        )

    const isAgent = parseRoles(viewer.roles ?? "").includes("agent")
    const hasAgentRelationship =
        !isOwner && isAgent && relationship != null && relationship.status !== "inactive"

    const canWrite = isOwner || LEVEL_ORDER[grantLevel] >= LEVEL_ORDER.write
    const canRead = isOwner || grantLevel !== "none" || hasAgentRelationship

    return {
        exists: true,
        isOwner,
        grantLevel,
        hasAgentRelationship,
        canRead,
        canWrite,
        canManageDocuments: canWrite,
        // Analysis: owner, write/manage grants, or a relationship-connected
        // agent (preserves the existing agent-portfolio behavior). Pure READ
        // grants (shared viewers) may not spend analysis resources.
        canAnalyze: isOwner || LEVEL_ORDER[grantLevel] >= LEVEL_ORDER.write || hasAgentRelationship,
        // Delete: owner, or a managing agent — the owner can end this at any
        // time by revoking the manage grant.
        canDelete: isOwner || grantLevel === "manage",
    }
}

/**
 * Load everything needed and decide. One policy fetch, one grant fetch, and
 * (only when relevant) one relationship fetch.
 */
export async function getPolicyAccess(
    policyId: string,
    viewer: PolicyAccessViewer
): Promise<PolicyAccess & { policy: { id: string; ownerUserId: string; createdByUserId: string } | null }> {
    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { id: true, ownerUserId: true, createdByUserId: true },
    })

    if (!policy) return { ...NO_ACCESS, policy: null }

    const isOwner = policy.ownerUserId === viewer.id
    const isAgent = parseRoles(viewer.roles ?? "").includes("agent")

    const [grants, relationship] = await Promise.all([
        isOwner
            ? Promise.resolve([])
            : db.accessGrant.findMany({
                  where: {
                      granteeUserId: viewer.id,
                      status: "active",
                      scope: `policy:${policyId}`,
                  },
                  select: { scope: true, permissions: true, status: true },
              }),
        isOwner || !isAgent
            ? Promise.resolve(null)
            : db.customerRelationship.findFirst({
                  where: {
                      agentUserId: viewer.id,
                      policyholderUserId: policy.ownerUserId,
                  },
                  select: { status: true },
              }),
    ])

    return {
        ...computePolicyAccess({ policy, viewer, grants, relationship }),
        policy,
    }
}
