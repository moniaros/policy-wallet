/**
 * WP-05 — the structured Greek motor coverage map, deterministically.
 *
 * The properties that matter:
 *
 *  - The three absences the product commits to naming — liability (the
 *    compulsory legal minimum for driving in Greece), theft, legal protection
 *    (docs/product/LOB_CONTENT.md, «Αυτοκίνητο») — are reported, at the right
 *    severities.
 *  - Tier honesty: a third-party policy without own-damage cover is NOT
 *    defective; that absence is the tier. Optional covers are detected so a
 *    surface can state what exists, but never reported missing. Telling every
 *    holder of an απλή policy that their cover has holes would teach them to
 *    ignore the product — and cross the line into selling.
 *  - The taxonomy complements, and does not contradict, the existing tier
 *    classifier (lib/wallet/motor-coverage-tier.ts): «μικτή» evidences
 *    own-damage cover here for exactly the reason it classifies as
 *    comprehensive there.
 */
import { describe, expect, it } from "vitest"
import {
    MOTOR_COVERAGES,
    detectMotorCoverages,
    detectMotorCoverageGaps,
} from "@/lib/insurance/motor-coverage-taxonomy"
import { classifyMotorCoverageTier } from "@/lib/wallet/motor-coverage-tier"

/** A comprehensive (μικτή) policy, in Greek, as extraction would render it. */
const COMPREHENSIVE = [
    "Αστική ευθύνη έναντι τρίτων",
    "Ίδιες ζημίες (μικτή)",
    "Πυρκαγιά",
    "Ολική και μερική κλοπή",
    "Φυσικά φαινόμενα και χαλάζι",
    "Θραύση κρυστάλλων",
    "Οδική βοήθεια",
    "Νομική προστασία",
    "Προσωπικό ατύχημα οδηγού",
    "Ανασφάλιστο όχημα",
]

/** The legal minimum: liability only. */
const THIRD_PARTY_ONLY = ["Αστική ευθύνη έναντι τρίτων", "Νομική προστασία", "Κλοπή"]

describe("motor coverage taxonomy", () => {
    it("models the covers of the WP-05 map", () => {
        const keys = MOTOR_COVERAGES.map((c) => c.key)
        for (const expected of [
            "liability", "own_damage", "fire", "theft", "weather",
            "glass", "roadside", "legal", "driver_accident", "uninsured_vehicle",
        ]) {
            expect(keys).toContain(expected)
        }
    })

    it("finds nothing missing in a full μικτή policy", () => {
        expect(detectMotorCoverageGaps(COMPREHENSIVE)).toEqual([])
    })

    it("does not report a bare third-party policy as defective", () => {
        // The absence of own damage, fire, glass etc. IS the tier — priced
        // accordingly and chosen deliberately. Nothing to report.
        expect(detectMotorCoverageGaps(THIRD_PARTY_ONLY)).toEqual([])
    })

    it("flags missing theft cover — the branch's first documented gap", () => {
        const noTheft = COMPREHENSIVE.filter((c) => !c.includes("κλοπή") && !c.includes("Κλοπή"))
        const gaps = detectMotorCoverageGaps(noTheft)

        expect(gaps.map((g) => g.key)).toEqual(["theft"])
        expect(gaps[0].severity).toBe("high")
        expect(gaps[0].reason.el).toMatch(/βασικά συμβόλαια/)
    })

    it("flags missing legal protection at medium", () => {
        const noLegal = COMPREHENSIVE.filter((c) => !c.includes("Νομική"))
        const gaps = detectMotorCoverageGaps(noLegal)

        expect(gaps.map((g) => g.key)).toEqual(["legal"])
        expect(gaps[0].severity).toBe("medium")
    })

    it("treats absent liability as critical — it is the legal minimum", () => {
        const noLiability = ["Ίδιες ζημίες", "Κλοπή", "Νομική προστασία"]
        const gaps = detectMotorCoverageGaps(noLiability)

        expect(gaps.map((g) => g.key)).toEqual(["liability"])
        expect(gaps[0].severity).toBe("critical")
        expect(gaps[0].reason.el).toMatch(/υποχρεωτική/)
    })

    it("reads μικτή as evidence of own-damage cover, agreeing with the tier classifier", () => {
        expect(detectMotorCoverages(["Μικτή ασφάλεια"]).has("own_damage")).toBe(true)
        expect(classifyMotorCoverageTier("Μικτή ασφάλεια")).toBe("comprehensive")
    })

    it("matches Greek text regardless of accents and case", () => {
        expect(detectMotorCoverages(["ΑΣΤΙΚΗ ΕΥΘΥΝΗ"]).has("liability")).toBe(true)
        expect(detectMotorCoverages(["Θραύση κρυστάλλων"]).has("glass")).toBe(true)
        expect(detectMotorCoverages(["θραυση κρυσταλλων"]).has("glass")).toBe(true)
        expect(detectMotorCoverages(["Ανασφάλιστου οχήματος"]).has("uninsured_vehicle")).toBe(true)
    })

    it("matches English coverage text too, for translated extractions", () => {
        expect(detectMotorCoverages(["Third-party liability"]).has("liability")).toBe(true)
        expect(detectMotorCoverages(["Windscreen glass breakage"]).has("glass")).toBe(true)
        expect(detectMotorCoverages(["Roadside assistance included"]).has("roadside")).toBe(true)
    })

    it("only ever reports the three documented absences", () => {
        const expectedKeys = MOTOR_COVERAGES.filter((c) => c.expected).map((c) => c.key)

        expect(expectedKeys.sort()).toEqual(["legal", "liability", "theft"])
        for (const gap of detectMotorCoverageGaps([])) {
            expect(expectedKeys).toContain(gap.key)
        }
    })

    it("is deterministic — the same input always gives the same findings", () => {
        const input = THIRD_PARTY_ONLY.slice(0, 1)
        const first = JSON.stringify(detectMotorCoverageGaps(input))

        for (let i = 0; i < 5; i += 1) {
            expect(JSON.stringify(detectMotorCoverageGaps(input))).toBe(first)
        }
    })
})
