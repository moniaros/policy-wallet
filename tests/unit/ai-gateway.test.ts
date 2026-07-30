/**
 * AI gateway dispatch contract.
 *
 * The gateway must resolve a route and pass the route's model + output cap down
 * to the provider as modelOverride / maxOutputTokens, and select the provider
 * from the route decision. Mock the factory so no real provider is built.
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
        CLAUDE_MODEL_EXTRACTION: "claude-sonnet-5",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_QA: "claude-haiku-4-5",
        GEMINI_API_KEY: "test-key",
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

const askQuestion = vi.fn(async () => "answer")
const analyzeRiskProfile = vi.fn(async () => ({ riskLevel: "low" }))
const getAIService = vi.fn(() => ({ askQuestion, analyzeRiskProfile }))

vi.mock("@/lib/services/ai/ai-service.factory", () => ({
    getAIService: (p?: string) => getAIService(p),
}))

import { aiGateway } from "@/lib/services/ai/gateway"

const metadata = {
    insurerName: "ERGO",
    policyNumber: "P1",
    lineOfBusiness: "motor",
    startDate: new Date(),
    endDate: new Date(),
    premiumAmount: 300,
    coverageSummary: "x",
}

beforeEach(() => {
    askQuestion.mockClear()
    analyzeRiskProfile.mockClear()
    getAIService.mockClear()
    delete process.env.AI_SERVICE_TYPE
})

describe("aiGateway.askQuestion", () => {
    it("dispatches to the resolved provider with the route model + output cap", async () => {
        await aiGateway.askQuestion(metadata, "Am I covered?", { userId: "u1", policyId: "p1", userTier: "pro" })

        expect(getAIService).toHaveBeenCalledWith("gemini")
        const [doc, meta, question, opts] = askQuestion.mock.calls[0]
        expect(doc).toBeNull()
        expect(meta).toBe(metadata)
        expect(question).toBe("Am I covered?")
        expect(opts).toMatchObject({
            userId: "u1",
            policyId: "p1",
            modelOverride: "gemini-3.1-flash-lite",
            maxOutputTokens: 1500,
            provider: "gemini",
        })
    })

    it("passes the structured context through", async () => {
        const structuredContext = { acordData: { motor: {} } } as never
        await aiGateway.askQuestion(metadata, "q", { userId: "u1", structuredContext })
        expect(askQuestion.mock.calls[0][3]).toMatchObject({ structuredContext })
    })
})

describe("aiGateway.analyzeRiskProfile", () => {
    it("routes with the output cap and meters against the user", async () => {
        await aiGateway.analyzeRiskProfile({ dependentsCount: 0 } as never, [], { userId: "u9" })
        const opts = analyzeRiskProfile.mock.calls[0][2]
        expect(opts).toMatchObject({
            userId: "u9",
            modelOverride: "gemini-3.1-flash-lite",
            maxOutputTokens: 4000,
            provider: "gemini",
        })
    })
})
