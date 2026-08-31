/**
 * Social-login provider registry — the ONE place that decides which providers
 * exist, what they may ask for, and whether they render (brief §2.3).
 *
 * `status` drives everything: the UI renders only `live` providers — a
 * provider that is not live is NOT rendered (no «Σύντομα» ghost buttons,
 * brief §3), and `startSocialAuth` refuses to start a flow for one. Phases
 * are therefore a config change plus credentials, never a rebuild:
 *
 *   phase 1  google    — env-gated below; flip NEXT_PUBLIC_AUTH_GOOGLE=live
 *                        once the Google client exists and the provider is
 *                        enabled in Supabase (docs/auth-audit.md §8)
 *   phase 2  facebook  — off until Meta app review grants the email scope
 *   phase 3  linkedin  — off; agent-form-only by design (roles list)
 *
 * Scopes are profile + email ONLY — nothing that can post or read contacts.
 * The exact strings here are the documentation of record (docs/auth-audit.md §8).
 *
 * NEXT_PUBLIC_* reads must be STATIC property accesses or Next.js cannot
 * inline them into the client bundle — no dynamic `process.env[key]`.
 */
export type SocialProviderId = "google" | "facebook" | "linkedin_oidc"
export type SocialProviderStatus = "live" | "soon" | "off"
export type SignupRole = "policyholder" | "agent"

export interface SocialProviderDef {
    id: SocialProviderId
    /** The `provider` value passed to supabase.auth.signInWithOAuth. */
    supabaseProvider: "google" | "facebook" | "linkedin_oidc"
    status: SocialProviderStatus
    /** Vendor name as rendered on the button («Συνέχεια με {name}»). */
    name: string
    /** OAuth scopes requested — profile + email only, documented in the audit. */
    scopes: string
    /** Which signup forms render it. LinkedIn is agent-only by decision (brief §5). */
    roles: readonly SignupRole[]
}

function statusFromEnv(value: string | undefined, fallback: SocialProviderStatus): SocialProviderStatus {
    return value === "live" || value === "soon" || value === "off" ? value : fallback
}

export const SOCIAL_PROVIDERS: readonly SocialProviderDef[] = [
    {
        id: "google",
        supabaseProvider: "google",
        status: statusFromEnv(process.env.NEXT_PUBLIC_AUTH_GOOGLE, "off"),
        name: "Google",
        scopes: "openid email profile",
        roles: ["policyholder", "agent"],
    },
    {
        id: "facebook",
        supabaseProvider: "facebook",
        status: statusFromEnv(process.env.NEXT_PUBLIC_AUTH_FACEBOOK, "off"),
        name: "Facebook",
        scopes: "email public_profile",
        roles: ["policyholder", "agent"],
    },
    {
        id: "linkedin_oidc",
        supabaseProvider: "linkedin_oidc",
        status: statusFromEnv(process.env.NEXT_PUBLIC_AUTH_LINKEDIN, "off"),
        name: "LinkedIn",
        scopes: "openid email profile",
        roles: ["agent"],
    },
]

/** The providers a given form actually renders. */
export function liveProvidersFor(role: SignupRole): SocialProviderDef[] {
    return SOCIAL_PROVIDERS.filter((p) => p.status === "live" && p.roles.includes(role))
}

export function getProvider(id: string): SocialProviderDef | undefined {
    return SOCIAL_PROVIDERS.find((p) => p.id === id)
}
