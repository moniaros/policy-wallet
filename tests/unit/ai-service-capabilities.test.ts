import { describe, expect, it } from "vitest"

describe("ai provider capability checks", () => {
  it("flags unsupported model/provider combinations", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret"
    const { GeminiAIService } = await import("@/lib/services/ai/gemini-ai.service")
    const gemini = new GeminiAIService()
    const result = gemini.checkCapabilities({
      operation: "extractPolicyData",
      model: "gpt-4.1-mini",
      hasDocument: true,
      mimeType: "application/pdf",
    })

    expect(result.supported).toBe(false)
    expect(result.code).toBe("AI_CAPABILITY_UNSUPPORTED_MODEL")
    expect(result.userMessageKey).toBe("analysis.errors.unavailable")
  })

  it("flags unsupported document mime types", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret"
    const { OpenAIAIService } = await import("@/lib/services/ai/openai-ai.service")
    const openai = new OpenAIAIService()
    const result = openai.checkCapabilities({
      operation: "analyzePolicyClarity",
      model: "gpt-4.1-mini",
      hasDocument: true,
      mimeType: "application/msword",
    })

    expect(result.supported).toBe(false)
    expect(result.code).toBe("AI_CAPABILITY_UNSUPPORTED_MIME")
    expect(result.userMessageKey).toBe("analysis.errors.document")
  })

  it("accepts supported model + mime combinations", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret"
    const { OpenAIAIService } = await import("@/lib/services/ai/openai-ai.service")
    const openai = new OpenAIAIService()
    const result = openai.checkCapabilities({
      operation: "analyzeGaps",
      model: "gpt-4.1-mini",
      hasDocument: true,
      mimeType: "application/pdf",
    })

    expect(result.supported).toBe(true)
    expect(result.code).toBe("OK")
  })

  it("mock provider always returns supported", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret"
    const { MockAIService } = await import("@/lib/services/ai/mock-ai.service")
    const mock = new MockAIService()
    const result = mock.checkCapabilities({
      operation: "askQuestion",
      model: "anything",
      hasDocument: true,
      mimeType: "application/zip",
    })

    expect(result.supported).toBe(true)
    expect(result.code).toBe("OK")
  })
})
