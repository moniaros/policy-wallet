import { describe, expect, it } from "vitest"
import { buildRiskProfilePrompt, statedPrioritiesBlock } from "@/lib/services/ai/prompts"
import type { RiskProfileInput } from "@/lib/services/ai/ai-service.interface"

const EMPTY: RiskProfileInput = {
    maritalStatus: null, dependentsCount: null, employmentStatus: null, ownsHome: null, mortgageAmount: null,
    hasPets: null, vehiclesCount: null, annualIncome: null, occupation: null, travelsFrequently: null,
    hasLoans: null, loanAmount: null, smokingStatus: null, dateOfBirth: null, lifeEvents: null,
    gender: null, heightCm: null, weightKg: null, chronicConditions: null, familyMedicalHistory: null,
    drivingRecord: null, activityLevel: null,
}

/**
 * Layer 1 reaches the model as context, never as evidence. The block must say
 * so in the model's own instructions, and must be absent — not "none" — when
 * the customer never completed the profile.
 */
describe("stated priorities in the risk-profile prompt", () => {
    it("renders nothing when there is nothing stated", () => {
        expect(statedPrioritiesBlock(null)).toBe("")
        expect(statedPrioritiesBlock(undefined)).toBe("")
        expect(statedPrioritiesBlock([])).toBe("")
        expect(buildRiskProfilePrompt(EMPTY, [])).not.toMatch(/stated priorities/i)
    })

    it("lists the stated areas and forbids them from creating, removing or resizing a gap", () => {
        const prompt = buildRiskProfilePrompt(
            { ...EMPTY, statedPriorities: [{ domain: "money:income", importance: "high" }, { domain: "household", importance: "medium" }] },
            []
        )
        expect(prompt).toContain("- money:income: high")
        expect(prompt).toContain("- household: medium")
        expect(prompt).toMatch(/NOT verified/)
        expect(prompt).toMatch(/never create, remove or resize a gap/)
        expect(prompt.indexOf("Driving record")).toBeLessThan(prompt.indexOf("stated priorities"))
    })
})
