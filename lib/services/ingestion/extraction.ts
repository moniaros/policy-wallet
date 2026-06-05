/**
 * Phase 4 — Extraction orchestrator
 *
 * Turns a RawTextExtraction (Phase 2/3) into the Phase-0 ExtractionResult:
 *   1. deterministic regex/alias extraction ($0) for every field,
 *   2. the cheapest model + JSON-schema-constrained output ONLY for the fields the
 *      deterministic pass could not resolve (last resort),
 *   3. safe labelled placeholders so nothing is ever null / "Unknown Insurer".
 *
 * The model fallback is an injected FieldResolver so the orchestration is unit-tested
 * without a model; createModelFieldResolver() wires the real cheapest provider.
 */

import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { routeModel } from "../ai/model-router"
import type {
  ExtractionResult,
  ExtractionCost,
  ExtractionPath,
  FieldValue,
} from "./contracts"
import type { RawTextExtraction } from "./text-extraction"
import {
  extractPolicyNumber,
  extractPremium,
  extractDates,
  normalizeInsurer,
  parseCoverages,
  type InsurerAlias,
  type TaxonomyEntry,
} from "./field-extractors"

// Gemini pricing (EUR / 1M tokens) — cheapest tier; mirrors model-router's table.
const GEMINI_INPUT_EUR_PER_M = 0.07
const GEMINI_OUTPUT_EUR_PER_M = 0.28
const MODEL_TEXT_BUDGET_CHARS = 8000 // cap the snippet sent to the model — keep it cheap
const MIN_FIELD_CONFIDENCE = 0.5

// ── Reference data ────────────────────────────────────────────────────────────

export interface ExtractionReferences {
  insurers: InsurerAlias[]
  taxonomy: TaxonomyEntry[]
}

export async function loadExtractionReferences(): Promise<ExtractionReferences> {
  const [templates, taxonomy] = await Promise.all([
    db.insurerTemplate.findMany({
      where: { isActive: true },
      select: { canonicalName: true, nameAliases: true },
    }),
    db.coverageTaxonomy.findMany({
      where: { isActive: true },
      select: { key: true, lineOfBusiness: true, aliases: true },
    }),
  ])
  return {
    insurers: templates.map((t) => ({ canonicalName: t.canonicalName, aliases: t.nameAliases })),
    taxonomy: taxonomy.map((t) => ({ key: t.key, lineOfBusiness: t.lineOfBusiness, aliases: t.aliases })),
  }
}

// ── Model fallback (injectable) ───────────────────────────────────────────────

export interface ResolvedFields {
  insurerName?: string
  policyNumber?: string
  premium?: number
  startDate?: string
  endDate?: string
}

export type ResolvableField = keyof ResolvedFields

export interface FieldResolverUsage {
  inputTokens: number
  outputTokens: number
  model: string
  costEur: number
}

export interface FieldResolverResult {
  fields: ResolvedFields
  usage: FieldResolverUsage
}

export interface FieldResolver {
  resolve(input: { text: string; missing: ResolvableField[] }): Promise<FieldResolverResult>
}

// ── Orchestration ───────────────────────────────────────────────────────────────

export interface ExtractFieldsInput {
  raw: RawTextExtraction
  /** sha256 of the source file (computed upstream; reused by the Phase-5 cache). */
  contentHash: string
  references: ExtractionReferences
  /** Model fallback — omit for a strictly $0 deterministic extraction. */
  resolver?: FieldResolver
}

