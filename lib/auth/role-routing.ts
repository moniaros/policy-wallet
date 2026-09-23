export type AppRole = "policyholder" | "agent" | "admin"

export function getPrimaryRole(roleValue: string | null | undefined): AppRole {
    const normalized = (roleValue || "")
        .toLowerCase()
        .split(",")
        .map((part) => part.trim())
        .find(Boolean)

    if (normalized === "agent") return "agent"
    if (normalized === "admin") return "admin"
    return "policyholder"
}

export function getPostLoginRedirectByRole(roleValue: string | null | undefined): string {
    const role = getPrimaryRole(roleValue)
    if (role === "agent") return "/dashboard/agent"
    if (role === "admin") return "/admin/dashboard"
    return "/dashboard"
}

/**
 * The roles a Supabase session carries, as one comma-separated string.
 *
 * `app_metadata.roles` is written only by the service-role admin API
 * (lib/supabase/admin.ts syncAuthRoleClaim) and is what the proxy trusts.
 * `user_metadata.role` is the older claim; a user can edit their own
 * user_metadata through the client SDK, so it is only a fallback for sessions
 * minted before the claim moved. Every page and API still checks DB roles.
 */
export function sessionRoleClaim(user: {
    app_metadata?: Record<string, unknown> | null
    user_metadata?: Record<string, unknown> | null
} | null | undefined): string {
    const trusted = user?.app_metadata?.roles
    if (typeof trusted === "string" && trusted.trim()) return trusted
    const legacy = user?.user_metadata?.role
    return typeof legacy === "string" ? legacy : ""
}

/**
 * The role the proxy gates a request as: the active-role cookie when the
 * session actually holds that role, else the claim's first role.
 *
 * Without this a "policyholder,agent" user who switched to agent in the shell
 * was still bounced off /customers, because the gate read only the first
 * token of the claim (spec-v2 audit 2026-09-23, Phase 0.2).
 */
export function resolveRequestRole(
    user: Parameters<typeof sessionRoleClaim>[0],
    activeRoleCookie: string | null | undefined
): AppRole {
    const claim = sessionRoleClaim(user)
    const held = claim.toLowerCase().split(",").map((part) => part.trim()).filter(Boolean)
    const wanted = (activeRoleCookie || "").toLowerCase().trim()
    if ((wanted === "agent" || wanted === "admin" || wanted === "policyholder") && held.includes(wanted)) {
        return wanted
    }
    return getPrimaryRole(claim)
}
