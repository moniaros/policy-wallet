/**
 * Analysis remediation policy — step classification and the flag gates.
 *
 * These predicates used to read process.env directly. They now read the feature
 * flag layer, so the contract this file pins is that WITH NO DATABASE ROW the
 * answers are byte-for-byte what they were as env reads: the flags table is an
 * override layer, not a replacement. The DB-override cases live in
 * tests/unit/feature-flags.test.ts.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  isCriticalStep,
  isDegradableStep,
  isDegradedCompletionEnabled,
  isFullFailoverAllowed,
  isOpenAIFailoverEnabled,
  isRemediationAlertingEnabled,
} from "@/lib/services/analysis/remediation-policy"

// unstable_cache needs a Next server context; pass through in unit tests so
// each call re-reads the environment rather than serving a memoised answer.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))
// No rows: the "nobody has touched the console" path, which must reproduce the
// original environment-variable behaviour exactly.
vi.mock("@/lib/db", () => ({
  db: { featureFlag: { findMany: async () => [] } },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

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

  it("enables failover and degraded completion when flags and canary allow", async () => {
    process.env.FF_AI_FAILOVER_OPENAI = "true"
    process.env.FF_AI_DEGRADED_COMPLETION = "true"
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "100"
    process.env.AI_ALLOW_FULL_FAILOVER = "true"

    expect(await isOpenAIFailoverEnabled("user-1", "policyholder")).toBe(true)
    expect(await isDegradedCompletionEnabled("user-1", "policyholder")).toBe(true)
    expect(await isFullFailoverAllowed("user-1", "policyholder")).toBe(true)
  })

  it("gates alerting and internal canary correctly", async () => {
    process.env.FF_AI_REMEDIATION_ALERTS = "true"
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "internal"

    expect(await isRemediationAlertingEnabled("user-a", "admin")).toBe(true)
    expect(await isRemediationAlertingEnabled("user-b", "policyholder")).toBe(false)
  })

  it("the shared canary audience gates every remediation behaviour", async () => {
    // Each individual switch is on, but the audience is off. This is the single
    // lever for when the failover path itself is the problem.
    process.env.FF_AI_FAILOVER_OPENAI = "true"
    process.env.FF_AI_DEGRADED_COMPLETION = "true"
    process.env.FF_AI_REMEDIATION_ALERTS = "true"
    process.env.AI_ALLOW_FULL_FAILOVER = "true"
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "off"

    expect(await isOpenAIFailoverEnabled("user-1", "admin")).toBe(false)
    expect(await isDegradedCompletionEnabled("user-1", "admin")).toBe(false)
    expect(await isRemediationAlertingEnabled("user-1", "admin")).toBe(false)
    expect(await isFullFailoverAllowed("user-1", "admin")).toBe(false)
  })

  it("keeps each declared default when the environment says nothing", async () => {
    delete process.env.FF_AI_FAILOVER_OPENAI
    delete process.env.FF_AI_DEGRADED_COMPLETION
    delete process.env.FF_AI_REMEDIATION_ALERTS
    delete process.env.AI_ALLOW_FULL_FAILOVER
    process.env.FF_AI_REMEDIATION_CANARY_MODE = "100"

    // Registry defaults: failover off, degraded completion on, alerts off,
    // full failover allowed.
    expect(await isOpenAIFailoverEnabled("user-1", "policyholder")).toBe(false)
    expect(await isDegradedCompletionEnabled("user-1", "policyholder")).toBe(true)
    expect(await isRemediationAlertingEnabled("user-1", "policyholder")).toBe(false)
    expect(await isFullFailoverAllowed("user-1", "policyholder")).toBe(true)
  })
})
