/**
 * WP-06 — the life taxonomy claims the least, on purpose.
 *
 * The life branch's three documented gaps (mortgage without life cover,
 * dependents without protection, no income protection) are PORTFOLIO
 * questions, already detected deterministically by profile-gap-rules.ts. A
 * text taxonomy that re-reported them from policy silence would double-report
 * the same gap with weaker evidence. Beneficiaries and sum adequacy are an
 * ACORD array and a numeric comparison — text can prove neither.
 *
 * What text CAN prove: which riders the policy evidences, and whether the core
 * death benefit is evidenced at all. Only that absence is a finding.
 */
import { describe, expect, it } from "vitest"
import {
    LIFE_COVERAGES,
    detectLifeCoverages,
    detectLifeCoverageGaps,
} from "@/lib/insurance/life-coverage-taxonomy"
import { PROFILE_GAP_RULES, detectProfileGaps } from "@/lib/services/gap-engine/profile-gap-rules"

const FULL_COVER = [
    "Κεφάλαιο ζωής 150.000 € (ασφάλισμα)",
    "Μόνιμη ολική ανικανότητα από ασθένεια",
    "Σοβαρές ασθένειες",
    "Απώλεια εισοδήματος",
    "Απαλλαγή πληρωμής ασφαλίστρων",
]

describe("life coverage taxonomy", () => {
    it("models the riders the product commits to reading", () => {
        const keys = LIFE_COVERAGES.map((c) => c.key)
        for (const expected of [
            "death_benefit", "disability", "critical_illness", "income_loss", "premium_waiver",
        ]) {
            expect(keys).toContain(expected)
        }
    })

    it("finds nothing missing in a fully covered policy", () => {
        expect(detectLifeCoverageGaps(FULL_COVER)).toEqual([])
    })

    it("only the death benefit is ever a text finding", () => {
        // The riders are detected, never demanded — whether someone NEEDS
        // disability or income cover is the profile rules' question.
        const expectedKeys = LIFE_COVERAGES.filter((c) => c.expected).map((c) => c.key)

        expect(expectedKeys).toEqual(["death_benefit"])
    })

    it("flags a life policy with no evidence of a death benefit", () => {
        const ridersOnly = ["Σοβαρές ασθένειες", "Απαλλαγή πληρωμής ασφαλίστρων"]
        const gaps = detectLifeCoverageGaps(ridersOnly)

        expect(gaps.map((g) => g.key)).toEqual(["death_benefit"])
        expect(gaps[0].severity).toBe("high")
        expect(gaps[0].reason.el).toMatch(/πρωτότυπο έγγραφο/)
    })

    it("does not duplicate the documented portfolio gaps", () => {
        // mortgage_no_life, dependents_no_life and income_no_protection are
        // profile rules. If the taxonomy ever grows same-named findings, the
        // same gap surfaces twice from two engines. Both halves are asserted:
        // the rules exist THERE, and the taxonomy's vocabulary excludes them.
        const ruleIds = PROFILE_GAP_RULES.map((rule) => rule.id)
        for (const documented of ["mortgage_no_life", "dependents_no_life", "income_no_protection"]) {
            expect(ruleIds).toContain(documented)
            expect(LIFE_COVERAGES.map((c) => c.key)).not.toContain(documented)
        }

        // And the engine genuinely fires one of them for a mortgaged profile
        // with no life policy — the rules are live, not decorative.
        const fired = detectProfileGaps(
            {
                maritalStatus: null, dependentsCount: 2, employmentStatus: "employed",
                ownsHome: true, mortgageAmount: 120000, hasPets: false, vehiclesCount: 0,
                annualIncome: 30000, travelFrequency: null, hasChronicConditions: false,
                familyMedicalHistory: null, drivingRecord: null, outstandingLoans: null,
            } as never,
            []
        ).map((g) => g.ruleId)

        expect(fired).toContain("mortgage_no_life")
    })

    it("matches Greek text regardless of accents and case", () => {
        expect(detectLifeCoverages(["ΚΕΦΑΛΑΙΟ ΖΩΗΣ"]).has("death_benefit")).toBe(true)
        expect(detectLifeCoverages(["Ασφάλισμα θανάτου"]).has("death_benefit")).toBe(true)
        expect(detectLifeCoverages(["μονιμη ολικη ανικανοτητα"]).has("disability")).toBe(true)
    })

    it("matches English coverage text too, for translated extractions", () => {
        expect(detectLifeCoverages(["Death benefit €150,000"]).has("death_benefit")).toBe(true)
        expect(detectLifeCoverages(["Waiver of premium rider"]).has("premium_waiver")).toBe(true)
        expect(detectLifeCoverages(["Critical illness cover"]).has("critical_illness")).toBe(true)
    })

    it("never reads a bare deductible mention as a premium waiver", () => {
        // «απαλλαγή» alone means a deductible in most branches; the waiver
        // aliases are deliberately multiword.
        expect(detectLifeCoverages(["Απαλλαγή 500 €"]).has("premium_waiver")).toBe(false)
        expect(detectLifeCoverages(["Απαλλαγή πληρωμής ασφαλίστρων"]).has("premium_waiver")).toBe(true)
    })

    it("is deterministic — the same input always gives the same findings", () => {
        const input = ["Σοβαρές ασθένειες"]
        const first = JSON.stringify(detectLifeCoverageGaps(input))

        for (let i = 0; i < 5; i += 1) {
            expect(JSON.stringify(detectLifeCoverageGaps(input))).toBe(first)
        }
    })
})
