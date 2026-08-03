import type { NextResponse } from "next/server"
import { createApiError } from "@/lib/api-utils"
import { parseRoles, type ApiAuthResult } from "@/lib/api-auth"
import {
    canAgentUseFeature,
    resolveUserEntitlements,
} from "@/lib/subscription-entitlements"

/**
 * Entitlement gate for the collaboration write surface (thread creation, messages, actions).
 *
 * Each side of the conversation is fenced against its OWN catalogue:
 *
 * - **Policyholders** on the B2C `agentCollaboration` limit — mirrors the gate
 *   `notifyAgentAboutGap` applies in app/(protected)/wallet/actions.ts.
 * - **Agents** on the B2B `collaborationThreads` limit (audit finding F-12).
 *   `resolveUserEntitlements` resolves *B2C* tiers, and an agent account has no
 *   B2C subscription, so it resolves to `free` → `agentCollaboration: false`.
 *   The original exemption existed to stop that quirk locking agents out of
 *   their own inbox — but it exempted them from ALL fencing, so
 *   `collaborationThreads` was sold per tier and given away to `agent_free`.
 *   Resolving agents against the agent catalogue keeps them out of the B2C
 *   trap while making what is sold actually enforced.
 *
 * Admins stay exempt: they are operating the product, not buying it.
 *
 * @returns `null` when the caller may proceed, otherwise a 403 response to return as-is.
 */
export async function requireCollaborationEntitlement(
    auth: ApiAuthResult
): Promise<NextResponse | null> {
    const roles = parseRoles(auth.dbUser.roles)
    if (roles.includes("admin")) return null

    if (roles.includes("agent")) {
        if (await canAgentUseFeature(auth.dbUser.id, "collaborationThreads")) return null
        return createApiError(
            "UPGRADE_REQUIRED",
            "Client collaboration requires a paid agent plan",
            403
        )
    }

    const entitlements = await resolveUserEntitlements(auth.dbUser.id)
    if (entitlements.limits.agentCollaboration) return null

    return createApiError(
        "UPGRADE_REQUIRED",
        "Agent collaboration requires a paid plan",
        403
    )
}
