/**
 * WP-06 — health cover checked against a real taxonomy, deterministically.
 *
 * Third branch on the template the home taxonomy proved. The defining Greek
 * health gap the product commits to naming is the hospital-only programme:
 * «Πολλά νοσοκομειακά προγράμματα δεν καλύπτουν ιατρικές επισκέψεις και
 * διαγνωστικές εξετάσεις εκτός νοσηλείας» (docs/product/LOB_CONTENT.md,
 * «Υγεία»).
 *
 * The golden input here is real: the coverage summary of an actual Εθνική Full
 * Health policy (tests/fixtures/health-ethniki-1.ts, identity synthetic). A
 * taxonomy that misreads the one real health policy in the repo has no
 * business shipping.
 */
import { describe, expect, it } from "vitest"
import {
    HEALTH_COVERAGES,
    detectHealthCoverages,
    detectHealthCoverageGaps,
} from "@/lib/insurance/health-coverage-taxonomy"
import { HEALTH_ETHNIKI_1 } from "../fixtures/health-ethniki-1"

/** A rich individual programme, in Greek, covering everything modelled. */
const FULL_COVER = [
    "Νοσοκομειακή περίθαλψη έως 1.500.000 €",
    "Εξωνοσοκομειακή περίθαλψη και ιατρικές επισκέψεις",
    "Διαγνωστικές εξετάσεις σε συμβεβλημένο δίκτυο",
    "Ετήσιος προληπτικός έλεγχος (check-up)",
    "Δεύτερη ιατρική γνώμη",
    "Επείγοντα περιστατικά",
]

describe("health coverage taxonomy", () => {
    it("models the benefits the product already commits to explaining", () => {
        const keys = HEALTH_COVERAGES.map((c) => c.key)
        for (const expected of ["hospital", "outpatient", "diagnostics", "checkup", "emergency"]) {
            expect(keys).toContain(expected)
        }
    })

    it("finds nothing missing in a fully covered programme", () => {
        expect(detectHealthCoverageGaps(FULL_COVER)).toEqual([])
    })

    it("flags the hospital-only programme — the defining Greek health gap", () => {
        const hospitalOnly = ["Νοσοκομειακή περίθαλψη έως 500.000 €"]
        const gaps = detectHealthCoverageGaps(hospitalOnly)

        expect(gaps.map((g) => g.key)).toEqual(["outpatient"])
        expect(gaps[0].reason.el).toMatch(/εκτός νοσηλείας/)
    })

    it("does not invent an outpatient gap when diagnostics are covered", () => {
        // The documented gap is programmes covering NEITHER visits NOR
        // out-of-hospital diagnostics. Diagnostics evidence is the half text
        // can prove — claiming "no outpatient cover" over it would be false.
        const withDiagnostics = [
            "Νοσοκομειακή περίθαλψη",
            "Διαγνωστικές εξετάσεις στο δίκτυο AFFIDEA",
        ]

        expect(detectHealthCoverageGaps(withDiagnostics)).toEqual([])
    })

    it("reads the real Εθνική Full Health summary correctly", () => {
        const present = detectHealthCoverages([HEALTH_ETHNIKI_1.coverageSummary!])

        expect(present.has("hospital")).toBe(true)
        expect(present.has("diagnostics")).toBe(true)
        expect(present.has("emergency")).toBe(true)
        // And therefore reports no gap: hospital care is present, and the
        // diagnostics evidence suppresses the outpatient finding.
        expect(detectHealthCoverageGaps([HEALTH_ETHNIKI_1.coverageSummary!])).toEqual([])
    })

    it("flags a policy with no hospital benefit at all", () => {
        const outpatientOnly = ["Εξωνοσοκομειακή περίθαλψη και διαγνωστικές εξετάσεις"]
        const gaps = detectHealthCoverageGaps(outpatientOnly)

        expect(gaps.map((g) => g.key)).toEqual(["hospital"])
        expect(gaps[0].severity).toBe("high")
    })

    it("matches Greek text regardless of accents and case", () => {
        expect(detectHealthCoverages(["ΝΟΣΟΚΟΜΕΙΑΚΗ ΠΕΡΙΘΑΛΨΗ"]).has("hospital")).toBe(true)
        expect(detectHealthCoverages(["νοσηλεία"]).has("hospital")).toBe(true)
        expect(detectHealthCoverages(["Διαγνωστικών εξετάσεων"]).has("diagnostics")).toBe(true)
    })

    it("never reads «εξωνοσοκομειακή» as evidence of hospital cover", () => {
        // The Greek word for OUT-of-hospital cover contains the word for
        // hospital cover as a substring. Misreading it would invent the one
        // benefit whose absence is the highest-severity finding here.
        const outpatientWorded = detectHealthCoverages(["Εξωνοσοκομειακή περίθαλψη"])

        expect(outpatientWorded.has("outpatient")).toBe(true)
        expect(outpatientWorded.has("hospital")).toBe(false)
        expect(detectHealthCoverages(["Out-of-hospital diagnostics"]).has("hospital")).toBe(false)
    })

    it("matches English coverage text too, for translated extractions", () => {
        expect(detectHealthCoverages(["Inpatient hospital care"]).has("hospital")).toBe(true)
        expect(detectHealthCoverages(["Annual check-up included"]).has("checkup")).toBe(true)
    })

    it("keeps optional benefits out of the findings", () => {
        // A programme without a wellness perk is not defective. Only the two
        // documented absences may ever be reported.
        const expectedKeys = HEALTH_COVERAGES.filter((c) => c.expected).map((c) => c.key)

        expect(expectedKeys.sort()).toEqual(["hospital", "outpatient"])
        for (const gap of detectHealthCoverageGaps([])) {
            expect(expectedKeys).toContain(gap.key)
        }
    })

    it("is deterministic — the same input always gives the same findings", () => {
        const input = ["Νοσοκομειακή περίθαλψη"]
        const first = JSON.stringify(detectHealthCoverageGaps(input))

        for (let i = 0; i < 5; i += 1) {
            expect(JSON.stringify(detectHealthCoverageGaps(input))).toBe(first)
        }
    })
})
