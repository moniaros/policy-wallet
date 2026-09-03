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

    it("a business owner is self-employed to the engine and owns a business", () => {
        const patch = protectionProfilePatch(parse({ step: "income", income: "business" }))
        expect(patch.columns).toEqual({ employmentStatus: "self_employed", ownsBusiness: true })
        expect(patch.answeredFields).toEqual(["employmentStatus", "ownsBusiness"])
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