export async function extractFields(input: ExtractFieldsInput): Promise<ExtractionResult> {
  const { raw, contentHash, references, resolver } = input
  const text = raw.fullText

  // 1. Deterministic pass ($0).
  let insurer = normalizeInsurer(text, references.insurers)
  let policyNumber = extractPolicyNumber(text)
  let premium = extractPremium(text)
  const dates = extractDates(text)
  let startDate = dates.startDate
  let endDate = dates.endDate
  const coverages = parseCoverages(raw.coverageText, references.taxonomy)

  const usedTemplate = insurer.source === "template"

  // 2. What's still missing? (insurer at confidence 0 = unresolved placeholder.)
  const missing: ResolvableField[] = []
  if (insurer.confidence === 0) missing.push("insurerName")
  if (!policyNumber) missing.push("policyNumber")
  if (!premium) missing.push("premium")
  if (!startDate) missing.push("startDate")
  if (!endDate) missing.push("endDate")

  let cost: ExtractionCost = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costEur: 0,
    model: null,
    pathTaken: basePath(raw),
  }
  let usedModel = false

  // 3. Model fallback ONLY for the ambiguous remainder. A failure here degrades to
  //    the deterministic result + placeholders (requiresReview stays true); the model
  //    is last-resort and must never crash the extraction. Sentry is wired at the call site.
  if (resolver && missing.length > 0) {
    try {
      const r = await resolver.resolve({ text, missing })
      usedModel = true
      const f = r.fields
      if (missing.includes("insurerName") && f.insurerName) {
        insurer = { value: f.insurerName, confidence: 0.6, source: "model" }
      }
      if (missing.includes("policyNumber") && f.policyNumber) {
        policyNumber = { value: f.policyNumber, confidence: 0.6, source: "model" }
      }
      if (missing.includes("premium") && f.premium != null) {
        premium = { value: f.premium, confidence: 0.6, source: "model" }
      }
      if (missing.includes("startDate") && f.startDate) {
        startDate = { value: f.startDate, confidence: 0.6, source: "model" }
      }
      if (missing.includes("endDate") && f.endDate) {
        endDate = { value: f.endDate, confidence: 0.6, source: "model" }
      }
      cost = {
        inputTokens: r.usage.inputTokens,
        outputTokens: r.usage.outputTokens,
        totalTokens: r.usage.inputTokens + r.usage.outputTokens,
        costEur: r.usage.costEur,
        model: r.usage.model,
        pathTaken: "model-fallback",
      }
    } catch {
      // Model fallback failed — keep deterministic results + placeholders. usedModel
      // stays false so pathTaken/cost reflect the $0 path; requiresReview is already true.
    }
  }

  // 4. Assemble with safe placeholders (never null) + pathTaken/confidence.
  const finalPolicyNumber = policyNumber ?? emptyField<string>("")
  const finalPremium = premium ?? emptyField<number>(0)
  const finalStartDate = startDate ?? emptyField<string>("")
  const finalEndDate = endDate ?? emptyField<string>("")

  const confidences = [
    insurer.confidence,
    finalPolicyNumber.confidence,
    finalPremium.confidence,
    finalStartDate.confidence,
    finalEndDate.confidence,
  ]
  const overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
  const requiresReview = insurer.confidence === 0 || overallConfidence < MIN_FIELD_CONFIDENCE

  const pathTaken: ExtractionPath = usedModel
    ? "model-fallback"
    : raw.source === "scanned"
      ? "ocr"
      : usedTemplate
        ? "template"
        : "text-layer"
  cost.pathTaken = pathTaken

  return {
    contentHash,
    source: raw.source,
    pathTaken,
    insurer,
    policyNumber: finalPolicyNumber,
    premium: finalPremium,
    startDate: finalStartDate,
    endDate: finalEndDate,
    coverages,
    overallConfidence,
    requiresReview,
    cost,
  }
}

function emptyField<T>(value: T): FieldValue<T> {
  return { value, confidence: 0, source: "regex" }
}

function basePath(raw: RawTextExtraction): ExtractionPath {
  return raw.source === "scanned" ? "ocr" : "text-layer"
}

// ── Real model resolver (cheapest provider; last resort) ──────────────────────

const ModelResolverSchema = z.object({
  insurerName: z.string().optional(),
  policyNumber: z.string().optional(),
  premium: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

/**
 * Builds a FieldResolver backed by the cheapest provider (Gemini Flash) with
 * JSON-schema-constrained output. Returns null when no Gemini key is configured —
 * callers then run deterministic-only. NEVER a frontier model (cost guardrail).
 */
export function createModelFieldResolver(): FieldResolver | null {
  if (!env.GEMINI_API_KEY) return null
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })
  const modelName = routeModel("extractPolicyData", "gemini", "free").model

  return {
    async resolve({ text, missing }) {
      const snippet = text.slice(0, MODEL_TEXT_BUDGET_CHARS)
      const result = await generateObject({
        model: google(modelName),
        schema: ModelResolverSchema,
        temperature: 0.1,
        prompt:
          `Extract ONLY these fields from this Greek insurance policy text: ${missing.join(", ")}.\n` +
          `Rules: dates as ISO yyyy-mm-dd (source is dd/mm/yyyy); premium as a number in EUR ` +
          `(Greek format, e.g. 50.000 means 50000); omit any field you cannot find.\n\n` +
          snippet,
      })
      const inputTokens = result.usage.inputTokens ?? 0
      const outputTokens = result.usage.outputTokens ?? 0
      return {
        fields: result.object,
        usage: {
          inputTokens,
          outputTokens,
          model: modelName,
          costEur:
            (inputTokens / 1_000_000) * GEMINI_INPUT_EUR_PER_M +
            (outputTokens / 1_000_000) * GEMINI_OUTPUT_EUR_PER_M,
        },
      }
    },
  }
}
