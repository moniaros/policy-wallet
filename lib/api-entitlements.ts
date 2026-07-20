import type { NextResponse } from "next/server"
import { createApiError } from "@/lib/api-utils"
import { parseRoles, type ApiAuthResult } from "@/lib/api-auth"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"

/**
 * Entitlement gate for the collaboration write surface (thread creation, messages, actions).
 *
 * Mirrors the gate `notifyAgentAboutGap` applies in app/(protected)/wallet/actions.ts:
 * agent collaboration is a paid-plan (pro) B2C feature.
 *
 * IMPORTANT: `resolveUserEntitlements` resolves *B2C* tiers. An agent or admin account has
 * no B2C subscription and therefore resolves to `free` → `agentCollaboration: false`. Gating
 * on entitlements alone would lock agents out of their own collaboration inbox, so both roles
 * are exempted before entitlements are consulted.
 *
 * @returns `null` when the caller may proceed, otherwise a 403 response to return as-is.
 */
export async function requireCollaborationEntitlement(
    auth: ApiAuthResult
): Promise<NextResponse | null> {
    const roles = parseRoles(auth.dbUser.roles)
    if (roles.includes("agent") || roles.includes("admin")) return null

    const entitlements = await resolveUserEntitlements(auth.dbUser.id)
    if (entitlements.limits.agentCollaboration) return null

    return createApiError(
        "UPGRADE_REQUIRED",
        "Agent collaboration requires a paid plan",
        403
    )
}
