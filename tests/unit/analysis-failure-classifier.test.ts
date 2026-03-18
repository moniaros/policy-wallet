import { describe, expect, it } from "vitest"
import { classifyAnalysisFailure } from "@/lib/services/analysis/failure-classifier"

describe("analysis failure classifier", () => {
  it("classifies token blocking errors", () => {
    const result = classifyAnalysisFailure(
      new Error("Token budget check failed: monthly_limit_reached")
    )

    expect(result.failureClass).toBe("token")
    expect(result.retryable).toBe(false)
    expect(result.shouldFailoverProvider).toBe(false)
    expect(result.code).toBe("TOKEN_LIMIT_BLOCKED")
  })

  it("classifies schema mismatch errors", () => {
    const result = classifyAnalysisFailure(
      new Error("Invalid prompt: The messages do not match the ModelMessage[] schema.")
    )

    expect(result.failureClass).toBe("schema")
    expect(result.retryable).toBe(true)
    expect(result.shouldFailoverProvider).toBe(true)
    expect(result.code).toBe("SCHEMA_MISMATCH")
  })

  it("classifies auth errors from structured status fields", () => {
    const result = classifyAnalysisFailure({
      message: "Provider rejected request",
      statusCode: 401,
      code: "invalid_api_key",
    })

    expect(result.failureClass).toBe("auth")
    expect(result.retryable).toBe(false)
    expect(result.shouldFailoverProvider).toBe(false)
    expect(result.code).toBe("AUTH_ERROR")
  })

  it("classifies explicit document errors but not generic metadata text", () => {
    const docResult = classifyAnalysisFailure(new Error("Failed to read document from storage"))
    expect(docResult.failureClass).toBe("document")

    const genericResult = classifyAnalysisFailure(
      new Error("Policy metadata includes a document reference for onboarding")
    )
    expect(genericResult.failureClass).toBe("unknown")
  })

  it("classifies transient provider errors", () => {
    const result = classifyAnalysisFailure({
      message: "Upstream temporarily overloaded",
      status: 503,
      code: "rate_limit",
    })

    expect(result.failureClass).toBe("transient")
    expect(result.retryable).toBe(true)
    expect(result.shouldFailoverProvider).toBe(true)
    expect(result.code).toBe("TRANSIENT_FAILURE")
  })

  it("classifies capability model mismatch as provider-failover eligible", () => {
    const result = classifyAnalysisFailure({
      message: "Capability check failed: model not supported by provider",
      code: "AI_CAPABILITY_UNSUPPORTED_MODEL",
    })

    expect(result.failureClass).toBe("schema")
    expect(result.retryable).toBe(false)
    expect(result.shouldFailoverProvider).toBe(true)
    expect(result.userMessageKey).toBe("analysis.errors.unavailable")
    expect(result.code).toBe("AI_CAPABILITY_UNSUPPORTED_MODEL")
  })

  it("classifies capability mime mismatch as document error", () => {
    const result = classifyAnalysisFailure({
      message: "Capability check failed: unsupported mime type",
      code: "AI_CAPABILITY_UNSUPPORTED_MIME",
    })

    expect(result.failureClass).toBe("document")
    expect(result.retryable).toBe(false)
    expect(result.shouldFailoverProvider).toBe(false)
    expect(result.userMessageKey).toBe("analysis.errors.document")
    expect(result.code).toBe("DOCUMENT_ERROR")
  })
})
