import { describe, it, expect } from "vitest"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import {
    assessRisks,
    openFindings,
    relevantLines,
} from "@/lib/services/gap-engine/risk-assessment"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"
import {
    assessmentsToRecommendations,
    prioritizeRecommendations,
} from "@/lib/services/gap-engine/recommendation-generator"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { normalizeBranch } from "@/lib/insurance/taxonomy"

/**
 * Scenario validation for the Life Context Risk Assessment Engine.
 *
 * Reviewed as an underwriter, an actuary, a product manager and a UX researcher
 * across the customer situations the product actually serves, and then encoded
 * so the review is repeatable instead of a one-off reading.
 *
 * Each scenario declares what MUST NOT be recommended (the "no irrelevant
 * insurance" contract), what SHOULD surface, and the protection-score band the
 * situation deserves. The bands are the load-bearing part: they are what caught
 * the score compressing every uncovered profile into 19–46, and a landlord with
 * two uninsured properties scoring higher than the exposure warranted.
 */

const NOW = new Date("2026-08-04")

function fam(lob: string): string {
    const b = normalizeBranch(lob)
    return (b.parentId ?? b.id).toLowerCase()
}

const ALL_ANSWERED = [
    "dateOfBirth","maritalStatus","childrenCount","dependentsCount","hasPets","vehiclesCount",
    "residenceType","propertiesOwned","rentsOutProperty","ownsBusiness","employmentStatus",
    "businessEmployees","annualIncome","savingsAmount","mortgageAmount","hasLoans","loanAmount",
    "travelsFrequently","activities","valuablesValue","cyberExposure","retirementPlanning",
    "occupation","drivingRecord","chronicConditions","familyMedicalHistory","ownsBoat",
]

const base = {
    answeredFields: ALL_ANSWERED,
    dateOfBirth: new Date("1990-01-01"),
    maritalStatus: "single",
    childrenCount: 0, dependentsCount: 0, hasPets: false, vehiclesCount: 0,
    residenceType: "rented", propertiesOwned: 0, rentsOutProperty: false,
    ownsBusiness: false, employmentStatus: "employed", businessEmployees: 0,
    annualIncome: 24000, savingsAmount: 12000, mortgageAmount: null,
    hasLoans: false, loanAmount: null, travelsFrequently: false,
    activities: [], valuablesValue: 0, cyberExposure: "low", retirementPlanning: false,
    occupation: "Office worker", drivingRecord: "clean", ownsBoat: false,
    chronicConditions: [], familyMedicalHistory: [],
}

interface Scenario {
    id: string
    label: string
    profile: Record<string, any>
    policies: Array<{ lineOfBusiness: string; status: string }>
    /** Lines that MUST NOT be recommended — the "no irrelevant insurance" contract. */
    forbidden: string[]
    /** Lines that SHOULD surface as an open finding. */
    expected?: string[]
    /** The score band this situation deserves, and why. */
    band?: [number, number, string]
}

const p = (o: Record<string, any>) => ({ ...base, ...o })

