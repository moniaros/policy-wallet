/**
 * WP-06 — home cover is checked against a real taxonomy, deterministically.
 *
 * The gap engine had no per-branch coverage model, so findings for a home
 * policy were whatever the model volunteered from a loose prompt. The one thing
 * a Greek homeowner most needs told — that **earthquake cover is usually NOT
 * automatic** and is a priced optional extension — depended on the model
 * choosing to mention it that run.
 *
 * Every entry is taken from the product's own documented branch content
 * (docs/product/LOB_CONTENT.md, «Κατοικία») rather than invented, and the
 * checks are deterministic: the same policy yields the same finding every time,
 * so a mortgage-critical gap cannot be missed because a completion was unlucky.
 */
import { describe, expect, it } from "vitest"
import {
    HOME_COVERAGES,
    detectHomeCoverages,
    detectHomeCoverageGaps,
} from "@/lib/insurance/home-coverage-taxonomy"

/** A policy listing every expected cover, in Greek. */
const FULL_COVER = [
    "Πυρκαγιά και κεραυνός",
    "Σεισμός",
    "Πλημμύρα",
    "Καιρικά φαινόμενα και χαλάζι",
    "Κλοπή μετά από διάρρηξη",
    "Ζημιές από σωληνώσεις νερού",
    "Ασφάλιση κτιρίου",
    "Ασφάλιση περιεχομένου",
]

describe("home coverage taxonomy", () => {
    it("models the covers the product already commits to explaining", () => {
        const keys = HOME_COVERAGES.map((c) => c.key)
        for (const expected of ["fire", "earthquake", "flood", "theft", "contents"]) {
            expect(keys).toContain(expected)
        }
    })

    it("finds nothing missing in a fully covered policy", () => {
        expect(detectHomeCoverageGaps(FULL_COVER)).toEqual([])
    })

    it("flags a missing earthquake extension — the defining Greek home gap", () => {
        const withoutQuake = FULL_COVER.filter((c) => !c.includes("Σεισμός"))
        const gaps = detectHomeCoverageGaps(withoutQuake)

        expect(gaps.map((g) => g.key)).toEqual(["earthquake"])
        expect(gaps[0].reason.el).toMatch(/ΔΕΝ είναι αυτόματη/)
    })

    it("raises earthquake to critical when the home is mortgaged", () => {
        // A lender normally requires active fire/earthquake cover for the life
        // of the loan, so absence is a probable breach, not just a risk.
        const withoutQuake = FULL_COVER.filter((c) => !c.includes("Σεισμός"))

        expect(detectHomeCoverageGaps(withoutQuake, { hasMortgage: true })[0].severity).toBe("critical")
        expect(detectHomeCoverageGaps(withoutQuake, { hasMortgage: false })[0].severity).toBe("high")
    })

    it("flags building-only cover, where the contents are unprotected", () => {
        const buildingOnly = FULL_COVER.filter((c) => !c.includes("περιεχομένου"))
        const gaps = detectHomeCoverageGaps(buildingOnly)

        expect(gaps.map((g) => g.key)).toContain("contents")
        expect(gaps.find((g) => g.key === "contents")!.reason.el).toMatch(/χωρίς προστασία/)
    })

    it("matches Greek text regardless of accents", () => {
        // Extracted policy text is inconsistently accented; a taxonomy that only
        // matches one form would report absent cover that is plainly present.
        expect(detectHomeCoverages(["ΣΕΙΣΜΟΣ"]).has("earthquake")).toBe(true)
        expect(detectHomeCoverages(["σεισμός"]).has("earthquake")).toBe(true)
        expect(detectHomeCoverages(["Σεισμου"]).has("earthquake")).toBe(true)
    })

    it("matches English coverage text too, for translated extractions", () => {
        expect(detectHomeCoverages(["Earthquake cover"]).has("earthquake")).toBe(true)
        expect(detectHomeCoverages(["Theft and burglary"]).has("theft")).toBe(true)
    })

    it("reports every expected cover as missing for an empty policy", () => {
        const gaps = detectHomeCoverageGaps([])
        const expectedCount = HOME_COVERAGES.filter((c) => c.expected).length

        expect(gaps).toHaveLength(expectedCount)
    })

    it("is deterministic — the same input always gives the same findings", () => {
        const input = FULL_COVER.filter((c) => !c.includes("Πλημμύρα"))
        const first = JSON.stringify(detectHomeCoverageGaps(input))

        for (let i = 0; i < 5; i += 1) {
            expect(JSON.stringify(detectHomeCoverageGaps(input))).toBe(first)
        }
    })
})
