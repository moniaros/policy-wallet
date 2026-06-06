/**
 * Orchestrator integration — the composed ingestion pipeline.
 *
 * Wires the eight phases into one call: hash → content-hash cache → triage →
 * local-text / OCR → deterministic extraction (model last-resort) → deterministic
 * Gap Engine → bilingual explanations. The common case (cache hit, or a text-layer
 * PDF) is $0. Sentry instruments extraction failures, the OCR fallback, and
 * low-confidence results, per the brief.
 *
 * This is the new entry point that replaces the LLM-in-the-loop gap detection in
 * GapAnalysisService.analyzePolicy (next step: persist gaps onto GapInstance and
 * cut that service over).
 */

import * as Sentry from "@sentry/nextjs"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { hashContent, getOrExtract } from "./extraction-cache"
import { triagePdf } from "./triage"
import { extractLocalText } from "./text-extraction"
import { extractScannedTextFromPdf } from "./scan-extraction"
import {
  extractFields,
  loadExtractionReferences,
  createModelFieldResolver,
} from "./extraction"
import { detectGaps } from "./gap-detection"
import {
  explainGap,
  makeTaxonomyNameLookup,
  type GapExplanation,
  type TaxonomyNameLookup,
} from "./gap-explanations"
import {
  envelopeExpectationsColumnSchema,
  type CoverageEnvelope,
  type ExtractionResult,
  type Gap,
} from "./contracts"

export interface PipelineGap {
  gap: Gap
  explanation: GapExplanation
}

export interface IngestionPipelineResult {
  contentHash: string
  fromCache: boolean
  extraction: ExtractionResult
  gaps: PipelineGap[]
}

export interface RunPipelineOptions {
  /** Policy line of business (selects the CoverageEnvelope). Derived from coverages if omitted. */
  lineOfBusiness?: string
  /** Optional profile segment (e.g. 'homeowner'); falls back to the baseline envelope. */
  profileSegment?: string
}

/** Run the full ingestion pipeline for a single document buffer. */
export async function runIngestionPipeline(
  buffer: Buffer,
  options: RunPipelineOptions = {},
): Promise<IngestionPipelineResult> {
  const contentHash = await hashContent(buffer)

  let fromCache = true
  const extraction = await getOrExtract(contentHash, async () => {
    fromCache = false
    return extractFreshFromBuffer(buffer, contentHash)
  })

  // Instrument low-confidence extractions.
  if (extraction.requiresReview) {
    Sentry.captureMessage("Ingestion extraction flagged for review (low confidence)", {
      level: "warning",
      tags: { contentHash: contentHash.slice(0, 12), pathTaken: extraction.pathTaken },
    })
  }

  const lineOfBusiness = options.lineOfBusiness ?? deriveLineOfBusiness(extraction)
  const [envelope, lookup] = await Promise.all([
    lineOfBusiness ? loadEnvelope(lineOfBusiness, options.profileSegment) : Promise.resolve(null),
    loadTaxonomyNameLookup(),
  ])

  const gaps: PipelineGap[] = envelope
    ? detectGaps(extraction.coverages, envelope).map((gap) => ({
        gap,
        explanation: explainGap(gap, lookup),
      }))
    : []

  logger("info", "Ingestion pipeline completed", {
    contentHash: contentHash.slice(0, 12),
    fromCache,
    source: extraction.source,
    pathTaken: extraction.pathTaken,
    costEur: extraction.cost.costEur,
    coverages: extraction.coverages.length,
    gaps: gaps.length,
    requiresReview: extraction.requiresReview,
  })

  return { contentHash, fromCache, extraction, gaps }
}

/** Triage → local-text / OCR → extract. Sentry-wrapped; only runs on a cache miss. */
async function extractFreshFromBuffer(
  buffer: Buffer,
  contentHash: string,
): Promise<ExtractionResult> {
  try {
    const triage = await triagePdf(buffer)

    if (triage.source === "scanned") {
      // Instrument the OCR fallback (the expensive path was taken).
      Sentry.captureMessage("Ingestion took the scanned/OCR path", {
        level: "info",
        tags: { contentHash: contentHash.slice(0, 12), pages: String(triage.pageCount) },
      })
    }

    const raw =
      triage.source === "scanned"
        ? await extractScannedTextFromPdf(buffer, triage)
        : extractLocalText(triage)

    const references = await loadExtractionReferences()
    return await extractFields({
      raw,
      contentHash,
      references,
      resolver: createModelFieldResolver() ?? undefined,
    })
  } catch (error) {
    // Instrument extraction failures.
    Sentry.captureException(error, {
      tags: { stage: "ingestion-extraction", contentHash: contentHash.slice(0, 12) },
    })
    throw error
  }
}

/** Dominant taxonomy-key prefix as the line of business (e.g. 'motor.fire' → 'motor'). */
export function deriveLineOfBusiness(extraction: ExtractionResult): string | null {
  const counts = new Map<string, number>()
  for (const coverage of extraction.coverages) {
    const lob = coverage.taxonomyKey.split(".")[0]
    if (lob) counts.set(lob, (counts.get(lob) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [lob, count] of counts) {
    if (count > bestCount) {
      best = lob
      bestCount = count
    }
  }
  return best
}

/** Load the CoverageEnvelope for a LoB: prefer the requested segment, else baseline (''). */
async function loadEnvelope(
  lineOfBusiness: string,
  profileSegment?: string,
): Promise<CoverageEnvelope | null> {
  const segments = profileSegment ? [profileSegment, ""] : [""]
  const candidates = await db.coverageEnvelope.findMany({
    where: { lineOfBusiness, isActive: true, profileSegment: { in: segments } },
    orderBy: [{ version: "desc" }],
  })

  const row =
    (profileSegment ? candidates.find((c) => c.profileSegment === profileSegment) : undefined) ??
    candidates.find((c) => c.profileSegment === "") ??
    candidates[0]
  if (!row) return null

  const parsed = envelopeExpectationsColumnSchema.safeParse(row.expectations)
  if (!parsed.success) {
    Sentry.captureMessage("CoverageEnvelope expectations failed schema validation", {
      level: "error",
      tags: { lineOfBusiness, envelopeId: row.id },
    })
    return null
  }
  return {
    lineOfBusiness: row.lineOfBusiness,
    version: row.version,
    profileSegment: row.profileSegment || undefined,
    expectations: parsed.data,
  }
}

async function loadTaxonomyNameLookup(): Promise<TaxonomyNameLookup> {
  const rows = await db.coverageTaxonomy.findMany({
    where: { isActive: true },
    select: { key: true, nameEl: true, nameEn: true },
  })
  return makeTaxonomyNameLookup(rows)
}
