// @vitest-environment node
/**
 * Gate 2 — path + extraction tests against the real committed Greek fixtures.
 * The cost-guardrail negative assertion here: on the cheap (text-layer) path the
 * model resolver is NEVER invoked.
 */
import { describe, it, expect, vi } from "vitest"
import { triagePdf } from "@/lib/services/ingestion/triage"
import { extractLocalText } from "@/lib/services/ingestion/text-extraction"
import {
  extractFields,
  type ExtractionReferences,
  type FieldResolver,
} from "@/lib/services/ingestion/extraction"
import { readFixture, TEXT_LAYER_PDF, SCANNED_PDF } from "../helpers/fixtures"

const REFERENCES: ExtractionReferences = {
  insurers: [{ canonicalName: "Ασφάλειες Παράδειγμα Α.Ε.", aliases: ["ΑΣΦΑΛΕΙΕΣ ΠΑΡΑΔΕΙΓΜΑ"] }],
  taxonomy: [
    { key: "motor.civil_liability", lineOfBusiness: "motor", aliases: ["Αστική Ευθύνη"] },
    { key: "motor.fire", lineOfBusiness: "motor", aliases: ["Πυρκαγιά"] },
    { key: "motor.theft", lineOfBusiness: "motor", aliases: ["Κλοπή"] },
  ],
}

describe("P1 triage — routing (real fixtures)", () => {
  it("routes the text-layer fixture to the local path", async () => {
    const t = await triagePdf(await readFixture(TEXT_LAYER_PDF))
    expect(t.source).toBe("text-layer")
  }, 30000)

  it("routes the scanned fixture to the OCR path", async () => {
    const t = await triagePdf(await readFixture(SCANNED_PDF))
    expect(t.source).toBe("scanned")
  }, 30000)
})

describe("P2 local text path — extracts content with no external client", () => {
  it("pulls €50.000 + dd/mm/yyyy + the coverage table from the text-layer fixture", async () => {
    const t = await triagePdf(await readFixture(TEXT_LAYER_PDF))
    const raw = extractLocalText(t)
    expect(raw.source).toBe("text-layer")
    expect(raw.fullText).toContain("50.000")
    expect(raw.fullText).toMatch(/\d\d\/\d\d\/\d{4}/)
    expect(raw.coverageTablePages.length).toBeGreaterThan(0)
  }, 30000)
})

describe("P4 cost guardrail — model NOT called when the deterministic pass resolves", () => {
  it("extracts every field from the real fixture at $0 and never invokes the model resolver", async () => {
    const t = await triagePdf(await readFixture(TEXT_LAYER_PDF))
    const raw = extractLocalText(t)
    const resolver: FieldResolver = { resolve: vi.fn() }

    const result = await extractFields({
      raw,
      contentHash: "a".repeat(64),
      references: REFERENCES,
      resolver,
    })

    // The negative assertion: the model never fires on a fully-resolvable document.
    expect(resolver.resolve).not.toHaveBeenCalled()
    expect(result.pathTaken).not.toBe("model-fallback")
    expect(result.cost.costEur).toBe(0)
    expect(result.cost.model).toBeNull()

    // Sanity: the deterministic pass genuinely succeeded.
    expect(result.insurer.value).toContain("Παράδειγμα")
    expect(result.policyNumber.value).toBe("TEST-2026-0001")
    expect(result.premium.value).toBe(450)
    expect(result.startDate.value).toBe("2026-01-01")
    expect(result.endDate.value).toBe("2026-12-31")
  }, 30000)
})
