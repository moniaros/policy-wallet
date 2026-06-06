import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  explainGap,
  formatEur,
  clearExplanationCache,
  makeTaxonomyNameLookup,
  type TaxonomyNameLookup,
} from "@/lib/services/ingestion/gap-explanations"
import type { Gap } from "@/lib/services/ingestion/contracts"

function gap(o: Partial<Gap> & Pick<Gap, "taxonomyKey" | "kind">): Gap {
  return {
    severity: "recommended",
    reason: `${o.kind}:${o.taxonomyKey}`,
    ...o,
  }
}

const FIRE: TaxonomyNameLookup = (k) =>
  k === "motor.fire" ? { el: "Πυρκαγιά", en: "Fire" } : null

beforeEach(() => clearExplanationCache())

describe("formatEur", () => {
  it("formats with Greek thousands separators", () => {
    expect(formatEur(50_000)).toBe("€50.000")
    expect(formatEur(1_300_000)).toBe("€1.300.000")
    expect(formatEur(450)).toBe("€450")
  })
})

describe("explainGap", () => {
  it("renders a bilingual 'missing' explanation with the coverage name", () => {
    const e = explainGap(gap({ taxonomyKey: "motor.fire", kind: "missing", severity: "critical" }), FIRE)
    expect(e.gapType).toBe("missing:motor.fire")
    expect(e.title.el).toBe("Λείπει κάλυψη: Πυρκαγιά")
    expect(e.title.en).toBe("Missing coverage: Fire")
    expect(e.body.el).toContain("Πυρκαγιά")
    expect(e.suggestion.en).toContain("Fire")
  })

  it("fills the actual/expected amounts (Greek-formatted) for under_limit", () => {
    const e = explainGap(
      gap({ taxonomyKey: "motor.fire", kind: "under_limit", actual: 30_000, expected: 50_000 }),
      FIRE,
    )
    expect(e.body.el).toContain("€30.000")
    expect(e.body.el).toContain("€50.000")
    expect(e.body.en).toContain("€30.000")
    expect(e.suggestion.en).toContain("€50.000")
  })

  it("handles high_deductible and excluded kinds", () => {
    const hd = explainGap(
      gap({ taxonomyKey: "motor.fire", kind: "high_deductible", actual: 1_000, expected: 500 }),
      FIRE,
    )
    expect(hd.title.en).toBe("High deductible: Fire")
    expect(hd.body.en).toContain("€1.000")

    const ex = explainGap(gap({ taxonomyKey: "motor.fire", kind: "excluded" }), FIRE)
    expect(ex.title.el).toBe("Εξαίρεση σε κάλυψη: Πυρκαγιά")
  })

  it("falls back to a safe placeholder name when the taxonomy key is unknown", () => {
    const e = explainGap(gap({ taxonomyKey: "weird.unknown", kind: "missing" }), () => null)
    expect(e.title.el).toContain("η συγκεκριμένη κάλυψη")
    expect(e.title.en).toContain("the specified coverage")
  })

  it("generates once and caches by gap-type, filling amounts per instance", () => {
    const lookup = vi.fn(FIRE)
    const g1 = gap({ taxonomyKey: "motor.fire", kind: "under_limit", actual: 30_000, expected: 50_000 })
    const g2 = gap({ taxonomyKey: "motor.fire", kind: "under_limit", actual: 20_000, expected: 50_000 })

    explainGap(g1, lookup)
    const e2 = explainGap(g2, lookup)

    // Same gap-type → the name is looked up / templated exactly once...
    expect(lookup).toHaveBeenCalledTimes(1)
    // ...but each instance still renders its own amount.
    expect(e2.body.el).toContain("€20.000")
  })

  it("generates the template ONCE per gap-type across N repeated requests (cost guardrail)", () => {
    // The lookup is consulted only on a cache miss — i.e. once per gap-type generation.
    const generator = vi.fn(FIRE)
    const g = gap({ taxonomyKey: "motor.fire", kind: "missing", severity: "critical" })
    explainGap(g, generator)
    explainGap(g, generator)
    explainGap(g, generator)
    expect(generator).toHaveBeenCalledTimes(1)
  })
})

describe("makeTaxonomyNameLookup", () => {
  it("builds a key -> name lookup from taxonomy rows", () => {
    const lookup = makeTaxonomyNameLookup([
      { key: "motor.fire", nameEl: "Πυρκαγιά", nameEn: "Fire" },
    ])
    expect(lookup("motor.fire")).toEqual({ el: "Πυρκαγιά", en: "Fire" })
    expect(lookup("missing.key")).toBeNull()
  })
})
