import { describe, it, expect } from "vitest"
import { detectGaps } from "@/lib/services/ingestion/gap-detection"
import type {
  CoverageEnvelope,
  EnvelopeExpectation,
  NormalizedCoverage,
} from "@/lib/services/ingestion/contracts"

function cov(taxonomyKey: string, o: Partial<NormalizedCoverage> = {}): NormalizedCoverage {
  return { taxonomyKey, exclusions: [], confidence: 0.8, source: "regex", ...o }
}

function envelope(expectations: EnvelopeExpectation[]): CoverageEnvelope {
  return { lineOfBusiness: "motor", version: 1, expectations }
}

describe("detectGaps", () => {
  it("flags an entirely missing coverage at the expectation severity", () => {
    const gaps = detectGaps([], envelope([
      { taxonomyKey: "motor.fire", severityIfMissing: "critical" },
    ]))
    expect(gaps).toEqual([
      { taxonomyKey: "motor.fire", severity: "critical", kind: "missing", reason: "missing:motor.fire" },
    ])
  })

  it("emits no gap when the coverage meets the benchmark", () => {
    const gaps = detectGaps(
      [cov("motor.fire", { limit: 100_000 })],
      envelope([{ taxonomyKey: "motor.fire", minLimit: 50_000, severityIfMissing: "critical" }]),
    )
    expect(gaps).toEqual([])
  })

  it("flags under_limit, one severity step below missing, with actual/expected", () => {
    const gaps = detectGaps(
      [cov("motor.fire", { limit: 30_000 })],
      envelope([{ taxonomyKey: "motor.fire", minLimit: 50_000, severityIfMissing: "critical" }]),
    )
    expect(gaps).toEqual([
      {
        taxonomyKey: "motor.fire",
        severity: "recommended", // downgraded from critical
        kind: "under_limit",
        reason: "under_limit:motor.fire",
        actual: 30_000,
        expected: 50_000,
      },
    ])
  })

  it("flags high_deductible", () => {
    const gaps = detectGaps(
      [cov("health.hospitalization", { deductible: 1_000 })],
      envelope([{ taxonomyKey: "health.hospitalization", maxDeductible: 500, severityIfMissing: "recommended" }]),
    )
    expect(gaps[0]).toMatchObject({ kind: "high_deductible", severity: "info", actual: 1_000, expected: 500 })
  })

  it("flags a forbidden exclusion (Greek accent/case-insensitive)", () => {
    const gaps = detectGaps(
      [cov("home.fire", { exclusions: ["Εξαιρείται ο σεισμός από την κάλυψη"] })],
      envelope([{ taxonomyKey: "home.fire", forbiddenExclusions: ["σεισμός"], severityIfMissing: "critical" }]),
    )
    expect(gaps[0]).toMatchObject({ kind: "excluded", severity: "critical", reason: "excluded:home.fire" })
  })

  it("emits multiple gaps for a coverage deficient in several ways", () => {
    const gaps = detectGaps(
      [cov("motor.fire", { limit: 30_000, deductible: 1_000, exclusions: ["σεισμός"] })],
      envelope([
        {
          taxonomyKey: "motor.fire",
          minLimit: 50_000,
          maxDeductible: 500,
          forbiddenExclusions: ["σεισμός"],
          severityIfMissing: "critical",
        },
      ]),
    )
    expect(gaps.map((g) => g.kind).sort()).toEqual(["excluded", "high_deductible", "under_limit"])
  })

  it("does NOT flag under_limit when the actual limit is unknown", () => {
    const gaps = detectGaps(
      [cov("motor.fire")], // present, no limit parsed
      envelope([{ taxonomyKey: "motor.fire", minLimit: 50_000, severityIfMissing: "critical" }]),
    )
    expect(gaps).toEqual([])
  })

  it("orders gaps by severity (critical first)", () => {
    const gaps = detectGaps([], envelope([
      { taxonomyKey: "motor.theft", severityIfMissing: "info" },
      { taxonomyKey: "motor.fire", severityIfMissing: "critical" },
      { taxonomyKey: "motor.broken_glass", severityIfMissing: "recommended" },
    ]))
    expect(gaps.map((g) => g.severity)).toEqual(["critical", "recommended", "info"])
  })

  it("is pure: deterministic and does not mutate its inputs", () => {
    const actual = [cov("motor.fire", { limit: 30_000 })]
    const env = envelope([{ taxonomyKey: "motor.fire", minLimit: 50_000, severityIfMissing: "critical" }])
    const snapshot = JSON.stringify({ actual, env })
    const a = detectGaps(actual, env)
    const b = detectGaps(actual, env)
    expect(a).toEqual(b)
    expect(JSON.stringify({ actual, env })).toBe(snapshot) // inputs untouched
  })
})
