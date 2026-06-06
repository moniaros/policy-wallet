// @vitest-environment node
/**
 * Gate 3 — P5 content-hash cache against a REAL database (TEST_DATABASE_URL).
 *
 * The cost-guardrail negative assertion: submitting the same content hash twice
 * re-extracts ONCE; the second call is a $0 DB cache hit and the extractor is NOT
 * invoked again. Skips unless a dedicated, non-prod test DB is configured.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest"
import { hasTestDb, ensureTestSchema, truncateIngestionTables, testDb } from "../helpers/test-db"
import { getOrExtract } from "@/lib/services/ingestion/extraction-cache"
import type { ExtractionResult } from "@/lib/services/ingestion/contracts"

function sampleResult(contentHash: string): ExtractionResult {
  return {
    contentHash,
    source: "text-layer",
    pathTaken: "template",
    insurer: { value: "Εθνική Ασφαλιστική", confidence: 0.95, source: "template" },
    policyNumber: { value: "AB-123456", confidence: 0.9, source: "regex" },
    premium: { value: 450, confidence: 0.85, source: "regex" },
    startDate: { value: "2026-01-01", confidence: 0.85, source: "regex" },
    endDate: { value: "2026-12-31", confidence: 0.85, source: "regex" },
    coverages: [{ taxonomyKey: "motor.fire", limit: 50000, exclusions: [], confidence: 0.8, source: "regex" }],
    overallConfidence: 0.88,
    requiresReview: false,
    cost: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costEur: 0, model: null, pathTaken: "template" },
  }
}

describe.skipIf(!hasTestDb)("P5 content-hash cache (TEST_DATABASE_URL)", () => {
  beforeAll(() => ensureTestSchema())
  beforeEach(() => truncateIngestionTables())
  afterAll(async () => {
    await testDb.$disconnect()
  })

  it("re-extracts on first sight, then serves a $0 cache hit without re-extracting", async () => {
    const hash = "a".repeat(64)
    const extractor = vi.fn(async () => sampleResult(hash))

    const first = await getOrExtract(hash, extractor) // miss → extract + persist
    const second = await getOrExtract(hash, extractor) // hit → DB read only

    // The negative assertion: the second identical hash did NOT re-extract.
    expect(extractor).toHaveBeenCalledTimes(1)
    expect(first.pathTaken).toBe("template")
    expect(second.pathTaken).toBe("cache-hit")
    expect(second.cost.costEur).toBe(0)
    expect(second.cost.model).toBeNull()
    expect(second.insurer.value).toBe(first.insurer.value)

    // Exactly one persisted row for the hash.
    const rows = await testDb.documentExtraction.count({ where: { contentHash: hash } })
    expect(rows).toBe(1)
  })

  it("treats distinct content hashes as separate cache entries", async () => {
    const a = "a".repeat(64)
    const b = "b".repeat(64)
    const extractor = vi.fn(async (h: string) => sampleResult(h))

    await getOrExtract(a, () => extractor(a))
    await getOrExtract(b, () => extractor(b))
    await getOrExtract(a, () => extractor(a)) // hit

    expect(extractor).toHaveBeenCalledTimes(2) // a (miss) + b (miss); 2nd a was a hit
    expect(await testDb.documentExtraction.count()).toBe(2)
  })
})