const SCENARIOS: Scenario[] = [
    {
        id: "single-renter", band: [65, 88, "low exposure, one modest income-protection gap"] as [number, number, string], label: "Single renter, employee, no dependants",
        profile: p({}), policies: [],
        forbidden: ["motor", "home", "pet", "travel", "cyber", "business", "liability", "gadget"],
        expected: ["renters", "income_protection"],
    },
    {
        // A distinctly Greek persona and the reason `common_areas_liability`
        // exists: the διαχειριστής role is unpaid, rotates between residents and
        // attaches personal liability for the lift and the stairwell. It is
        // NOT implied by owning the flat, so this renter carries it too.
        id: "building-manager", label: "Renter who acts as manager of the block",
        profile: p({ isBuildingManager: true }),
        policies: [],
        forbidden: ["motor", "home", "pet", "travel", "business"],
        expected: ["liability"],
    },
    {
        id: "home-owner", band: [30, 55, "uninsured EUR150k mortgage and uninsured building"] as [number, number, string], label: "Home owner, mortgage, no dependants",
        profile: p({ residenceType: "owned", propertiesOwned: 1, mortgageAmount: 150000 }),
        policies: [],
        forbidden: ["motor", "pet", "travel", "cyber", "business", "renters"],
        expected: ["home", "life"],
    },
    {
        id: "married-no-children", band: [25, 50, "a critical life need entirely uncovered is a poor result, not a fair one"] as [number, number, string], label: "Married, spouse not earning, no children",
        profile: p({ maritalStatus: "married", childrenCount: 0, dependentsCount: 1 }),
        policies: [],
        forbidden: ["motor", "home", "pet", "travel", "cyber", "business"],
        expected: ["life"],
    },
    {
        id: "parents", band: [10, 35, "children, mortgage and a car with nothing insured — the worst case in the matrix"] as [number, number, string], label: "Parents, two children, mortgage, one car",
        profile: p({ maritalStatus: "married", childrenCount: 2, dependentsCount: 3,
            residenceType: "owned", propertiesOwned: 1, mortgageAmount: 200000, vehiclesCount: 1 }),
        policies: [], forbidden: ["pet", "travel", "cyber", "business", "renters"],
        expected: ["life", "home", "motor"],
    },
    {
        id: "no-children", band: [65, 88, "two earners, no dependants, no debt"] as [number, number, string], label: "Couple, no children, no debt, renting",
        profile: p({ maritalStatus: "married", childrenCount: 0, dependentsCount: 0 }),
        policies: [], forbidden: ["motor", "home", "pet", "travel", "cyber", "business"],
    },
    {
        id: "pet-owner", band: [65, 88, "as single-renter plus a low-severity pet exposure"] as [number, number, string], label: "Pet owner",
        profile: p({ hasPets: true }), policies: [],
        forbidden: ["motor", "home", "travel", "cyber", "business"],
        expected: ["pet"],
    },
    {
        id: "no-pets", band: [65, 88, "identical to single-renter"] as [number, number, string], label: "No pets",
        profile: p({ hasPets: false }), policies: [],
        forbidden: ["pet", "motor", "home", "travel", "cyber", "business"],
    },
    {
        id: "motorcycle-owner", band: [65, 92, "compulsory cover held"] as [number, number, string], label: "Motorcycle owner, insured on a motorbike policy",
        profile: p({ vehiclesCount: 1 }),
        policies: [{ lineOfBusiness: "motorbike", status: "active" }],
        forbidden: ["home", "pet", "travel", "cyber", "business"],
    },
    {
        id: "no-vehicles", band: [65, 88, "identical to single-renter"] as [number, number, string], label: "No vehicles",
        profile: p({ vehiclesCount: 0 }), policies: [],
        forbidden: ["motor", "home", "pet", "travel", "cyber", "business", "legal_expenses"],
    },
    {
        id: "business-owner", band: [45, 72, "commercial and employer exposure entirely uncovered"] as [number, number, string], label: "Business owner with 4 employees",
        profile: p({ ownsBusiness: true, businessEmployees: 4, employmentStatus: "self_employed",
            occupation: "Καφετέρια", annualIncome: 40000 }),
        policies: [], forbidden: ["motor", "pet", "travel", "cyber", "home"],
        expected: ["business", "liability"],
    },
    {
        id: "employee", band: [52, 78, "thin savings raises the income-protection need"] as [number, number, string], label: "Employee, thin savings",
        profile: p({ employmentStatus: "employed", savingsAmount: 1000, annualIncome: 22000 }),
        policies: [], forbidden: ["motor", "home", "pet", "travel", "cyber", "business", "liability"],
        expected: ["income_protection"],
    },
    {
        id: "retired", band: [78, 100, "few applicable risks and the main one covered"] as [number, number, string], label: "Retired 70, owns home outright, no debt",
        profile: p({ dateOfBirth: new Date("1956-01-01"), employmentStatus: "retired",
            residenceType: "owned", propertiesOwned: 1, retirementPlanning: true, annualIncome: 14000 }),
        policies: [{ lineOfBusiness: "home", status: "active" }],
        forbidden: ["motor", "pet", "travel", "cyber", "business", "income_protection", "pension", "renters"],
    },
    {
        id: "student", band: [75, 95, "minimal insurable exposure; scoring them low would be product-push, not protection"] as [number, number, string], label: "Student, 21, renting, no income",
        profile: p({ dateOfBirth: new Date("2005-01-01"), employmentStatus: "student",
            annualIncome: 0, savingsAmount: 500 }),
        policies: [], forbidden: ["motor", "home", "pet", "travel", "cyber", "business",
            "liability", "income_protection", "pension"],
    },
    {
        id: "frequent-traveler", band: [58, 82, "one extra discretionary exposure"] as [number, number, string], label: "Frequent traveller",
        profile: p({ travelsFrequently: true }), policies: [],
        forbidden: ["motor", "home", "pet", "cyber", "business"],
        expected: ["travel"],
    },
    {
        id: "boat-owner", band: [42, 72, "a compulsory marine liability entirely uncovered"] as [number, number, string], label: "Boat owner",
        profile: p({ ownsBoat: true }), policies: [],
        forbidden: ["motor", "home", "pet", "travel", "cyber", "business"],
        expected: ["boat"],
    },
    {
        id: "landlord", band: [22, 55, "two property exposures, neither insured"] as [number, number, string], label: "Landlord letting one flat",
        profile: p({ residenceType: "owned", propertiesOwned: 2, rentsOutProperty: true }),
        policies: [], forbidden: ["motor", "pet", "travel", "cyber", "business", "renters"],
        expected: ["home", "legal_expenses"],
    },
    {
        id: "holiday-home", band: [48, 78, "one of two properties insured; which one is unverifiable"] as [number, number, string], label: "Holiday-home owner (second property, unoccupied much of the year)",
        profile: p({ residenceType: "owned", propertiesOwned: 2, rentsOutProperty: false }),
        policies: [{ lineOfBusiness: "home", status: "active" }],
        forbidden: ["motor", "pet", "travel", "cyber", "business", "renters"],
    },
    {
        id: "high-net-worth", band: [28, 62, "dependants, two properties and valuables, nothing insured"] as [number, number, string], label: "High-net-worth: 2 properties, EUR 120k valuables, high income",
        profile: p({ residenceType: "owned", propertiesOwned: 2, annualIncome: 250000,
            savingsAmount: 800000, valuablesValue: 120000, maritalStatus: "married",
            childrenCount: 2, dependentsCount: 2, cyberExposure: "high" }),
        policies: [], forbidden: ["motor", "pet", "travel", "business", "renters"],
        expected: ["gadget", "cyber", "life", "home"],
    },
    {
        id: "cyber-exposed", band: [58, 82, "one extra discretionary exposure"] as [number, number, string], label: "Cyber exposed (high online financial activity)",
        profile: p({ cyberExposure: "high" }), policies: [],
        forbidden: ["motor", "home", "pet", "travel", "business"],
        expected: ["cyber"],
    },
    {
        id: "unknown-everything",  label: "Brand-new user: nothing known",
        profile: null as any, policies: [],
        forbidden: [],
    },
    {
        id: "fully-covered", band: [92, 100, "every applicable risk answered"] as [number, number, string], label: "Parents with every relevant line held",
        profile: p({ maritalStatus: "married", childrenCount: 2, dependentsCount: 3,
            residenceType: "owned", propertiesOwned: 1, mortgageAmount: 200000,
            vehiclesCount: 1, retirementPlanning: true, savingsAmount: 60000 }),
        policies: [
            { lineOfBusiness: "life", status: "active" },
            { lineOfBusiness: "home", status: "active" },
            { lineOfBusiness: "motor", status: "active" },
            { lineOfBusiness: "health", status: "active" },
            { lineOfBusiness: "income_protection", status: "active" },
        ],
        forbidden: ["pet", "travel", "cyber", "business", "renters"],
    },
    {
        id: "high-risk-sport", band: [35, 65, "critical life gap plus an activity exclusion on what cover they might buy"] as [number, number, string], label: "Climber and skier, earning, with dependants",
        profile: p({ activities: ["climbing", "skiing"], dependentsCount: 1, childrenCount: 1 }),
        policies: [], forbidden: ["motor", "home", "pet", "travel", "cyber", "business"],
        expected: ["personal_accident"],
    },
    {
        id: "chronic-condition", band: [55, 88, "a health exposure that is largely uninsurable"] as [number, number, string], label: "Diabetic, no private health cover",
        profile: p({ chronicConditions: ["diabetes"] }), policies: [],
        forbidden: ["motor", "home", "pet", "travel", "cyber", "business"],
        expected: ["health"],
    },
    {
        id: "bad-driver", band: [62, 88, "compulsory cover held; legal expenses the only real gap"] as [number, number, string], label: "Driver with accident history, insured",
        profile: p({ vehiclesCount: 1, drivingRecord: "accidents" }),
        policies: [{ lineOfBusiness: "motor", status: "active" }],
        forbidden: ["home", "pet", "travel", "cyber", "business"],
        expected: ["legal_expenses"],
    },
]

