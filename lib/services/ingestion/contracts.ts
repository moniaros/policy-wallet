/**
 * Document Ingestion → Extraction → Gap Engine — Shared Contracts (Phase 0)
 *
 * The single source of truth for the pipeline's typed boundary. These types are
 * persisted as JSON (DocumentExtraction.structured, CoverageEnvelope.expectations),
 * so each carries a Zod schema for runtime validation on read/write — never trust
 * a JSONB blob as a typed object without parsing it first.
 *
 * Strict TypeScript: no `any`. The DB columns store the exact string tokens below
 * (e.g. 'text-layer'), so there is no enum/identifier mapping layer at the boundary.
 *
 * Reconciliation notes:
 *  - ExtractionResult is the provider-agnostic superset of the AI layer's
 *    `AIPolicyExtractionResponse` (lib/services/ai/ai-service.interface.ts). A thin
 *    adapter bridges the two (Phase 4); this module stays dependency-free of providers.
 *  - Gap is the in-memory output of the deterministic engine (Phase 6). It persists
 *    onto the existing `GapInstance` table; engine severity maps to the canonical
 *    4-level `GapSeverity` from `@/types` on write (see toPersistedGapSeverity).
 */

import { z } from "zod"
import type { GapSeverity as PersistedGapSeverity } from "@/types"

// ── Document source & provenance ─────────────────────────────────────────────

export const DOCUMENT_SOURCES = ["text-layer", "scanned"] as const
export type DocumentSource = (typeof DOCUMENT_SOURCES)[number]

/** Where a single field's value came from. 'cache' = served from DocumentExtraction. */
export const FIELD_SOURCES = ["regex", "template", "model", "cache"] as const
export type FieldSource = (typeof FIELD_SOURCES)[number]

/**
 * The path a document actually took — the margin-dashboard dimension.
 * Ordered cheapest → most expensive. The first three are strictly $0.
 */
export const EXTRACTION_PATHS = [
  "cache-hit", // $0 — DB read of a prior DocumentExtraction
  "text-layer", // $0 — local pdf-parse, no external call
  "template", // $0 — per-insurer regex/template
  "ocr", // OCR compute (coverage pages only), no LLM tokens
  "model-fallback", // cheapest model tier + structured output, ambiguous remainder only
  "frontier-fallback", // last resort only
] as const
export type ExtractionPath = (typeof EXTRACTION_PATHS)[number]

const ZERO_COST_PATHS: ReadonlySet<ExtractionPath> = new Set([
  "cache-hit",
  "text-layer",
  "template",
])

/** True when the path incurs no token/OCR spend — used to assert $0 on the common case. */
export function isZeroCostPath(path: ExtractionPath): boolean {
  return ZERO_COST_PATHS.has(path)
}

// ── Field value (value + confidence + provenance) ────────────────────────────

export interface FieldValue<T> {
  /** Never null — a safe labelled placeholder is used instead (Greek-locale rule). */
  value: T
  /** 0..1 */
  confidence: number
  source: FieldSource
  /** Optional raw span the value was parsed from, for audit/provenance. */
  evidence?: string
}

const fieldValueSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    value: inner,
    confidence: z.number().min(0).max(1),
    source: z.enum(FIELD_SOURCES),
    evidence: z.string().optional(),
  })

// ── Normalized coverage (one row of the Πίνακας Καλύψεων) ─────────────────────

export interface NormalizedCoverage {
  /** FK → CoverageTaxonomy.key, e.g. 'motor.own_damage', 'health.hospitalization'. */
  taxonomyKey: string
  /** Parsed € as an integer EUR amount (€50.000 → 50000). */
  limit?: number
  deductible?: number
  subLimits?: Record<string, number>
  exclusions: string[]
  confidence: number
  source: FieldSource
}

export const normalizedCoverageSchema: z.ZodType<NormalizedCoverage> = z.object({
  taxonomyKey: z.string().min(1),
  limit: z.number().optional(),
  deductible: z.number().optional(),
  subLimits: z.record(z.string(), z.number()).optional(),
  exclusions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  source: z.enum(FIELD_SOURCES),
})

// ── Cost-per-document (margin dashboard feed) ────────────────────────────────

export interface ExtractionCost {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costEur: number
  /** null on a $0 path (cache-hit / text-layer / template). */
  model: string | null
  pathTaken: ExtractionPath
}

export const extractionCostSchema: z.ZodType<ExtractionCost> = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  costEur: z.number().min(0),
  model: z.string().nullable(),
  pathTaken: z.enum(EXTRACTION_PATHS),
})

// ── Extraction result (persisted to DocumentExtraction.structured) ───────────

