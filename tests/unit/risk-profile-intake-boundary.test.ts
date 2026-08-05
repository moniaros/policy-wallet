import { describe, it, expect } from "vitest"
import { RiskProfileSchema } from "@/lib/validations/risk-profile"
import { HIGH_RISK_ACTIVITIES, CONTEXT_FACTORS } from "@/lib/services/gap-engine/life-context"
import { PROFILE_FIELD_SPECS } from "@/lib/services/questionnaire/profile-mapping"

/**
 * The intake boundary — everything the risk engine is allowed to believe.
 *
 * The engine reasons about someone's life from these values, so a bad one does
 * not produce a crash, it produces a confident wrong answer about a real person.
 * That makes this the one place where rejecting is safer than coping.
 */

describe("the intake schema rejects what the engine must not believe", () => {
    it.each([
        ["a negative dependant count", { dependentsCount: -1 }],
        ["negative savings", { savingsAmount: -1 }],
        ["a fractional child", { childrenCount: 1.5 }],
        ["more children than a household has", { childrenCount: 21 }],
        ["an implausible headcount", { businessEmployees: 10_001 }],
        ["savings beyond the sanity rail", { savingsAmount: 1e9 }],
        ["an invented residence type", { residenceType: "castle" }],
        ["an activity outside the vocabulary", { activities: ["parkour"] }],
        ["markup in an activity id", { activities: ["<script>alert(1)</script>"] }],
        ["a branch that does not exist", { coverHeldElsewhere: ["dragons"] }],
        ["an unbounded answeredFields list", { answeredFields: Array(65).fill("x") }],
        ["an overlong field name", { answeredFields: ["x".repeat(65)] }],
        ["an invented cyber level", { cyberExposure: "extreme" }],
        ["a boolean sent as a string", { ownsBoat: "true" }],
        ["NaN", { savingsAmount: NaN }],
        ["Infinity", { valuablesValue: Infinity }],
    ])("rejects %s", (_label, payload) => {
        expect(RiskProfileSchema.safeParse(payload).success).toBe(false)
    })

    it("accepts a complete, well-formed declaration", () => {
        const result = RiskProfileSchema.safeParse({
            maritalStatus: "married",
            childrenCount: 2,
            residenceType: "owned",
            propertiesOwned: 2,
            rentsOutProperty: true,
            ownsBoat: true,
            ownsBusiness: true,
            businessEmployees: 4,
            savingsAmount: 20_000,
            valuablesValue: 30_000,
            activities: ["climbing", "sailing"],
            cyberExposure: "high",
            retirementPlanning: false,
            coverHeldElsewhere: ["life", "home"],
            answeredFields: ["residenceType", "ownsBoat"],
        })
        expect(result.success, JSON.stringify((result as any).error?.issues)).toBe(true)
    })

    it("names the offending field so the wizard can point at it", () => {
        // The wizard renders "Check: <field>" from `error.issues[].path`. A
        // rejection with no path leaves the reader guessing which of twenty-odd
        // inputs to fix.
        const result = RiskProfileSchema.safeParse({ childrenCount: 99, cyberExposure: "extreme" })
        expect(result.success).toBe(false)
        const paths = (result as any).error.issues.map((i: any) => i.path[0])
        expect(paths).toContain("childrenCount")
        expect(paths).toContain("cyberExposure")
    })
})

describe("the intake vocabularies stay in step with the engine", () => {
    it("accepts exactly the activities the catalog can reason about", () => {
        for (const activity of HIGH_RISK_ACTIVITIES) {
            expect(
                RiskProfileSchema.safeParse({ activities: [activity] }).success,
                `${activity} is a catalog activity the intake refuses`
            ).toBe(true)
        }
    })

    it("marital status is accepted identically by both intakes", () => {
        // The B2C wizard and the advisor questionnaire once disagreed:
        // `partnered` was a valid declaration through one and a validation error
        // through the other, for the same person answering the same question.
        const questionnaireValues = (PROFILE_FIELD_SPECS.maritalStatus as { values: readonly string[] }).values
        for (const value of questionnaireValues) {
            expect(
                RiskProfileSchema.safeParse({ maritalStatus: value }).success,
                `the questionnaire accepts "${value}" but the API does not`
            ).toBe(true)
        }
    })

    it("every context factor the engine gates on can be answered through the API", () => {
        // A factor with no way in is a risk permanently stuck in `needs_review`.
        const answerable: Record<string, unknown> = {
            age: { dateOfBirth: new Date().toISOString() },
            maritalStatus: { maritalStatus: "single" },
            children: { childrenCount: 0 },
            dependents: { dependentsCount: 0 },
            pets: { hasPets: false },
            vehicles: { vehiclesCount: 0 },
            residence: { residenceType: "rented" },
            tenancy: { residenceType: "rented" },
            propertyOwnership: { propertiesOwned: 0 },
            tenants: { rentsOutProperty: false },
            boat: { ownsBoat: false },
            businessOwnership: { ownsBusiness: false },
            selfEmployed: { employmentStatus: "employed" },
            employees: { businessEmployees: 0 },
            income: { annualIncome: 1 },
            savings: { savingsAmount: 1 },
            mortgage: { mortgageAmount: 1 },
            loans: { hasLoans: false },
            travelFrequency: { travelsFrequently: false },
            hobbies: { activities: [] },
            valuables: { valuablesValue: 0 },
            cyberExposure: { cyberExposure: "low" },
            retirementPlanning: { retirementPlanning: false },
            // Art. 9 data: accepted here, but only from the explicitly consented
            // B2C surface — the advisor questionnaire deliberately cannot write it.
            health: { chronicConditions: [] },
        }
        for (const factor of CONTEXT_FACTORS) {
            const payload = answerable[factor]
            expect(payload, `no API field answers the "${factor}" factor`).toBeTruthy()
            expect(
                RiskProfileSchema.safeParse(payload).success,
                `the payload that answers "${factor}" is rejected`
            ).toBe(true)
        }
    })
})
