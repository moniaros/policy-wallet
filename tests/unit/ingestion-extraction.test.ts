import { describe, it, expect, vi } from "vitest"
import {
  extractFields,
  type ExtractionReferences,
  type FieldResolver,
} from "@/lib/services/ingestion/extraction"
import type { RawTextExtraction } from "@/lib/services/ingestion/text-extraction"

const REFERENCES: ExtractionReferences = {
  insurers: [{ canonicalName: "Εθνική Ασφαλιστική", aliases: ["ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ", "Εθνική"] }],
  taxonomy: [
    { key: "motor.civil_liability", lineOfBusiness: "motor", aliases: ["Αστική Ευθύνη"] },
    { key: "motor.fire", lineOfBusiness: "motor", aliases: ["Πυρκαγιά"] },
  ],
}

const HASH = "a".repeat(64)

function rawText(fullText: string, coverageText = ""): RawTextExtraction {
  return {
    source: "text-layer",
    pageCount: 1,
    fullText,
    coverageTablePages: [],
    coverageText: coverageText || fullText,
    pages: [{ pageNumber: 1, text: fullText, charCount: fullText.length }],
  }
}

const FULL_POLICY = [
  "ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ",
  "Αριθμός Συμβολαίου: AB-123456",
  "Διάρκεια ασφάλισης από 01/01/2026 έως 31/12/2026",
  "Συνολικό Ασφάλιστρο: €450,00",
  "Αστική Ευθύνη 1.300.000",
  "Πυρκαγιά 50.000",
].join("\n")

describe("extractFields — deterministic only ($0)", () => {
  it("extracts every field from a clean Greek text-layer policy without a model", async () => {
    const r = await extractFields({
      raw: rawText(FULL_POLICY),
      contentHash: HASH,
      references: REFERENCES,
    })

    expect(r.insurer.value).toBe("Εθνική Ασφαλιστική")
    expect(r.insurer.source).toBe("template")
    expect(r.policyNumber.value).toBe("AB-123456")
    expect(r.premium.value).toBe(450)
    expect(r.startDate.value).toBe("2026-01-01")
    expect(r.endDate.value).toBe("2026-12-31")
    expect(r.coverages.map((c) => c.taxonomyKey).sort()).toEqual([
      "motor.civil_liability",
      "motor.fire",
    ])

    // $0: no model used → template path, zero cost, not flagged for review.
    expect(r.pathTaken).toBe("template")
    expect(r.cost.costEur).toBe(0)
    expect(r.cost.model).toBeNull()
    expect(r.requiresReview).toBe(false)
    expect(r.contentHash).toBe(HASH)
    expect(r.source).toBe("text-layer")
  })

  it("never calls the model when deterministic extraction suffices", async () => {
    const resolver: FieldResolver = { resolve: vi.fn() }
    const r = await extractFields({
      raw: rawText(FULL_POLICY),
      contentHash: HASH,
      references: REFERENCES,
      resolver,
    })
    expect(resolver.resolve).not.toHaveBeenCalled()
    expect(r.pathTaken).toBe("template")
  })

  it("flags low-confidence extractions for review with safe placeholders", async () => {
    const r = await extractFields({
      raw: rawText("κείμενο χωρίς αναγνωρίσιμα στοιχεία"),
      contentHash: HASH,
      references: REFERENCES,
    })
    expect(r.insurer.value).toBe("Άγνωστος ασφαλιστής") // placeholder, never null/"Unknown"
    expect(r.policyNumber.value).toBe("")
    expect(r.premium.value).toBe(0)
    expect(r.requiresReview).toBe(true)
  })
})

describe("extractFields — model fallback for the ambiguous remainder", () => {
  it("calls the resolver ONLY for missing fields and attributes them to the model", async () => {
    // Text the regex can't parse → everything missing.
    const resolver: FieldResolver = {
      resolve: vi.fn(async ({ missing }) => {
        expect(missing).toContain("policyNumber")
        expect(missing).toContain("insurerName")
        return {
          fields: {
            insurerName: "Generali",
            policyNumber: "X-999",
            premium: 600,
            startDate: "2026-02-01",
            endDate: "2027-01-31",
          },
          usage: { inputTokens: 1200, outputTokens: 80, model: "gemini-2.0-flash", costEur: 0.0001 },
        }
      }),
    }

    const r = await extractFields({
      raw: rawText("scanned blob with no parseable Greek fields"),
      contentHash: HASH,
      references: REFERENCES,
      resolver,
    })

    expect(resolver.resolve).toHaveBeenCalledOnce()
    expect(r.insurer.value).toBe("Generali")
    expect(r.insurer.source).toBe("model")
    expect(r.policyNumber.value).toBe("X-999")
    expect(r.premium.value).toBe(600)
    expect(r.pathTaken).toBe("model-fallback")
    expect(r.cost.model).toBe("gemini-2.0-flash")
    expect(r.cost.costEur).toBeCloseTo(0.0001)
    expect(r.cost.totalTokens).toBe(1280)
  })
})
