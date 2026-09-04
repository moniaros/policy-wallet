import { describe, expect, it } from "vitest"
import { protectionProfilePatch } from "@/lib/services/protection-profile/patch"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { quickStartComplete } from "@/lib/services/onboarding/quick-start"
import { ProtectionProfileStepSchema, type ProtectionProfileStepInput } from "@/lib/validations/protection-profile"

const parse = (input: unknown): ProtectionProfileStepInput => {
    const r = ProtectionProfileStepSchema.safeParse(input)
    if (!r.success) throw new Error(r.error.message)
    return r.data
}

/** Apply a sequence of screen answers the way the action does (no overwrite). */
function applyAll(inputs: unknown[]) {
    const columns: Record<string, unknown> = {}
    const answered = new Set<string>()
    for (const input of inputs) {
        const patch = protectionProfilePatch(parse(input))
        for (const [k, v] of Object.entries(patch.columns)) if (!answered.has(k)) columns[k] = v
        for (const f of patch.answeredFields) answered.add(f)
    }
    return { ...columns, answeredFields: [...answered] }
}

describe("protection profile → profile facts", () => {
    it("people + home + mobility satisfy the /protection quick start, so it retires itself", () => {
        const profile = applyAll([
            { step: "people", people: ["partner", "children"], childrenCount: "2" },
            { step: "home", home: "owned" },
            { step: "mobility", vehicles: "1" },
        ])
        const ctx = toLifeContext(profile as any)
        expect(quickStartComplete(ctx)).toBe(true)
        expect(ctx.childrenCount).toBe(2)
        expect(ctx.dependentsCount).toBe(3)
        expect(ctx.residenceType).toBe("owned")
        expect(ctx.propertiesOwned).toBe(1)
        expect(ctx.vehiclesCount).toBe(1)
    })

    it("«μόνο εγώ» is an answer of zero, not silence", () => {
        const profile = applyAll([{ step: "people", people: ["only_me"] }])
        const ctx = toLifeContext(profile as any)
        expect(ctx.known.children).toBe(true)
        expect(ctx.known.dependents).toBe(true)
        expect(ctx.dependentsCount).toBe(0)
    })

    it("«δεν είμαι σίγουρος/η» writes no fact and flags the step", () => {
        const patch = protectionProfilePatch(parse({ step: "people", unsure: true }))
        expect(patch.columns).toEqual({})
        expect(patch.answeredFields).toEqual([])
        expect(patch.unsure).toBe(true)
    })

    it("«Ο/Η σύντροφός μου» says there is a partner: maritalStatus=partnered as a COARSE bucket; otherwise nothing", () => {
        const withPartner = protectionProfilePatch(parse({ step: "people", people: ["partner", "children"], childrenCount: "1" }))
        expect(withPartner.columns.maritalStatus).toBe("partnered")
        expect(withPartner.precision.maritalStatus).toBe("coarse")
        expect(withPartner.answeredFields).toContain("maritalStatus")
        // The engine reads it as KNOWN, and «has a partner» is what it means.
        const ctx = toLifeContext(applyAll([{ step: "people", people: ["partner"] }]) as any)
        expect(ctx.known.maritalStatus).toBe(true)
        expect(ctx.maritalStatus).toBe("partnered")
        // Not choosing a partner says nothing about civil status — single,
        // divorced and widowed all look the same here, so no column is written.
        for (const people of [["only_me"], ["children"], ["parents_or_others"], ["children", "parents_or_others"]]) {
            const patch = protectionProfilePatch(parse({ step: "people", people, childrenCount: "2" }))
            expect(patch.columns, people.join("+")).not.toHaveProperty("maritalStatus")
            expect(patch.answeredFields, people.join("+")).not.toContain("maritalStatus")
        }
    })

    it("income dependency is the person's own word — exact — and «unsure» or no value leaves the column alone", () => {
        for (const dependency of ["primary", "shared", "minor"] as const) {
            const patch = protectionProfilePatch(parse({ step: "income_dependency", dependency }))
            expect(patch.columns).toEqual({ incomeDependency: dependency })
            expect(patch.precision.incomeDependency ?? "exact").toBe("exact")
            expect(patch.answeredFields).toEqual(["incomeDependency"])
            expect(patch.unsure).toBe(false)
            expect(patch.statements).toEqual({})
            expect(toLifeContext(applyAll([{ step: "income_dependency", dependency }]) as any).incomeDependency).toBe(dependency)
        }
        for (const input of [{ step: "income_dependency", unsure: true }, { step: "income_dependency" }]) {
            const patch = protectionProfilePatch(parse(input))
            expect(patch.columns, JSON.stringify(input)).toEqual({})
            expect(patch.answeredFields).toEqual([])
            expect(patch.unsure).toBe(true)
        }
    })

    it("a business owner is self-employed to the engine and owns a business", () => {
        const patch = protectionProfilePatch(parse({ step: "income", income: "business" }))
        expect(patch.columns).toEqual({ employmentStatus: "self_employed", ownsBusiness: true })
        expect(patch.precision.ownsBusiness ?? "exact").toBe("exact")
        expect(patch.answeredFields).toEqual(["employmentStatus", "ownsBusiness"])
    })

    it("a salary, a pension, «not working» or «studying» say «no business» as a COARSE bucket; a freelancer leaves it unknown", () => {
        for (const income of ["employed", "retired", "not_working", "student_other"] as const) {
            const patch = protectionProfilePatch(parse({ step: "income", income }))
            expect(patch.columns.ownsBusiness, income).toBe(false)
            expect(patch.precision.ownsBusiness, income).toBe("coarse")
            expect(patch.answeredFields, income).toContain("ownsBusiness")
            // The engine reads it as KNOWN — «no» is an answer, not silence.
            const ctx = toLifeContext(applyAll([{ step: "income", income }]) as any)
            expect(ctx.known.businessOwnership, income).toBe(true)
            expect(ctx.ownsBusiness, income).toBe(false)
        }
        const freelancer = protectionProfilePatch(parse({ step: "income", income: "self_employed" }))
        expect(freelancer.columns).toEqual({ employmentStatus: "self_employed" })
        expect(freelancer.answeredFields).toEqual(["employmentStatus"])
        expect(toLifeContext(applyAll([{ step: "income", income: "self_employed" }]) as any).known.businessOwnership).toBe(false)
    })

    it("«Μόνο εγώ» writes no marital status — it is not a marital fact", () => {
        const patch = protectionProfilePatch(parse({ step: "people", people: ["only_me"] }))
        expect(patch.columns).toEqual({ childrenCount: 0, dependentsCount: 0 })
        expect(patch.columns).not.toHaveProperty("maritalStatus")
        expect(patch.answeredFields).not.toContain("maritalStatus")
        expect(toLifeContext(applyAll([{ step: "people", people: ["only_me"] }]) as any).known.maritalStatus).toBe(false)
    })

    it("obligations set the loan FLAG and never an amount; rent stays a statement", () => {
        const patch = protectionProfilePatch(parse({ step: "obligations", commitments: ["rent", "loan"] }))
        expect(patch.columns).toEqual({ hasLoans: true })
        expect(patch.statements.commitments).toEqual(["rent", "loan"])
        const none = protectionProfilePatch(parse({ step: "obligations", commitments: [] }))
        expect(none.columns).toEqual({ hasLoans: false })
        expect(none.answeredFields).toEqual(["hasLoans"])
    })

    it("never writes an amount, a date of birth or a health column", () => {
        const banned = ["mortgageAmount", "loanAmount", "annualIncome", "dateOfBirth", "chronicConditions", "familyMedicalHistory", "heightCm", "weightKg", "smokingStatus"]
        const everything = [
            { step: "intent", intent: "find_gaps" },
            { step: "people", people: ["children"], childrenCount: "3" },
            { step: "home", home: "rented" },
            { step: "income", income: "self_employed" },
            { step: "income_dependency", dependency: "primary" },
            { step: "obligations", commitments: ["mortgage", "loan", "rent"] },
            { step: "mobility", vehicles: "2" },
            { step: "hurt_most", concerns: ["health"] },
            { step: "changes", changes: ["health_changed", "new_child"] },
            { step: "plans", plans: ["retirement"] },
            { step: "confidence", confidence: "gaps" },
            { step: "uncertainty_reason", reasons: ["never_read"] },
            { step: "guidance", guidance: "explain_everything" },
        ]
        for (const input of everything) {
            const patch = protectionProfilePatch(parse(input))
            for (const column of banned) expect(patch.columns, `${JSON.stringify(input)} wrote ${column}`).not.toHaveProperty(column)
        }
    })

    it("statements go to the statements side, never to a profile column", () => {
        const patch = protectionProfilePatch(parse({ step: "hurt_most", concerns: ["income", "home"] }))
        expect(patch.columns).toEqual({})
        expect(patch.statements.riskConcerns).toEqual(["income", "home"])
    })
})
