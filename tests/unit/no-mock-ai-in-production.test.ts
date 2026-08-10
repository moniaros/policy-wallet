import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"

/**
 * Production must never serve mock analysis.
 *
 * The factory used to fall through to the mock provider whenever no API key was
 * present — in every environment. So a missing, rotated or mistyped env var on a
 * deploy meant customers uploading real insurance policies got fabricated
 * analysis back: an invented insurer, a €500 premium, invented coverages, all
 * stamped with 88–96% confidence.
 *
 * For an insurance product that is the single most harmful output the system can
 * produce. Telling someone their cover includes something it does not is far
 * worse than telling them the analysis failed — one is a wrong answer they will
 * act on, the other is an honest one they can retry.
 *
 * It also failed silently: a single `warn`, while the admin dashboard showed
 * analyses completing normally.
 *
 * Refusing here matches what the codebase already does elsewhere with a missing
 * dependency — `lib/storage.ts` refuses its local-public fallback in production,
 * `lib/email/email-service.ts` returns an error rather than pretending to send.
 */

const PROVIDER_KEYS = ["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_SERVICE_TYPE"]

/**
 * `lib/env.ts` refuses to boot production without these, which is itself correct
 * — an unmetered rate limiter or a missing auth secret should stop a deploy. It
 * just means "production" has to be simulated completely, or the module graph
 * throws for the wrong reason and the test proves nothing.
 */
function stubBaseEnv() {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-value")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    vi.stubEnv("RATELIMIT_ALLOW_LOCAL", "1")
}

function stubProductionBoot() {
    stubBaseEnv()
    vi.stubEnv("NODE_ENV", "production")
}

describe("the AI factory refuses to fabricate analysis in production", () => {
    const saved: Record<string, string | undefined> = {}

    beforeEach(() => {
        for (const key of [...PROVIDER_KEYS, "NODE_ENV"]) saved[key] = process.env[key]
        for (const key of PROVIDER_KEYS) delete process.env[key]
        vi.resetModules()
    })

    afterEach(() => {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key]
            else vi.stubEnv(key, value)
        }
        vi.unstubAllEnvs()
    })

    it("throws in production when no provider is configured", async () => {
        stubProductionBoot()
        const { AIServiceFactory } = await import("@/lib/services/ai/ai-service.factory")
        AIServiceFactory.reset()

        expect(() => AIServiceFactory.getService()).toThrowError(/No AI provider configured/)
    })

    it("still falls back to mock outside production", async () => {
        stubBaseEnv()
        vi.stubEnv("NODE_ENV", "development")
        const { AIServiceFactory } = await import("@/lib/services/ai/ai-service.factory")
        AIServiceFactory.reset()

        // Local development and tests must keep working without an API key —
        // the point is to refuse the SILENT fallback, not to make the product
        // unrunnable on a laptop.
        expect(() => AIServiceFactory.getService()).not.toThrow()
    })

    it("honours a deliberate AI_SERVICE_TYPE=mock even in production", async () => {
        // Someone choosing mock is different from nobody noticing. A staging
        // environment running with NODE_ENV=production must still be able to
        // opt in explicitly.
        stubProductionBoot()
        vi.stubEnv("AI_SERVICE_TYPE", "mock")
        const { AIServiceFactory } = await import("@/lib/services/ai/ai-service.factory")
        AIServiceFactory.reset()

        expect(() => AIServiceFactory.getService()).not.toThrow()
    })

    it("uses a real provider when one is configured", async () => {
        stubProductionBoot()
        vi.stubEnv("GEMINI_API_KEY", "test-key")
        const { AIServiceFactory } = await import("@/lib/services/ai/ai-service.factory")
        AIServiceFactory.reset()

        expect(() => AIServiceFactory.getService()).not.toThrow()
    })
})

describe("the refusal becomes a failed analysis, not a stuck one", () => {
    it("the extraction path catches and marks the run failed", () => {
        // A throw that escaped would leave the policy in `analyzing` for ever,
        // waiting on the stale-run reaper. It does not: the call sits inside a
        // try whose catch records `extraction_failed`.
        const src = readFileSync(
            "lib/services/analysis/policy-analysis-orchestrator.service.ts",
            "utf-8"
        )
        const callAt = src.indexOf("const service = getAIService()")
        expect(callAt).toBeGreaterThan(-1)

        const tail = src.slice(callAt)
        const catchAt = tail.indexOf("} catch (error) {")
        const failedAt = tail.indexOf('return { status: "failed", reason: "extraction_failed" }')
        expect(catchAt).toBeGreaterThan(-1)
        expect(failedAt).toBeGreaterThan(catchAt)
    })
})
