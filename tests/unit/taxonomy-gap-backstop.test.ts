/**
 * WP-05/WP-06 — the taxonomies are wired into the analysis flow as a backstop.
 *
 * Four branch taxonomies existed and nothing in the pipeline called them: the
 * findings a Greek policyholder most needs told still depended on a completion
 * choosing to mention them. This module is the wire, and these are the
 * properties that make it safe to run on every analysis:
 *
 *  - AI wins on overlap (the backstop only ADDS what the model left unsaid).
 *  - Confirmed absence (`notCovered`) is reported regardless of enumeration
 *    size; INFERRED absence (silence in `covered`) needs a substantial
 *    enumeration — a two-line summary that does not mention liability is not
 *    evidence a motor policy lacks liability.
 *  - A cover in both lists counts as covered: inventing a gap is the costlier
 *    error.
 */
import { describe, expect, it } from "vitest"
import {
    MIN_COVERED_FOR_INFERENCE,
    taxonomyBackstopGaps,
} from "@/lib/services/analysis/taxonomy-gap-backstop"

/** A substantial home enumeration missing earthquake. */
const HOME_NO_QUAKE = [
    "Πυρκαγιά",
    "Πλημμύρα",
    "Καιρικά φαινόμενα",
    "Κλοπή",
    "Ζημιές από σωληνώσεις",
    "Κτίριο",
    "Περιεχόμενο",
]

describe("taxonomy gap backstop", () => {
    it("adds the deterministic finding the AI left unsaid", () => {
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "home",
            covered: HOME_NO_QUAKE,
            notCovered: [],
            existingSlugs: [],
        })

        expect(gaps.map((g) => g.slug)).toEqual(["taxonomy_home_earthquake"])
        expect(gaps[0].explanationEl).toMatch(/ΔΕΝ είναι αυτόματη/)
        expect(gaps[0].severity).toBe("high")
    })

    it("adds nothing when the AI already reported the cover", () => {
        for (const aiSlug of ["home-earthquake", "missing_earthquake_coverage", "no_earthquake"]) {
            const gaps = taxonomyBackstopGaps({
                lineOfBusiness: "home",
                covered: HOME_NO_QUAKE,
                notCovered: [],
                existingSlugs: [aiSlug],
            })
            expect(gaps, `should dedupe against "${aiSlug}"`).toEqual([])
        }
    })

    it("does not infer absence from a thin enumeration", () => {
        // Two covered entries say the list is short, not that the policy
        // lacks everything else. This is explicitly_false's rule, upstream.
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "motor",
            covered: ["Μικτή ασφάλεια", "Οδική βοήθεια"],
            notCovered: [],
            existingSlugs: [],
        })

        expect(gaps).toEqual([])
        expect(MIN_COVERED_FOR_INFERENCE).toBeGreaterThan(2)
    })

    it("reports a confirmed absence even from a thin enumeration", () => {
        // The document itself says theft is not covered — that is evidence,
        // however short the covered list is.
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "motor",
            covered: ["Αστική ευθύνη"],
            notCovered: ["Κλοπή"],
            existingSlugs: [],
        })

        expect(gaps.map((g) => g.slug)).toEqual(["taxonomy_motor_theft"])
    })

    it("treats a cover named in both lists as covered", () => {
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "motor",
            covered: ["Αστική ευθύνη", "Κλοπή", "Νομική προστασία", "Πυρκαγιά"],
            notCovered: ["Κλοπή"],
            existingSlugs: [],
        })

        expect(gaps.map((g) => g.slug)).not.toContain("taxonomy_motor_theft")
    })

    it("routes child branches to their parent taxonomy", () => {
        const bike = taxonomyBackstopGaps({
            lineOfBusiness: "motorbike",
            covered: ["Αστική ευθύνη", "Πυρκαγιά", "Οδική βοήθεια", "Θραύση κρυστάλλων"],
            notCovered: [],
            existingSlugs: [],
        })
        // Theft and legal missing from a substantial motorbike enumeration —
        // reported under the MOTOR taxonomy, like everything else about bikes.
        expect(bike.map((g) => g.slug).sort()).toEqual([
            "taxonomy_motor_legal",
            "taxonomy_motor_theft",
        ])

        const renters = taxonomyBackstopGaps({
            lineOfBusiness: "renters",
            covered: HOME_NO_QUAKE,
            notCovered: [],
            existingSlugs: [],
        })
        expect(renters.map((g) => g.slug)).toEqual(["taxonomy_home_earthquake"])
    })

    it("escalates earthquake to critical on extractor evidence of a mortgage", () => {
        const withBank = taxonomyBackstopGaps({
            lineOfBusiness: "home",
            covered: HOME_NO_QUAKE,
            notCovered: [],
            acordData: { property: { mortgageeBank: "Εθνική Τράπεζα" } },
            existingSlugs: [],
        })
        const withoutBank = taxonomyBackstopGaps({
            lineOfBusiness: "home",
            covered: HOME_NO_QUAKE,
            notCovered: [],
            acordData: { property: {} },
            existingSlugs: [],
        })

        expect(withBank[0].severity).toBe("critical")
        expect(withoutBank[0].severity).toBe("high")
    })

    it("stays silent for branches without a taxonomy", () => {
        for (const lob of ["travel", "pet", "cyber", "business", "pension"]) {
            expect(
                taxonomyBackstopGaps({
                    lineOfBusiness: lob,
                    covered: ["Α", "Β", "Γ", "Δ"],
                    notCovered: [],
                    existingSlugs: [],
                })
            ).toEqual([])
        }
    })

    it("emits definition-ready names, not slug-mangled titles", () => {
        const [gap] = taxonomyBackstopGaps({
            lineOfBusiness: "home",
            covered: HOME_NO_QUAKE,
            notCovered: [],
            existingSlugs: [],
        })

        expect(gap.name).toBe("Earthquake — Home")
        expect(gap.explanationEn.length).toBeGreaterThan(20)
    })

    it("is deterministic across runs", () => {
        const input = {
            lineOfBusiness: "home",
            covered: HOME_NO_QUAKE,
            notCovered: ["Σεισμός"],
            existingSlugs: [],
        }
        const first = JSON.stringify(taxonomyBackstopGaps(input))

        for (let i = 0; i < 5; i += 1) {
            expect(JSON.stringify(taxonomyBackstopGaps(input))).toBe(first)
        }
    })
})
