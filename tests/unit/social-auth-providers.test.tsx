// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"

/**
 * Brief A6: phases are a CONFIG FLIP, not a rebuild — and a provider that is
 * not live is NOT rendered (no «Σύντομα» ghosts) and loads NOTHING.
 *
 * Universe: the registry itself plus the two components that consume it, read
 * from the filesystem — not a hardcoded provider list.
 */

// The action chain validates env at module load; give the test process the
// secret BEFORE any dynamic import pulls it in.
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-oauth-intent-hmac"

// ── the cookie jar the intent helpers write into ──
const jar = new Map<string, string>()
vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
        set: (name: string, value: string) => void jar.set(name, value),
        delete: (name: string) => void jar.delete(name),
    }),
    headers: async () => new Headers(),
}))

describe("social provider registry", () => {
    it("defaults every provider to off — a fresh environment renders no social button", async () => {
        const { SOCIAL_PROVIDERS, liveProvidersFor } = await import("@/lib/auth/social-providers")
        // The test env sets none of the NEXT_PUBLIC_AUTH_* flags.
        expect(SOCIAL_PROVIDERS.map((p) => p.status)).toEqual(["off", "off", "off"])
        expect(liveProvidersFor("policyholder")).toEqual([])
        expect(liveProvidersFor("agent")).toEqual([])
    })

    it("registers exactly the three phased providers with profile+email scopes only", async () => {
        const { SOCIAL_PROVIDERS } = await import("@/lib/auth/social-providers")
        expect(SOCIAL_PROVIDERS.map((p) => p.id)).toEqual(["google", "facebook", "linkedin_oidc"])
        for (const p of SOCIAL_PROVIDERS) {
            // Nothing that can post, read contacts, or reach beyond identity.
            expect(p.scopes.split(" ").every((s) => ["openid", "email", "profile", "public_profile"].includes(s)), `${p.id}: ${p.scopes}`).toBe(true)
        }
    })

    it("LinkedIn is agent-only by decision (brief §5)", async () => {
        const { SOCIAL_PROVIDERS } = await import("@/lib/auth/social-providers")
        expect(SOCIAL_PROVIDERS.find((p) => p.id === "linkedin_oidc")!.roles).toEqual(["agent"])
    })

    it("no provider SDK can load: the flow is a server-side redirect, no vendor script exists", () => {
        const sources = [
            "lib/auth/social-providers.ts",
            "components/auth/SocialAuthRow.tsx",
            "components/auth/SocialButton.tsx",
            "app/auth/social/actions.ts",
        ].map((f) => readFileSync(f, "utf-8")).join("\n")
        for (const host of ["connect.facebook.net", "apis.google.com", "accounts.google.com/gsi", "platform.linkedin.com", "<script"]) {
            expect(sources, `vendor SDK reference found: ${host}`).not.toContain(host)
        }
    })
})

describe("SocialAuthRow renders the registry, nothing else", () => {
    afterEach(() => vi.resetModules())

    it("renders null when no provider is live", async () => {
        const { SocialAuthRow } = await import("@/components/auth/SocialAuthRow")
        const { container } = render(<SocialAuthRow role="policyholder" locale="el" next="/onboarding" />)
        expect(container.innerHTML).toBe("")
    })

    it("renders exactly the live providers for the role — soon/off stay invisible", async () => {
        vi.doMock("@/lib/auth/social-providers", () => ({
            liveProvidersFor: (role: string) =>
                [
                    { id: "google", supabaseProvider: "google", status: "live", name: "Google", scopes: "openid email profile", roles: ["policyholder", "agent"] },
                    ...(role === "agent"
                        ? [{ id: "linkedin_oidc", supabaseProvider: "linkedin_oidc", status: "live", name: "LinkedIn", scopes: "openid email profile", roles: ["agent"] }]
                        : []),
                ],
        }))
        const { SocialAuthRow } = await import("@/components/auth/SocialAuthRow")
        render(<SocialAuthRow role="agent" locale="el" next="/onboarding/agent" showTermsNote />)
        expect(screen.getByText("Συνέχεια με Google")).toBeInTheDocument()
        expect(screen.getByText("Συνέχεια με LinkedIn")).toBeInTheDocument()
        expect(screen.queryByText(/Facebook/)).toBeNull()
        expect(screen.queryByText(/Σύντομα/)).toBeNull()
        vi.doUnmock("@/lib/auth/social-providers")
    })
})

describe("the signed OAuth intent (role survives the round trip)", () => {
    beforeEach(() => {
        jar.clear()
        process.env.AUTH_SECRET = "test-secret-for-oauth-intent-hmac"
    })

    const base = { role: "agent" as const, provider: "google", next: "/onboarding/agent", termsVersion: "2026-05", locale: "el" as const }

    it("round-trips role, next, terms version — and consumes itself", async () => {
        const { setOAuthIntent, consumeOAuthIntent } = await import("@/lib/auth/oauth-intent")
        await setOAuthIntent(base)
        const intent = await consumeOAuthIntent()
        expect(intent).toMatchObject(base)
        // one click, one callback
        expect(await consumeOAuthIntent()).toBeNull()
    })

    it("rejects a tampered payload — an edited role breaks the signature", async () => {
        const { setOAuthIntent, consumeOAuthIntent } = await import("@/lib/auth/oauth-intent")
        await setOAuthIntent({ ...base, role: "policyholder" })
        const raw = jar.get("pw_oauth_intent")!
        const [payload, mac] = [raw.slice(0, raw.lastIndexOf(".")), raw.slice(raw.lastIndexOf(".") + 1)]
        const forged = Buffer.from(
            JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), role: "agent" }),
        ).toString("base64url")
        jar.set("pw_oauth_intent", `${forged}.${mac}`)
        expect(await consumeOAuthIntent()).toBeNull()
    })

    it("rejects an expired intent", async () => {
        vi.useFakeTimers({ toFake: ["Date"] })
        const { setOAuthIntent, consumeOAuthIntent } = await import("@/lib/auth/oauth-intent")
        await setOAuthIntent(base)
        vi.setSystemTime(Date.now() + 11 * 60 * 1000)
        expect(await consumeOAuthIntent()).toBeNull()
        vi.useRealTimers()
    })

    it("rejects an off-origin next path", async () => {
        const { setOAuthIntent, consumeOAuthIntent } = await import("@/lib/auth/oauth-intent")
        await setOAuthIntent({ ...base, next: "https://evil.example" })
        expect(await consumeOAuthIntent()).toBeNull()
    })
})
