import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    coverageEnvelope: { findMany: vi.fn() },
    coverageTaxonomy: { findMany: vi.fn() },
  },
}))
vi.mock("@/lib/services/ingestion/extraction-cache", () => ({
  hashContent: vi.fn(async () => "a".repeat(64)),
  getOrExtract: vi.fn(),
}))
vi.mock("@/lib/services/ingestion/triage", () => ({ triagePdf: vi.fn() }))
vi.mock("@/lib/services/ingestion/scan-extraction", () => ({ extractScannedTextFromPdf: vi.fn() }))
vi.mock("@/lib/services/ingestion/extraction", () => ({
  extractFields: vi.fn(),
  loadExtractionReferences: vi.fn(async () => ({ insurers: [], taxonomy: [] })),
  createModelFieldResolver: vi.fn(() => null),
}))

import * as Sentry from "@sentry/nextjs"
import { db } from "@/lib/db"
import { getOrExtract } from "@/lib/services/ingestion/extraction-cache"
import { triagePdf } from "@/lib/services/ingestion/triage"
import { extractScannedTextFromPdf } from "@/lib/services/ingestion/scan-extraction"
import { extractFields } from "@/lib/services/ingestion/extraction"
import { runIngestionPipeline, deriveLineOfBusiness } from "@/lib/services/ingestion/pipeline"
import type { ExtractionResult } from "@/lib/services/ingestion/contracts"
import type { TriageResult } from "@/lib/services/ingestion/triage"

const m = {
  getOrExtract: getOrExtract as Mock,
  triagePdf: triagePdf as Mock,
  extractScannedTextFromPdf: extractScannedTextFromPdf as Mock,
  extractFields: extractFields as Mock,
  captureMessage: Sentry.captureMessage as Mock,
  captureException: Sentry.captureException as Mock,
  envelopeFindMany: (db as unknown as { coverageEnvelope: { findMany: Mock } }).coverageEnvelope.findMany,
  taxonomyFindMany: (db as unknown as { coverageTaxonomy: { findMany: Mock } }).coverageTaxonomy.findMany,
}

function extraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    contentHash: "a".repeat(64),
    source: "text-layer",
    pathTaken: "template",
    insurer: { value: "Εθνική Ασφαλιστική", confidence: 0.95, source: "template" },
    policyNumber: { value: "AB-1", confidence: 0.9, source: "regex" },
    premium: { value: 450, confidence: 0.85, source: "regex" },
    startDate: { value: "2026-01-01", confidence: 0.85, source: "regex" },
    endDate: { value: "2026-12-31", confidence: 0.85, source: "regex" },
    coverages: [{ taxonomyKey: "motor.fire", limit: 50000, exclusions: [], confidence: 0.8, source: "regex" }],
    overallConfidence: 0.88,
    requiresReview: false,
    cost: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costEur: 0, model: null, pathTaken: "template" },
    ...overrides,
  }
}

function triage(source: "text-layer" | "scanned"): TriageResult {
  return {
    source,
    pageCount: 1,
    totalChars: source === "text-layer" ? 500 : 0,
    avgCharsPerPage: source === "text-layer" ? 500 : 0,
    textLayerPageRatio: source === "text-layer" ? 1 : 0,
    pages: [{ pageNumber: 1, text: source === "text-layer" ? "Πίνακας Καλύψεων" : "", charCount: source === "text-layer" ? 16 : 0 }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  m.taxonomyFindMany.mockResolvedValue([{ key: "motor.theft", nameEl: "Κλοπή", nameEn: "Theft" }])
  m.envelopeFindMany.mockResolvedValue([])
})

describe("deriveLineOfBusiness", () => {
  it("picks the dominant taxonomy-key prefix", () => {
    expect(
      deriveLineOfBusiness(
        extraction({
          coverages: [
            { taxonomyKey: "motor.fire", exclusions: [], confidence: 1, source: "regex" },
            { taxonomyKey: "motor.theft", exclusions: [], confidence: 1, source: "regex" },
            { taxonomyKey: "health.x", exclusions: [], confidence: 1, source: "regex" },
          ],
        }),
      ),
    ).toBe("motor")
  })

  it("returns null when there are no coverages", () => {
    expect(deriveLineOfBusiness(extraction({ coverages: [] }))).toBeNull()
  })
})

describe("runIngestionPipeline", () => {
  it("serves a cache hit without re-extracting and builds gaps from the envelope", async () => {
    m.getOrExtract.mockImplementation(async (_hash: string, _factory: () => Promise<ExtractionResult>) =>
      extraction({ requiresReview: true }),
    )
    m.envelopeFindMany.mockResolvedValue([
      {
        id: "env1",
        lineOfBusiness: "motor",
        version: 1,
        profileSegment: "",
        expectations: [{ taxonomyKey: "motor.theft", severityIfMissing: "critical" }],
      },
    ])

    const out = await runIngestionPipeline(Buffer.from("x"), { lineOfBusiness: "motor" })

    expect(out.fromCache).toBe(true)
    expect(m.triagePdf).not.toHaveBeenCalled()
    // motor.theft is expected but absent → one explained gap.
    expect(out.gaps).toHaveLength(1)
    expect(out.gaps[0].gap.kind).toBe("missing")
    expect(out.gaps[0].explanation.title.el).toContain("Κλοπή")
    // low-confidence extraction → Sentry warning.
    expect(m.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("flagged for review"),
      expect.objectContaining({ level: "warning" }),
    )
  })

  it("routes a text-layer PDF through the local path (no OCR)", async () => {
    m.getOrExtract.mockImplementation(async (_h: string, factory: () => Promise<ExtractionResult>) => factory())
    m.triagePdf.mockResolvedValue(triage("text-layer"))
    m.extractFields.mockResolvedValue(extraction())

    const out = await runIngestionPipeline(Buffer.from("x"), { lineOfBusiness: "motor" })

    expect(out.fromCache).toBe(false)
    expect(m.extractScannedTextFromPdf).not.toHaveBeenCalled()
    expect(m.extractFields).toHaveBeenCalledOnce()
  })

  it("routes a scanned PDF through OCR and instruments it", async () => {
    m.getOrExtract.mockImplementation(async (_h: string, factory: () => Promise<ExtractionResult>) => factory())
    m.triagePdf.mockResolvedValue(triage("scanned"))
    m.extractScannedTextFromPdf.mockResolvedValue({
      source: "scanned",
      pageCount: 1,
      fullText: "ΕΘΝΙΚΗ",
      coverageTablePages: [1],
      coverageText: "ΕΘΝΙΚΗ",
      pages: [{ pageNumber: 1, text: "ΕΘΝΙΚΗ", charCount: 6 }],
    })
    m.extractFields.mockResolvedValue(extraction({ source: "scanned", pathTaken: "ocr" }))

    await runIngestionPipeline(Buffer.from("x"), { lineOfBusiness: "motor" })

    expect(m.extractScannedTextFromPdf).toHaveBeenCalledOnce()
    expect(m.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("scanned/OCR path"),
      expect.objectContaining({ level: "info" }),
    )
  })

  it("captures extraction failures to Sentry and rethrows", async () => {
    m.getOrExtract.mockImplementation(async (_h: string, factory: () => Promise<ExtractionResult>) => factory())
    m.triagePdf.mockRejectedValue(new Error("corrupt pdf"))

    await expect(runIngestionPipeline(Buffer.from("x"), { lineOfBusiness: "motor" })).rejects.toThrow("corrupt pdf")
    expect(m.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: expect.objectContaining({ stage: "ingestion-extraction" }) }),
    )
  })
})
