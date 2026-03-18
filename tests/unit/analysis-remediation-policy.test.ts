import { afterEach, describe, expect, it } from "vitest"
import {
  isCriticalStep,
  isDegradableStep,
  isDegradedCompletionEnabled,
  isFullFailoverAllowed,
  isOpenAIFailoverEnabled,
  isRemediationAlertingEnabled,
} from "@/lib/services/analysis/remediation-policy"

const ORIGINAL_ENV = { ...process.env }

describe("analysis remediation policy", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it("resolves critical and degradable steps correctly", () => {
    expect(isCriticalStep("document_load_and_validation")).toBe(true)
    expect(isCriticalStep("gap_detection")).toBe(false)
    expect(isDegradableStep("gap_detection")).toBe(true)
    expect(isDegradableStep("persistence_and_finalize")).toBe(false)
  })

  it("enables failover and degraded completion when flags and canary allow", () => {
    process.env.FF_AI_FAILOVER_OPENAI = "true"
    process.env.FF_AI_DEGRADED_COMPLETION = "true"
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "100"
    process.env.AI_ALLOW_FULL_FAILOVER = "true"

    expect(isOpenAIFailoverEnabled("user-1", "policyholder")).toBe(true)
    expect(isDegradedCompletionEnabled("user-1", "policyholder")).toBe(true)
    expect(isFullFailoverAllowed("user-1", "policyholder")).toBe(true)
  })

  it("gates alerting and internal canary correctly", () => {
    process.env.FF_AI_REMEDIATION_ALERTS = "true"
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "internal"

    expect(isRemediationAlertingEnabled("user-a", "admin")).toBe(true)
    expect(isRemediationAlertingEnabled("user-b", "policyholder")).toBe(false)
  })
})
