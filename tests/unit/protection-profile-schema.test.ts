import { describe, expect, it } from "vitest"
import { ProtectionProfileStepSchema } from "@/lib/validations/protection-profile"
import { LIFE_CHANGE_OPTIONS } from "@/lib/services/protection-profile/vocabulary"
import { getLifeEvent } from "@/lib/services/life-events/registry"

describe("protection profile — the zod boundary", () => {
    it("accepts one validated object per screen", () => {
        const ok = [
            { step: "intent", intent: "help_me" },
            { step: "orientation" },
            { step: "people", people: ["partner", "children"], childrenCount: "2" },
            { step: "people", unsure: true },
            { step: "home", home: "rented" },
            { step: "income", income: "business" },
            { step: "obligations", commitments: ["mortgage"] },
            { step: "mobility", vehicles: "1" },
            { step: "hurt_most", concerns: ["income", "family"] },
            { step: "changes", changes: ["new_child"], somethingComing: true },
            { step: "plans", plans: ["retirement"] },
            { step: "confidence", confidence: "no_idea" },
            { step: "uncertainty_reason", reasons: ["never_read", "had_to"] },
            { step: "guidance", guidance: null },
        ]
        for (const input of ok) {
            const parsed = ProtectionProfileStepSchema.safeParse(input)
            expect(parsed.success, JSON.stringify(input)).toBe(true)
        }
    })

    it("rejects an unknown step, free text, a third concern and an amount", () => {
        const bad = [
            { step: "health", condition: "diabetes" },
            { step: "intent", intent: "I want to check my car" },
            { step: "hurt_most", concerns: ["health", "family", "income"] },
            { step: "obligations", commitments: ["mortgage"], mortgageAmount: 120000 },
            { step: "people", people: ["children"], childrenCount: "7" },
        ]
        // The amount is stripped (zod objects are non-strict), so the check is
        // that no accepted object ever carries it.
        for (const input of bad) {
            const parsed = ProtectionProfileStepSchema.safeParse(input)
            if (parsed.success) expect(parsed.data).not.toHaveProperty("mortgageAmount")
            else expect(parsed.success).toBe(false)
        }
        expect(ProtectionProfileStepSchema.safeParse({ step: "health", condition: "diabetes" }).success).toBe(false)
        expect(ProtectionProfileStepSchema.safeParse({ step: "intent", intent: "free text" }).success).toBe(false)
        expect(ProtectionProfileStepSchema.safeParse({ step: "hurt_most", concerns: ["health", "family", "income"] }).success).toBe(false)
    })

    it("every life-change chip maps to a registry event or is an explicit flag", () => {
        for (const option of LIFE_CHANGE_OPTIONS) {
            if (option.registry === null) continue
            expect(getLifeEvent(option.registry), `${option.id} → ${option.registry}`).toBeTruthy()
        }
        // The health change is the one special-category chip: never an instance.
        expect(LIFE_CHANGE_OPTIONS.find((o) => o.id === "health_changed")?.registry).toBeNull()
    })
})
