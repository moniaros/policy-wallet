"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { getProvider, type SignupRole } from "@/lib/auth/social-providers"
import { setOAuthIntent } from "@/lib/auth/oauth-intent"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"

/**
 * Starts a social sign-in/up ENTIRELY server-side (brief §2.3, §3 security):
 *
 *  - validates provider against the registry — an `off`/`soon` provider is
 *    refused here even if a stale client renders a button for it;
 *  - writes the signed, httpOnly OAuth-intent cookie (role, next, terms
 *    version, nonce, 10-min expiry) — role never travels in an editable
 *    query parameter;
 *  - asks Supabase for the provider URL with `skipBrowserRedirect`, so the
 *    PKCE code verifier lands in httpOnly cookies via @supabase/ssr — no
 *    tokens or verifiers in localStorage;
 *  - rate-limits per IP like the email register path.
 *
 * The callback URL is pinned to this app's canonical origin; Supabase's own
 * redirect-URL allowlist is the second fence.
 */
export async function startSocialAuth(input: {
    providerId: string
    role: SignupRole
    locale: "el" | "en"
    /** In-app path to land on after the callback; must start with "/". */
    next: string
}): Promise<{ url?: string; error?: string }> {
    const locale = input.locale === "en" ? "en" : "el"
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    const hdrs = await headers()
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limited = await rateLimit(`auth:oauth-start:${ip}`, 10, 5 * 60 * 1000)
    if (!limited.success) {
        return { error: t("Πάρα πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.", "Too many attempts. Please try again in a few minutes.") }
    }

    const provider = getProvider(input.providerId)
    const role: SignupRole = input.role === "agent" ? "agent" : "policyholder"
    if (!provider || provider.status !== "live" || !provider.roles.includes(role)) {
        return { error: t("Αυτή η μέθοδος σύνδεσης δεν είναι διαθέσιμη.", "This sign-in method is not available.") }
    }
    const next = typeof input.next === "string" && input.next.startsWith("/") && !input.next.startsWith("//") ? input.next : "/"

    await setOAuthIntent({
        role,
        provider: provider.id,
        next,
        termsVersion: LEGAL_POLICY_VERSIONS.terms,
        locale,
    })

    const origin = process.env.NEXTAUTH_URL || `https://${hdrs.get("host")}`
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.supabaseProvider,
        options: {
            redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
            scopes: provider.scopes,
            skipBrowserRedirect: true,
            ...(provider.id === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
    })
    if (error || !data?.url) {
        return { error: t("Η σύνδεση με τον πάροχο απέτυχε. Δοκιμάστε ξανά ή χρησιμοποιήστε email.", "Could not reach the provider. Try again, or use email.") }
    }
    return { url: data.url }
}
