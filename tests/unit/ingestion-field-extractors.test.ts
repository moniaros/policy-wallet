import { describe, it, expect } from "vitest"
import {
  extractPolicyNumber,
  extractPremium,
  extractDates,
  normalizeInsurer,
  parseCoverages,
  UNKNOWN_INSURER_PLACEHOLDER,
  type InsurerAlias,
  type TaxonomyEntry,
} from "@/lib/services/ingestion/field-extractors"

const POLICY_TEXT = [
  "ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ",
  "Αριθμός Συμβολαίου: AB-123456",
  "Διάρκεια ασφάλισης από 01/01/2026 έως 31/12/2026",
  "Συνολικό Ασφάλιστρο: €450,00",
].join("\n")

const INSURERS: InsurerAlias[] = [
  { canonicalName: "Εθνική Ασφαλιστική", aliases: ["ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ", "Εθνική"] },
]

const TAXONOMY: TaxonomyEntry[] = [
  { key: "motor.civil_liability", lineOfBusiness: "motor", aliases: ["Αστική Ευθύνη"] },
  { key: "motor.fire", lineOfBusiness: "motor", aliases: ["Πυρκαγιά"] },
]

describe("extractPolicyNumber", () => {
  it("reads the policy number after a Greek label", () => {
    expect(extractPolicyNumber(POLICY_TEXT)?.value).toBe("AB-123456")
  })
  it("returns null when absent", () => {
    expect(extractPolicyNumber("no number here")).toBeNull()
  })
})

describe("extractPremium", () => {
  it("parses the total premium (Greek comma decimal)", () => {
    const p = extractPremium(POLICY_TEXT)
    expect(p?.value).toBe(450)
    expect(p?.confidence).toBeGreaterThan(0.8) // 'Συνολικό Ασφάλιστρο' is the strong label
  })
  it("parses a thousands-formatted premium", () => {
    expect(extractPremium("Συνολικό Ασφάλιστρο: €1.250")?.value).toBe(1250)
  })
})

describe("extractDates", () => {
  it("parses a Greek από/έως date range", () => {
    const d = extractDates(POLICY_TEXT)
    expect(d.startDate?.value).toBe("2026-01-01")
    expect(d.endDate?.value).toBe("2026-12-31")
  })
})

describe("normalizeInsurer", () => {
  it("resolves a known insurer via aliases (accent/case-insensitive)", () => {
    const r = normalizeInsurer(POLICY_TEXT, INSURERS)
    expect(r.value).toBe("Εθνική Ασφαλιστική")
    expect(r.source).toBe("template")
    expect(r.confidence).toBeGreaterThan(0.9)
  })
  it("never surfaces 'Unknown' — returns a safe labelled placeholder", () => {
    const r = normalizeInsurer("κείμενο χωρίς ασφαλιστή", INSURERS)
    expect(r.value).toBe(UNKNOWN_INSURER_PLACEHOLDER)
    expect(r.confidence).toBe(0)
  })
})

describe("parseCoverages", () => {
  it("maps Greek coverage rows to taxonomy keys with parsed limits", () => {
    const coverageText = "Αστική Ευθύνη 1.300.000\nΠυρκαγιά 50.000\nΆσχετη γραμμή"
    const covs = parseCoverages(coverageText, TAXONOMY)
    const byKey = Object.fromEntries(covs.map((c) => [c.taxonomyKey, c]))
    expect(byKey["motor.civil_liability"].limit).toBe(1_300_000)
    expect(byKey["motor.fire"].limit).toBe(50_000)
    expect(covs).toHaveLength(2)
  })
})
