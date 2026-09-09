import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The refusal at the door, not the sign on it.
 *
 * `registerUser` is an export of a "use server" file, which makes it a callable
 * endpoint with no UI in front of it. A closed-signup notice rendered on the
 * signup page does nothing to a caller who never loads that page — a stale open
 * tab, a replayed request, a script. So the assertion here is not "it returns an
 * error": it is that `supabase.auth.signUp` is NEVER REACHED, because an account
 * half-created in the auth system and absent from ours is the mess this gate
 * exists to prevent.
 */

const gateMock = vi.hoisted(() => ({ signupAllowedFor: vi.fn() }))
vi.mock("@/lib/auth/registration-gate", () => gateMock)

const supabaseMock = vi.hoisted(() => ({
    signUp: vi.fn(),
    createClient: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => {
        supabaseMock.createClient()
        return { auth: { signUp: supabaseMock.signUp } }
    },
}))

vi.mock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } } }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ success: true }) }))
vi.mock("next/headers", () => ({ headers: async () => new Map() }))
vi.mock("next/server", () => ({ after: () => {} }))

import { registerUser } from "@/app/auth/actions"

function signupForm(email: string, language = "el") {
    const form = new FormData()
    form.append("email", email)
    form.append("password", "correct-horse-battery")
    form.append("confirmPassword", "correct-horse-battery")
    form.append("name", "")
    form.append("role", "policyholder")
    form.append("language", language)
    form.append("termsAccepted", "true")
    form.append("marketingConsent", "false")
    return form
}

describe("registerUser honours the registration gate", () => {
    beforeEach(() => {
        supabaseMock.signUp.mockReset()
        supabaseMock.createClient.mockReset()
        gateMock.signupAllowedFor.mockReset()
    })

    it("never reaches Supabase when the address is not allowed", async () => {
        gateMock.signupAllowedFor.mockResolvedValue(false)

        const result = await registerUser(signupForm("stranger@example.com"))

        expect(result.success).toBe(false)
        expect(supabaseMock.signUp).not.toHaveBeenCalled()
        // Not even a client is constructed — the refusal is before the work.
        expect(supabaseMock.createClient).not.toHaveBeenCalled()
    })

    it("asks the gate about the NORMALISED address, not the raw input", async () => {
        gateMock.signupAllowedFor.mockResolvedValue(false)

        await registerUser(signupForm("  Stranger@Example.COM  "))

        expect(gateMock.signupAllowedFor).toHaveBeenCalledWith("stranger@example.com")
    })

    it("refuses in the caller's own language", async () => {
        gateMock.signupAllowedFor.mockResolvedValue(false)

        const greek = await registerUser(signupForm("stranger@example.com", "el"))
        const english = await registerUser(signupForm("stranger@example.com", "en"))

        expect(greek.error).toMatch(/[Α-Ωα-ω]/)
        expect(english.error).toMatch(/^New registrations are paused/)
    })

    it("proceeds to Supabase when the address IS allowed", async () => {
        gateMock.signupAllowedFor.mockResolvedValue(true)
        supabaseMock.signUp.mockResolvedValue({ data: { user: null }, error: null })

        await registerUser(signupForm("invited@example.com"))

        expect(supabaseMock.signUp).toHaveBeenCalled()
    })
})
