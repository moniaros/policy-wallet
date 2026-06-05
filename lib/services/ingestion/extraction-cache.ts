/**
 * Phase 5 — Content-hash extraction cache
 *
 * The permanent, global cache over the Phase-0 `DocumentExtraction` table, keyed by
 * the sha256 of the file bytes. On a hit the structured ExtractionResult is returned
 * from a single DB read ($0) — nothing re-OCRs or re-calls a model. We store the
 * STRUCTURED object only (never raw text), so every downstream phase reads structure.
 *
 * Global by content hash (Phase-0 decision): identical bytes uploaded by anyone reuse
 * one extraction. The per-document owner link stays on PolicyDocument, not here.
 *
 * Supersedes the legacy 24h-TTL JSON cache (lib/services/analysis/extraction-cache.ts);
 * that module is retired once the pipeline is wired into the orchestrator.
 */

import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { hashDocumentBuffer } from "@/lib/services/analysis/extraction-cache"
import { UNKNOWN_INSURER_PLACEHOLDER } from "./field-extractors"
import {
  extractionResultSchema,
  type ExtractionCost,
  type ExtractionResult,
} from "./contracts"

/** sha256 of the upload bytes — the cache key. Reuses the existing hasher. */
export const hashContent = hashDocumentBuffer

function cacheHitCost(): ExtractionCost {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costEur: 0,
    model: null,
    pathTaken: "cache-hit",
  }
}

/**
 * Map an ExtractionResult to DocumentExtraction columns. `structured` is the
 * authoritative copy; the headline + cost columns are denormalized for dashboard
 * queries and reflect the ORIGINAL extraction (not a cache hit).
 */
export function serializeExtraction(
  result: ExtractionResult,
): Prisma.DocumentExtractionUncheckedCreateInput {
  return {
    contentHash: result.contentHash,
    source: result.source,
    pathTaken: result.pathTaken,
    insurerName: result.insurer.value || UNKNOWN_INSURER_PLACEHOLDER,
    policyNumber: result.policyNumber.value || null,
    premiumAmount: result.premium.value || null,
    startDate: result.startDate.value ? new Date(result.startDate.value) : null,
    endDate: result.endDate.value ? new Date(result.endDate.value) : null,
    structured: result as unknown as Prisma.InputJsonValue,
    overallConfidence: result.overallConfidence,
    requiresReview: result.requiresReview,
    inputTokens: result.cost.inputTokens,
    outputTokens: result.cost.outputTokens,
    totalTokens: result.cost.totalTokens,
    costEur: result.cost.costEur,
    model: result.cost.model,
  }
}

/**
 * Validate a stored `structured` JSONB into an ExtractionResult, re-stamped as a
 * cache hit ($0 this request; field-level provenance preserved). Returns null on a
 * schema mismatch so a corrupt row degrades to a fresh extraction rather than crashing.
 */
export function deserializeExtraction(structured: unknown): ExtractionResult | null {
  const parsed = extractionResultSchema.safeParse(structured)
  if (!parsed.success) return null
  return { ...parsed.data, pathTaken: "cache-hit", cost: cacheHitCost() }
}

/** Return the cached ExtractionResult for a content hash, or null on a miss. */
export async function getCachedExtraction(
  contentHash: string,
): Promise<ExtractionResult | null> {
  const row = await db.documentExtraction.findUnique({
    where: { contentHash },
    select: { structured: true },
  })
  if (!row) return null
  return deserializeExtraction(row.structured)
}

/** Upsert an extraction into the permanent cache (no TTL). Idempotent per content hash. */
export async function putExtraction(result: ExtractionResult): Promise<void> {
  const data = serializeExtraction(result)
  await db.documentExtraction.upsert({
    where: { contentHash: result.contentHash },
    create: data,
    update: data,
  })
}

/**
 * Cache-aside entry point: on a hit return the stored result ($0); on a miss run
 * `extract`, persist it, and return it. The hash is never re-extracted once cached.
 */
export async function getOrExtract(
  contentHash: string,
  extract: () => Promise<ExtractionResult>,
): Promise<ExtractionResult> {
  const cached = await getCachedExtraction(contentHash)
  if (cached) return cached
  const result = await extract()
  await putExtraction(result)
  return result
}
