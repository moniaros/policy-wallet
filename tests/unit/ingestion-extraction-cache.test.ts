import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

vi.mock("@/lib/db", () => ({
  db: { documentExtraction: { findUnique: vi.fn(), upsert: vi.fn() } },
}))

import { db } from "@/lib/db"
import {
  hashContent,
  serializeExtraction,
  deserializeExtraction,
  getCachedExtraction,
  putExtraction,
  getOrExtract,
} from "@/lib/services/ingestion/extraction-cache"
import type { ExtractionResult } from "@/lib/services/ingestion/contracts"

const mockDb = db as unknown as {
  documentExtraction: { findUnique: Mock; upsert: Mock }
}

function sampleResult(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    contentHash: "a".repeat(64),
    source: "text-layer",
    pathTaken: "template",
    insurer: { value: "Εθνική Ασφαλιστική", confidence: 0.95, source: "template" },
    policyNumber: { value: "AB-123456", confidence: 0.9, source: "regex" },
    premium: { value: 450, confidence: 0.85, source: "regex" },
    startDate: { value: "2026-01-01", confidence: 0.85, source: "regex" },
    endDate: { value: "2026-12-31", confidence: 0.85, source: "regex" },
    coverages: [
      { taxonomyKey: "motor.fire", limit: 50000, exclusions: [], confidence: 0.8, source: "regex" },
    ],
    overallConfidence: 0.88,
    requiresReview: false,
    cost: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costEur: 0, model: null, pathTaken: "template" },
    ...overrides,
  }
}

// Simulate a JSONB round-trip through the database.
const asStored = (r: ExtractionResult): unknown => JSON.parse(JSON.stringify(r))

beforeEach(() => vi.clearAllMocks())

describe("hashContent", () => {
  it("produces the sha256 hex of the bytes", async () => {
    // Known sha256("abc").
    expect(await hashContent(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    )
  })
})

describe("serializeExtraction", () => {
  it("maps headline + cost columns and keeps the structured copy", () => {
    const row = serializeExtraction(sampleResult())
    expect(row.contentHash).toBe("a".repeat(64))
    expect(row.insurerName).toBe("Εθνική Ασφαλιστική")
    expect(row.policyNumber).toBe("AB-123456")
    expect(row.premiumAmount).toBe(450)
    expect(row.startDate).toBeInstanceOf(Date)
    expect(row.costEur).toBe(0)
    expect(row.model).toBeNull()
  })

  it("stores a safe insurer placeholder and null premium for an empty extraction", () => {
    const row = serializeExtraction(
      sampleResult({
        insurer: { value: "", confidence: 0, source: "regex" },
        premium: { value: 0, confidence: 0, source: "regex" },
        startDate: { value: "", confidence: 0, source: "regex" },
      }),
    )
    expect(row.insurerName).toBe("Άγνωστος ασφαλιστής")
    expect(row.premiumAmount).toBeNull()
    expect(row.startDate).toBeNull()
  })
})

describe("deserializeExtraction", () => {
  it("re-stamps a stored result as a $0 cache hit, preserving field provenance", () => {
    const out = deserializeExtraction(asStored(sampleResult()))
    expect(out).not.toBeNull()
    expect(out!.pathTaken).toBe("cache-hit")
    expect(out!.cost.costEur).toBe(0)
    expect(out!.cost.pathTaken).toBe("cache-hit")
    expect(out!.insurer.value).toBe("Εθνική Ασφαλιστική")
    expect(out!.insurer.source).toBe("template") // provenance preserved
  })

  it("round-trips everything but path/cost", () => {
    const original = sampleResult()
    const out = deserializeExtraction(asStored(original))!
    expect(out.policyNumber).toEqual(original.policyNumber)
    expect(out.coverages).toEqual(original.coverages)
  })

  it("returns null on a schema mismatch (corrupt row)", () => {
    expect(deserializeExtraction({ nope: true })).toBeNull()
    expect(deserializeExtraction({ ...sampleResult(), contentHash: "tooShort" })).toBeNull()
  })
})

describe("getCachedExtraction", () => {
  it("returns the deserialized result on a hit", async () => {
    mockDb.documentExtraction.findUnique.mockResolvedValue({ structured: asStored(sampleResult()) })
    const out = await getCachedExtraction("a".repeat(64))
    expect(out?.pathTaken).toBe("cache-hit")
    expect(mockDb.documentExtraction.findUnique).toHaveBeenCalledWith({
      where: { contentHash: "a".repeat(64) },
      select: { structured: true },
    })
  })

  it("returns null on a miss", async () => {
    mockDb.documentExtraction.findUnique.mockResolvedValue(null)
    expect(await getCachedExtraction("b".repeat(64))).toBeNull()
  })
})

describe("getOrExtract", () => {
  it("does NOT re-extract on a cache hit", async () => {
    mockDb.documentExtraction.findUnique.mockResolvedValue({ structured: asStored(sampleResult()) })
    const extract = vi.fn<() => Promise<ExtractionResult>>()
    const out = await getOrExtract("a".repeat(64), extract)
    expect(extract).not.toHaveBeenCalled()
    expect(mockDb.documentExtraction.upsert).not.toHaveBeenCalled()
    expect(out.pathTaken).toBe("cache-hit")
  })

  it("extracts and persists on a miss", async () => {
    mockDb.documentExtraction.findUnique.mockResolvedValue(null)
    const fresh = sampleResult()
    const extract = vi.fn(async () => fresh)
    const out = await getOrExtract("a".repeat(64), extract)
    expect(extract).toHaveBeenCalledOnce()
    expect(mockDb.documentExtraction.upsert).toHaveBeenCalledOnce()
    expect(out).toBe(fresh)
  })
})

describe("putExtraction", () => {
  it("upserts by content hash with the same create/update data", async () => {
    await putExtraction(sampleResult())
    const arg = mockDb.documentExtraction.upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ contentHash: "a".repeat(64) })
    expect(arg.create.insurerName).toBe("Εθνική Ασφαλιστική")
    expect(arg.update.insurerName).toBe("Εθνική Ασφαλιστική")
  })
})
