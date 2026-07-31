/**
 * Admin runtime routing config — loader + precedence contract.
 *
 * Pins: DB override > env default with the exact precedence chain; auto /
 * inactive / invalid rows are ignored; a provider-mismatched model override
 * falls back to the tier table (failover safety); the loader NEVER throws (DB
 * error → {} → pure env behavior); and resolveRoute with no overrides is
 * identical to today.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_EXTRACTION: "gemini-3-flash-preview",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-3-flash-preview",
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-3.1-flash-lite",
        GEMINI_MODEL_QA: "gemini-3.1-flash-lite",
        GEMINI_MODEL_FALLBACK: "gemini-3.5-flash",
        GEMINI_MODEL_TRANSLATION: "gemini-3.1-flash-lite",
        OPENAI_MODEL_EXTRACTION: "gpt-4.1-mini",
        OPENAI_MODEL_GAP_ANALYSIS: "gpt-4.1-mini",
        OPENAI_MODEL_CLARITY_ANALYSIS: "gpt-4.1-mini",
        OPENAI_MODEL_QA: "gpt-4.1-mini",
        OPENAI_MODEL_FALLBACK: "gpt-4.1-mini",
        CLAUDE_MODEL_EXTRACTION: "claude-sonnet-5",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_QA: "claude-haiku-4-5",
        CLAUDE_MODEL_FALLBACK: "claude-haiku-4-5",
        GEMINI_API_KEY: "test-key",
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
// unstable_cache needs a Next server context; pass through in unit tests.
vi.mock("next/cache", () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}))

const findMany = vi.hoisted(() => vi.fn())
vi.mock("@/lib/db", () => ({ db: { aiRuntimeConfig: { findMany } } }))

import { loadAiRuntimeOverridesUncached } from "@/lib/services/ai/runtime-config"
import { resolveRoute, selectPrimaryProvider, getModelForStep } from "@/lib/services/ai/model-router"

beforeEach(() => {
    findMany.mockReset()
    delete process.env.AI_SERVICE_TYPE
})

describe("loadAiRuntimeOverridesUncached — never throws, skips invalid rows", () => {
    it("returns {} on a DB error (pure env behavior)", async () => {
        findMany.mockRejectedValue(new Error("db down"))
        await expect(loadAiRuntimeOverridesUncached()).resolves.toEqual({})
    })

    it("skips inactive, auto, unknown-provider, and model-less rows", async () => {
        findMany.mockResolvedValue([
            { configKey: "askQuestion", provider: "anthropic", model: "claude-haiku-4-5", isActive: false },
            { configKey: "analyzeGaps", provider: "auto", model: null, isActive: true },
            { configKey: "translate", provider: "wat", model: "x", isActive: true },
            { configKey: "extractPolicyData", provider: "openai", model: "  ", isActive: true },
            { configKey: "unknownKey", provider: "gemini", model: "gemini-3.5-flash", isActive: true },
        ])
        await expect(loadAiRuntimeOverridesUncached()).resolves.toEqual({})
    })

    it("loads valid operation rows and the primaryProvider sentinel", async () => {
        findMany.mockResolvedValue([
            { configKey: "askQuestion", provider: "anthropic", model: "claude-haiku-4-5", isActive: true },
            { configKey: "primaryProvider", provider: "anthropic", model: null, isActive: true },
        ])
        await expect(loadAiRuntimeOverridesUncached()).resolves.toEqual({
            primaryProvider: "anthropic",
            operations: { askQuestion: { provider: "anthropic", model: "claude-haiku-4-5" } },
        })
    })
})

describe("router precedence with overrides", () => {
    const pinned = {
        operations: { askQuestion: { provider: "anthropic" as const, model: "claude-haiku-4-5" } },
    }

    it("no overrides -> identical to today's env behavior", () => {
        const today = resolveRoute({ operation: "askQuestion" })
        const withEmpty = resolveRoute({ operation: "askQuestion" }, {})
        expect(withEmpty).toEqual(today)
        expect(today.provider).toBe("gemini")
        expect(today.model).toBe("gemini-3.1-flash-lite")
    })

    it("a per-operation override pins provider AND model", () => {
        const r = resolveRoute({ operation: "askQuestion" }, pinned)
        expect(r.provider).toBe("anthropic")
        expect(r.model).toBe("claude-haiku-4-5")
    })

    it("an explicit req.provider (failover ladder) beats the override, and the override model does NOT cross vendors", () => {
        const r = resolveRoute({ operation: "askQuestion", provider: "openai" }, pinned)
        expect(r.provider).toBe("openai")
        // Provider-mismatch: the pinned anthropic model must not be sent to openai.
        expect(r.model).toBe("gpt-4.1-mini")
    })

    it("primaryProvider override beats env but yields to per-operation and req pins", () => {
        expect(selectPrimaryProvider({ primaryProvider: "anthropic" })).toBe("anthropic")
        expect(selectPrimaryProvider({})).toBe("gemini")
        const r = resolveRoute({ operation: "analyzeGaps" }, { primaryProvider: "anthropic" })
        expect(r.provider).toBe("anthropic")
        expect(r.model).toBe("claude-sonnet-5") // its own env tier model, no op override
    })

    it("getModelForStep honors a matching-provider override and ignores a mismatched one", () => {
        const overrides = {
            operations: { analyzeGaps: { provider: "gemini" as const, model: "gemini-3.5-flash" } },
        }
        expect(getModelForStep("gemini", "gap_detection", "free", overrides)).toBe("gemini-3.5-flash")
        expect(getModelForStep("anthropic", "gap_detection", "free", overrides)).toBe("claude-sonnet-5")
        expect(getModelForStep("gemini", "gap_detection")).toBe("gemini-3-flash-preview")
    })
})
