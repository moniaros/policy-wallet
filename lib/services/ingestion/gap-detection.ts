/**
 * Phase 6 — Deterministic Gap Engine
 *
 * Implements the Phase-0 DetectGaps contract: diff a policy's actual coverages against
 * an expected CoverageEnvelope and emit Gap[]. PURE — no I/O, no model, no DB. This is
 * the hard guardrail: gap DETECTION is deterministic code; the LLM is never in this loop.
 *
 * `reason` is a stable gap-type KEY (`<kind>:<taxonomyKey>`), not prose — Phase 7
 * resolves it to a bilingual template, cached by gap-type.
 */

import { normalizeGreekForMatch } from "./text-extraction"
import type {
  CoverageEnvelope,
  DetectGaps,
  EngineGapSeverity,
  Gap,
  GapKind,
  NormalizedCoverage,
} from "./contracts"

const SEVERITY_RANK: Record<EngineGapSeverity, number> = {
  critical: 0,
  recommended: 1,
  info: 2,
}

/** A deficiency in a coverage that exists is one step less urgent than its absence. */
function downgrade(severity: EngineGapSeverity): EngineGapSeverity {
  return severity === "critical" ? "recommended" : "info"
}

function reasonKey(kind: GapKind, taxonomyKey: string): string {
  return `${kind}:${taxonomyKey}`
}

/** Index actual coverages by taxonomy key, keeping the richest row (one with a limit). */
function indexCoverages(actual: NormalizedCoverage[]): Map<string, NormalizedCoverage> {
  const byKey = new Map<string, NormalizedCoverage>()
  for (const cov of actual) {
    const existing = byKey.get(cov.taxonomyKey)
    if (!existing || (existing.limit == null && cov.limit != null)) {
      byKey.set(cov.taxonomyKey, cov)
    }
  }
  return byKey
}

function hasForbiddenExclusion(cov: NormalizedCoverage, forbidden: string[]): boolean {
  if (forbidden.length === 0 || cov.exclusions.length === 0) return false
  const present = cov.exclusions.map(normalizeGreekForMatch)
  // One-directional: does any actual exclusion text contain the forbidden keyword?
  // (Avoids the false positives a reverse `nf.includes(e)` match would introduce.)
  return forbidden.some((f) => {
    const nf = normalizeGreekForMatch(f)
    return nf.length > 0 && present.some((e) => e.includes(nf))
  })
}

/**
 * Detect coverage gaps deterministically. A single coverage may yield several gaps
 * (e.g. both under_limit and excluded). Output is sorted severity → taxonomyKey → kind
 * so the result is stable across runs.
 *
 * NB: EnvelopeExpectation.requiredSubLimits is intentionally not evaluated here — the
 * GapKind set has no sub-limit member; add one (contract change) before wiring it.
 */
export const detectGaps: DetectGaps = (actual, envelope: CoverageEnvelope): Gap[] => {
  const byKey = indexCoverages(actual)
  const gaps: Gap[] = []

  for (const exp of envelope.expectations) {
    const cov = byKey.get(exp.taxonomyKey)

    // Entirely absent.
    if (!cov) {
      gaps.push({
        taxonomyKey: exp.taxonomyKey,
        severity: exp.severityIfMissing,
        kind: "missing",
        reason: reasonKey("missing", exp.taxonomyKey),
      })
      continue
    }

    // Present but a key risk is carved out by a forbidden exclusion — as bad as missing.
    if (exp.forbiddenExclusions && hasForbiddenExclusion(cov, exp.forbiddenExclusions)) {
      gaps.push({
        taxonomyKey: exp.taxonomyKey,
        severity: exp.severityIfMissing,
        kind: "excluded",
        reason: reasonKey("excluded", exp.taxonomyKey),
      })
    }

    // Present but the limit is below the benchmark.
    if (exp.minLimit != null && cov.limit != null && cov.limit < exp.minLimit) {
      gaps.push({
        taxonomyKey: exp.taxonomyKey,
        severity: downgrade(exp.severityIfMissing),
        kind: "under_limit",
        reason: reasonKey("under_limit", exp.taxonomyKey),
        actual: cov.limit,
        expected: exp.minLimit,
      })
    }

    // Present but the deductible is above the benchmark.
    if (exp.maxDeductible != null && cov.deductible != null && cov.deductible > exp.maxDeductible) {
      gaps.push({
        taxonomyKey: exp.taxonomyKey,
        severity: downgrade(exp.severityIfMissing),
        kind: "high_deductible",
        reason: reasonKey("high_deductible", exp.taxonomyKey),
        actual: cov.deductible,
        expected: exp.maxDeductible,
      })
    }
  }

  return gaps.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.taxonomyKey.localeCompare(b.taxonomyKey) ||
      a.kind.localeCompare(b.kind),
  )
}