export interface ExtractionResult {
  /** sha256 of the file bytes — the global cache key. */
  contentHash: string
  source: DocumentSource
  pathTaken: ExtractionPath
  insurer: FieldValue<string>
  policyNumber: FieldValue<string>
  /** EUR integer. */
  premium: FieldValue<number>
  /** ISO yyyy-mm-dd (parsed from Greek dd/mm/yyyy). */
  startDate: FieldValue<string>
  endDate: FieldValue<string>
  coverages: NormalizedCoverage[]
  overallConfidence: number
  requiresReview: boolean
  cost: ExtractionCost
}

export const extractionResultSchema: z.ZodType<ExtractionResult> = z.object({
  contentHash: z.string().regex(/^[a-f0-9]{64}$/, "expected a sha256 hex digest"),
  source: z.enum(DOCUMENT_SOURCES),
  pathTaken: z.enum(EXTRACTION_PATHS),
  insurer: fieldValueSchema(z.string().min(1)),
  policyNumber: fieldValueSchema(z.string()),
  premium: fieldValueSchema(z.number()),
  startDate: fieldValueSchema(z.string()),
  endDate: fieldValueSchema(z.string()),
  coverages: z.array(normalizedCoverageSchema),
  overallConfidence: z.number().min(0).max(1),
  requiresReview: z.boolean(),
  cost: extractionCostSchema,
})

// ── Gap severity (engine 3-level; declared before the envelope uses it) ──────

export const ENGINE_GAP_SEVERITIES = ["info", "recommended", "critical"] as const
export type EngineGapSeverity = (typeof ENGINE_GAP_SEVERITIES)[number]

// ── Coverage envelope (expected benchmark for the Gap Engine) ────────────────

export interface EnvelopeExpectation {
  taxonomyKey: string
  minLimit?: number
  maxDeductible?: number
  requiredSubLimits?: string[]
  /** Exclusions whose presence constitutes a gap. */
  forbiddenExclusions?: string[]
  severityIfMissing: EngineGapSeverity
}

export const envelopeExpectationSchema: z.ZodType<EnvelopeExpectation> = z.object({
  taxonomyKey: z.string().min(1),
  minLimit: z.number().optional(),
  maxDeductible: z.number().optional(),
  requiredSubLimits: z.array(z.string()).optional(),
  forbiddenExclusions: z.array(z.string()).optional(),
  severityIfMissing: z.enum(ENGINE_GAP_SEVERITIES),
})

/** In-memory shape; deserialized from a CoverageEnvelope row (expectations JSON). */
export interface CoverageEnvelope {
  lineOfBusiness: string
  version: number
  /** Omitted or '' = baseline (the DB sentinel); else a segment such as 'homeowner'. */
  profileSegment?: string
  expectations: EnvelopeExpectation[]
}

export const coverageEnvelopeSchema: z.ZodType<CoverageEnvelope> = z.object({
  lineOfBusiness: z.string().min(1),
  version: z.number().int().min(1),
  profileSegment: z.string().optional(),
  expectations: z.array(envelopeExpectationSchema),
})

/** The persisted `expectations` JSON column is exactly this array. */
export const envelopeExpectationsColumnSchema = z.array(envelopeExpectationSchema)

// ── Gap (deterministic engine output) ────────────────────────────────────────

export const GAP_KINDS = [
  "missing",
  "under_limit",
  "excluded",
  "high_deductible",
] as const
export type GapKind = (typeof GAP_KINDS)[number]

export interface Gap {
  taxonomyKey: string
  severity: EngineGapSeverity
  kind: GapKind
  /** Stable reason KEY (not prose). Phase 7 resolves it to bilingual templates, cached by gap-type. */
  reason: string
  actual?: number
  expected?: number
}

export const gapSchema: z.ZodType<Gap> = z.object({
  taxonomyKey: z.string().min(1),
  severity: z.enum(ENGINE_GAP_SEVERITIES),
  kind: z.enum(GAP_KINDS),
  reason: z.string().min(1),
  actual: z.number().optional(),
  expected: z.number().optional(),
})

/**
 * Engine (3-level) → persisted GapInstance (canonical 4-level `@/types` GapSeverity).
 * Approved mapping: critical→critical, recommended→high, info→low. 'medium' is
 * intentionally unused by the engine (reserved for legacy/profile gaps).
 */
export const PERSIST_GAP_SEVERITY: Record<EngineGapSeverity, PersistedGapSeverity> = {
  critical: "critical",
  recommended: "high",
  info: "low",
}

export function toPersistedGapSeverity(severity: EngineGapSeverity): PersistedGapSeverity {
  return PERSIST_GAP_SEVERITY[severity]
}

// ── Engine signature (implemented in Phase 6) ────────────────────────────────

/**
 * Pure, deterministic, no I/O and no model — the ONLY gap detector.
 * (Implementation lands in Phase 6; this is the contract it must satisfy.)
 */
export type DetectGaps = (
  actual: NormalizedCoverage[],
  envelope: CoverageEnvelope,
) => Gap[]