// ── The assessment under test, run once per scenario ─────────────────────────

function evaluate(sc: Scenario) {
    const ctx = toLifeContext(sc.profile as any, NOW)
    const assessments = assessRisks(ctx, sc.policies)
    const open = openFindings(assessments)
    const activeLobs = [
        ...new Set(
            sc.policies.filter((p) => p.status === "active").map((p) => p.lineOfBusiness.toLowerCase())
        ),
    ]
    const score = calculateScoreFromAssessments(assessments, activeLobs, [])
    const recs = prioritizeRecommendations(assessmentsToRecommendations("u", assessments))
    const tiles = buildBranchOverview(
        sc.policies.map((p, i) => ({
            id: String(i),
            lineOfBusiness: p.lineOfBusiness,
            status: p.status,
            endDate: null,
        })),
        score.expectedLines
    )
        .filter((t) => t.state === "not_held")
        .map((t) => t.branch.id)
    return { ctx, assessments, open, score, recs, tiles }
}

describe.each(SCENARIOS.map((s) => [s.label, s] as const))("%s", (_label, sc) => {
    it("recommends no insurance for an exposure this customer does not have", () => {
        const { open } = evaluate(sc)
        for (const lob of sc.forbidden) {
            const bad = open.find((a) => a.lineOfBusiness === lob)
            expect(
                bad,
                `${bad?.riskId} recommends ${lob}, which is not this customer's exposure`
            ).toBeUndefined()
        }
    })

    it("surfaces the risks this customer does carry", () => {
        const { open } = evaluate(sc)
        for (const lob of sc.expected ?? []) {
            expect(
                open.map((a) => a.lineOfBusiness),
                `no open finding for ${lob}`
            ).toContain(lob)
        }
    })

    it("explains every recommendation, in both languages", () => {
        const { open } = evaluate(sc)
        for (const a of open) {
            for (const f of ["riskExplanation", "whyItApplies", "expectedImpact", "suggestedSolution"] as const) {
                for (const lang of ["en", "el"] as const) {
                    const v = a[f][lang]
                    expect(v.length, `${a.riskId}.${f}.${lang} is empty or a stub`).toBeGreaterThan(20)
                    expect(v, `${a.riskId}.${f}.${lang} has a broken interpolation`).not.toMatch(
                        /undefined|NaN|\[object/
                    )
                }
            }
        }
    })

    it("writes Greek copy in Greek", () => {
        // The catalog interpolates the customer's own stored answers. Those are
        // ids, and an id rendered raw reads their answer back to them in a
        // language they did not use.
        const { open } = evaluate(sc)
        // «All Risks» is printed in Latin script in Greek policy wordings, so it is
        // market terminology rather than an untranslated string.
        const allowed = /^(PolicyWallet|EOPYY|ENFIA|EFKA|Risks)$/i
        for (const a of open) {
            for (const f of ["riskExplanation", "whyItApplies", "expectedImpact", "suggestedSolution"] as const) {
                const leaks = (a[f].el.match(/[A-Za-z]{4,}/g) ?? []).filter((w) => !allowed.test(w))
                expect(leaks, `${a.riskId}.${f}.el contains untranslated "${leaks.join(", ")}"`).toEqual([])
            }
        }
    })

    it("never prioritises what it has not established", () => {
        const { assessments } = evaluate(sc)
        for (const a of assessments) {
            if (a.applicability === "needs_review" || a.status === "not_applicable") {
                expect(a.priority, `${a.riskId} is ${a.status} but priority ${a.priority}`).toBe("low")
            }
        }
    })

    it("scores in the band the situation deserves", () => {
        const { score } = evaluate(sc)
        expect(score.overallScore).toBeGreaterThanOrEqual(0)
        expect(score.overallScore).toBeLessThanOrEqual(100)
        expect(Number.isInteger(score.overallScore)).toBe(true)
        if (sc.band) {
            const [lo, hi, why] = sc.band
            expect(score.overallScore, `${score.overallScore} outside ${lo}-${hi} — ${why}`).toBeGreaterThanOrEqual(lo)
            expect(score.overallScore, `${score.overallScore} outside ${lo}-${hi} — ${why}`).toBeLessThanOrEqual(hi)
        }
    })

    it("passes no verdict on a customer it has not asked", () => {
        const { score } = evaluate(sc)
        if (sc.profile === null) {
            expect(score.indeterminate, "a stranger must not receive a score").toBe(true)
        } else {
            expect(
                score.assessmentCoverage,
                "a fully answered profile must be assessable"
            ).toBeGreaterThanOrEqual(50)
        }
    })

    it("shows a branch tile only where a real finding sits on that line", () => {
        const { open, tiles } = evaluate(sc)
        for (const tile of tiles) {
            expect(
                open.map((a) => a.lineOfBusiness),
                `tile "${tile}" is marked not-held with no open finding on that line`
            ).toContain(tile)
        }
    })

    it("does not report a partly-insured exposure as covered", () => {
        // One policy is not two houses.
        const { ctx, assessments } = evaluate(sc)
        for (const a of assessments) {
            if (a.status !== "already_covered") continue
            const need = a.riskId === "home_building_damage" ? Math.max(1, ctx.propertiesOwned) : 1
            const have = sc.policies.filter(
                (p) => p.status === "active" && fam(p.lineOfBusiness) === fam(a.lineOfBusiness)
            ).length
            if (have > 0) {
                expect(
                    have,
                    `${a.riskId}: ${have} policy for ${need} exposures reported as covered`
                ).toBeGreaterThanOrEqual(need)
            }
        }
    })

    it("turns every open finding into exactly one fully-populated recommendation", () => {
        const { open, recs } = evaluate(sc)
        expect(recs).toHaveLength(open.length)
        for (const r of recs) {
            expect(r.riskStatus, `${r.ruleId} has no assessment status`).toBeTruthy()
            expect(r.confidence, `${r.ruleId} has no confidence`).toBeTruthy()
            expect(r.expectedImpact, `${r.ruleId} has no expected impact`).toBeTruthy()
            expect(r.suggestedSolution, `${r.ruleId} has no suggested solution`).toBeTruthy()
        }
        // Urgency orders nothing (PW-TRANSPARENCY-02 B1): the list follows the
        // protection weight, the stated priority and the rule id, so no
        // urgency-monotonic assertion holds — or should.
    })

    it("keeps expected lines to risks that actually apply", () => {
        const { score, assessments } = evaluate(sc)
        const rel = relevantLines(assessments)
        for (const l of score.expectedLines) expect(rel).toContain(l)
    })
})

describe("the score discriminates between situations", () => {
    const scoreOf = (id: string) => {
        const sc = SCENARIOS.find((s) => s.id === id)!
        return evaluate(sc).score.overallScore
    }

    // More uncovered exposure must score lower. Without these the score can be
    // internally consistent and still say nothing — every uncovered profile once
    // landed in 19–46 regardless of what was at stake.
    it.each([
        ["fully-covered", "retired"],
        ["retired", "single-renter"],
        ["single-renter", "home-owner"],
        ["home-owner", "parents"],
        ["single-renter", "landlord"],
        ["motorcycle-owner", "boat-owner"],
        ["bad-driver", "high-net-worth"],
    ])("%s scores above %s", (better, worse) => {
        expect(scoreOf(better)).toBeGreaterThan(scoreOf(worse))
    })
})

describe("the scenario matrix itself stays honest", () => {
    it("covers every risk in the catalog at least once", () => {
        const seen = new Set<string>()
        for (const sc of SCENARIOS) {
            for (const a of evaluate(sc).open) seen.add(a.riskId)
        }
        const never = RISK_CATALOG.map((r) => r.id).filter((id) => !seen.has(id))
        expect(never, `no scenario exercises: ${never.join(", ")}`).toEqual([])
    })
})
