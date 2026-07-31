/**
 * WP-01 — the mock AI provider must never be reachable by accident.
 *
 * The mock returns "Mock Insurance Co." and «Εικονική εξήγηση» for ANY
 * document, rendered identically to a real analysis. It used to be the silent
 * fallback whenever no provider key was set, so a misconfigured deploy showed
 * users confident, invented facts about their own insurance.
 *
 * These tests pin the selection matrix at source level: absence of config is
 * never consent, and an explicit opt-in is always required.
 */
import { readFileSync } from "node:fs"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

// The provider services import lib/env, which parses the real process.env at
// module load. These tests deliberately strip provider keys, so the parse must
// not be what fails — the factory's own decision is what's under test.
vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-test",
        GEMINI_MODEL_EXTRACTION: "gemini-test",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-test",
        GEMINI_MODEL_QA: "gemini-test",
        GEMINI_MODEL_FALLBACK: "gemini-test",
        GEMINI_MODEL_TRANSLATION: "gemini-test",
        OPENAI_MODEL_EXTRACTION: "gpt-test",
        OPENAI_MODEL_GAP_ANALYSIS: "gpt-test",
        OPENAI_MODEL_CLARITY_ANALYSIS: "gpt-test",
        OPENAI_MODEL_QA: "gpt-test",
        CLAUDE_MODEL_EXTRACTION: "claude-test",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-test",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-test",
        CLAUDE_MODEL_QA: "claude-test",
        FF_AI_FAILOVER_OPENAI: "false",
        FF_AI_DEGRADED_COMPLETION: "true",
    },
}))

const PROVIDER_KEYS = [
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "AI_SERVICE_TYPE",
    "AI_ALLOW_MOCK",
] as const

let saved: Record<string, string | undefined> = {}

async function freshFactory() {
    vi.resetModules()
    const mod = await import("@/lib/services/ai/ai-service.factory")
    mod.AIServiceFactory.reset()
    return mod
}

beforeEach(() => {
    saved = {}
    for (const key of PROVIDER_KEYS) {
        saved[key] = process.env[key]
        delete process.env[key]
    }
    saved.NODE_ENV = process.env.NODE_ENV
})

afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
    vi.restoreAllMocks()
})

describe("AI provider selection matrix", () => {
    it("throws instead of silently using mock when nothing is configured", async () => {
        // NODE_ENV=test is itself an allowance, so this case must simulate a
        // non-test runtime to prove the production/dev behaviour.
        vi.stubEnv("NODE_ENV", "production")
        const { AIServiceFactory } = await freshFactory()

        expect(() => AIServiceFactory.getService()).toThrow(/No AI provider configured/)
    })

    it("names every accepted opt-in in the failure message", async () => {
        vi.stubEnv("NODE_ENV", "production")
        const { AIServiceFactory } = await freshFactory()

        expect(() => AIServiceFactory.getService()).toThrow(/AI_ALLOW_MOCK=1/)
    })

    it.each([
        ["GEMINI_API_KEY", "gemini"],
        ["ANTHROPIC_API_KEY", "anthropic"],
        ["OPENAI_API_KEY", "openai"],
    ])("selects the real provider when %s is present", async (envKey, expected) => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv(envKey, "test-key")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe(expected)
    })

    it("prefers a real provider key over the mock allowance", async () => {
        vi.stubEnv("AI_ALLOW_MOCK", "1")
        vi.stubEnv("GEMINI_API_KEY", "test-key")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe("gemini")
    })

    it("honours AI_ALLOW_MOCK=1 as an explicit opt-in", async () => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("AI_ALLOW_MOCK", "1")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe("mock")
    })

    it("honours an explicit AI_SERVICE_TYPE=mock request", async () => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("AI_SERVICE_TYPE", "mock")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe("mock")
    })

    it("lets an explicit AI_SERVICE_TYPE override a present provider key", async () => {
        vi.stubEnv("GEMINI_API_KEY", "test-key")
        vi.stubEnv("AI_SERVICE_TYPE", "openai")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe("openai")
    })

    it("allows mock under NODE_ENV=test so the suite keeps running", async () => {
        vi.stubEnv("NODE_ENV", "test")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.resolveServiceType()).toBe("mock")
    })

    it("getActiveAIProvider reports null rather than throwing when unconfigured", async () => {
        vi.stubEnv("NODE_ENV", "production")
        const { getActiveAIProvider } = await freshFactory()

        expect(getActiveAIProvider()).toBeNull()
    })
})

describe("production boot guard", () => {
    it("does not demand a runtime AI key during next build", async () => {
        // CI builds with RATELIMIT_ALLOW_LOCAL and NO provider key — a build
        // artifact never calls a provider, but page-data collection imports
        // these modules with NODE_ENV=production. Requiring a key here failed
        // every CI build; the real guarantee is the factory throwing at request
        // time. Regression introduced and caught by running the build itself.
        const source = readFileSync("lib/env.ts", "utf-8")
        expect(source).toContain("phase-production-build")
    })

    it("still demands a key (or explicit mock) outside the build phase", () => {
        const source = readFileSync("lib/env.ts", "utf-8")
        expect(source).toContain("AI_ALLOW_MOCK")
        expect(source).toMatch(/GEMINI_API_KEY \| ANTHROPIC_API_KEY \| OPENAI_API_KEY/)
    })
})

describe("isMockAllowed", () => {
    it("treats the absence of configuration as refusal, not consent", async () => {
        vi.stubEnv("NODE_ENV", "production")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.isMockAllowed()).toBe(false)
    })

    it("does not accept a truthy-but-wrong AI_ALLOW_MOCK value", async () => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("AI_ALLOW_MOCK", "true")
        const { AIServiceFactory } = await freshFactory()

        expect(AIServiceFactory.isMockAllowed()).toBe(false)
    })
})
