/**
 * Per-call route resolver contract.
 *
 * Pins the deterministic tier decision table and the (operation, provider, tier)
 * -> model mapping, plus the behavior-neutrality guarantee: the two paths wired
 * to resolveRoute today (askQuestion, analyzeRiskProfile) resolve to the same
 * env model at every tier, so shipping the router changes no production model.
 */

import { describe, it, expect, vi } from "vitest"

// Keep env validation out of the unit by stubbing it with the real defaults.
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
        CLAUDE_MODEL_EXTRACTION: "claude-sonnet-5",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_QA: "claude-haiku-4-5",
        CLAUDE_MODEL_FALLBACK: "claude-haiku-4-5",
        OPENAI_MODEL_FALLBACK: "gpt-4.1-mini",
        GEMINI_API_KEY: "test-key",
    },
}))

import {
    classifyTier,
    resolveRoute,
    selectPrimaryProvider,
    fallbackModelFor,
    MAX_OUTPUT_TOKENS,
} from "@/lib/services/ai/model-router"

describe("classifyTier — deterministic decision table", () => {
    it("askQuestion is always cheap regardless of tier", () => {
        expect(classifyTier({ operation: "askQuestion", userTier: "pro" })).toBe("cheap")
        expect(classifyTier({ operation: "askQuestion", userTier: "free" })).toBe("cheap")
    })

    it("analyzeGaps is always standard (recall-critical)", () => {
        expect(classifyTier({ operation: "analyzeGaps", userTier: "free" })).toBe("standard")
    })

    it("clarity escalates to standard for premium users", () => {
        expect(classifyTier({ operation: "analyzePolicyClarity", userTier: "free" })).toBe("cheap")
        expect(classifyTier({ operation: "analyzePolicyClarity", userTier: "pro" })).toBe("standard")
    })

    it("extraction is never below standard, premium for large docs on a paid plan", () => {
        expect(classifyTier({ operation: "extractPolicyData", userTier: "free", hasDocument: true, inputBytes: 5_000_000 })).toBe("standard")
        expect(classifyTier({ operation: "extractPolicyData", userTier: "pro", hasDocument: true, inputBytes: 5_000_000 })).toBe("premium")
        expect(classifyTier({ operation: "extractPolicyData", userTier: "pro", hasDocument: true, inputBytes: 100 })).toBe("standard")
    })

    it("risk profile escalates to standard for large portfolios", () => {
        expect(classifyTier({ operation: "analyzeRiskProfile", portfolioSize: 2 })).toBe("cheap")
        expect(classifyTier({ operation: "analyzeRiskProfile", portfolioSize: 9 })).toBe("standard")
    })
})

describe("resolveRoute — model selection", () => {
    it("routes Q&A to the QA model with the output cap", () => {
        const r = resolveRoute({ operation: "askQuestion", provider: "gemini", userTier: "pro" })
        expect(r.model).toBe("gemini-3.1-flash-lite")
        expect(r.tier).toBe("cheap")
        expect(r.maxOutputTokens).toBe(MAX_OUTPUT_TOKENS.askQuestion)
    })

    it("BEHAVIOR-NEUTRAL: askQuestion resolves to the same model at every tier", () => {
        const models = (["free", "plus", "pro", "agent_pro"] as const).map(
            (t) => resolveRoute({ operation: "askQuestion", provider: "gemini", userTier: t }).model
        )
        expect(new Set(models).size).toBe(1)
        expect(models[0]).toBe("gemini-3.1-flash-lite")
    })

    it("BEHAVIOR-NEUTRAL: analyzeRiskProfile resolves to the same model at any portfolio size", () => {
        const small = resolveRoute({ operation: "analyzeRiskProfile", provider: "gemini", portfolioSize: 1 }).model
        const large = resolveRoute({ operation: "analyzeRiskProfile", provider: "gemini", portfolioSize: 50 }).model
        expect(small).toBe(large)
        expect(small).toBe("gemini-3.1-flash-lite")
    })

    it("carries a per-provider fallback model for each real provider", () => {
        expect(resolveRoute({ operation: "askQuestion", provider: "gemini" }).fallbackModel).toBe("gemini-3.5-flash")
        expect(resolveRoute({ operation: "askQuestion", provider: "anthropic" }).fallbackModel).toBe("claude-haiku-4-5")
        expect(resolveRoute({ operation: "askQuestion", provider: "openai" }).fallbackModel).toBe("gpt-4.1-mini")
    })

    it("orders providers with the chosen primary first, deduped", () => {
        const r = resolveRoute({ operation: "askQuestion", provider: "anthropic" })
        expect(r.providerOrder[0]).toBe("anthropic")
        expect(new Set(r.providerOrder).size).toBe(r.providerOrder.length)
    })

    it("premium extraction on gemini routes to the fallback-class model", () => {
        const r = resolveRoute({ operation: "extractPolicyData", provider: "gemini", userTier: "pro", hasDocument: true, inputBytes: 5_000_000 })
        expect(r.tier).toBe("premium")
        expect(r.model).toBe("gemini-3.5-flash")
    })
})

describe("selectPrimaryProvider", () => {
    it("defaults to gemini when a key is present and AI_SERVICE_TYPE is unset", () => {
        const prev = process.env.AI_SERVICE_TYPE
        delete process.env.AI_SERVICE_TYPE
        expect(selectPrimaryProvider()).toBe("gemini")
        if (prev !== undefined) process.env.AI_SERVICE_TYPE = prev
    })

    it("honors AI_SERVICE_TYPE=anthropic", () => {
        const prev = process.env.AI_SERVICE_TYPE
        process.env.AI_SERVICE_TYPE = "anthropic"
        expect(selectPrimaryProvider()).toBe("anthropic")
        if (prev === undefined) delete process.env.AI_SERVICE_TYPE
        else process.env.AI_SERVICE_TYPE = prev
    })
})

describe("fallbackModelFor", () => {
    it("returns a per-provider fallback for gemini, anthropic, and openai", () => {
        expect(fallbackModelFor("gemini")).toBe("gemini-3.5-flash")
        expect(fallbackModelFor("anthropic")).toBe("claude-haiku-4-5")
        expect(fallbackModelFor("openai")).toBe("gpt-4.1-mini")
        expect(fallbackModelFor("mock")).toBeUndefined()
    })
})
