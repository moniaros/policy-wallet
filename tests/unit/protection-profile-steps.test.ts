import { describe, expect, it } from "vitest"
import { STEPS, computePath, firstOpenStep, nextStep, previousStep, progressFor } from "@/lib/onboarding/protection-profile/steps"
import { COUNTED_STEPS } from "@/lib/services/protection-profile/vocabulary"
import type { ProtectionAnswers } from "@/lib/validations/protection-profile"

describe("protection-profile step graph", () => {
    it("every visibility rule depends only on EARLIER steps", () => {
        STEPS.forEach((step, i) => {
            for (const dep of step.dependsOn ?? []) {
                const at = STEPS.findIndex((s) => s.id === dep)
                expect(at, `${step.id} depends on ${dep}`).toBeGreaterThanOrEqual(0)
                expect(at, `${step.id} depends on a LATER step ${dep}`).toBeLessThan(i)
            }
        })
    })

    it("with nothing answered, the predicted path is the longest one", () => {
        const path = computePath({})
        expect(path).toEqual(STEPS.map((s) => s.id))
    })

    it("every forward walk reaches the map, then the upload, and never a dead end", () => {
        const walks: ProtectionAnswers[] = [
            {},
            { intent: { intent: "help_me" } },
            { intent: { intent: "find_gaps" }, changes: { changes: [], somethingComing: false }, confidence: { confidence: "very" } },
            { intent: { intent: "organise" }, changes: { changes: ["new_child"], somethingComing: true }, confidence: { confidence: "no_idea" } },
        ]
        for (const answers of walks) {
            let current = computePath(answers)[0]
            const seen: string[] = [current]
            for (let guard = 0; guard < 30 && current !== "advisor"; guard++) {
                const next = nextStep(current, answers)
                expect(next, `dead end after ${current}`).not.toBeNull()
                current = next!
                seen.push(current)
            }
            expect(seen).toContain("map")
            expect(seen.indexOf("map")).toBeLessThan(seen.indexOf("upload"))
            expect(seen[seen.length - 1]).toBe("advisor")
        }
    })

    it("conditional screens appear only for the answers that earn them", () => {
        expect(computePath({ intent: { intent: "find_gaps" } })).not.toContain("orientation")
        expect(computePath({ intent: { intent: "help_me" } })).toContain("orientation")
        expect(computePath({ changes: { changes: [], somethingComing: false } })).not.toContain("plans")
        expect(computePath({ confidence: { confidence: "fairly" } })).not.toContain("uncertainty_reason")
        expect(computePath({ confidence: { confidence: "gaps" } })).toContain("uncertainty_reason")
    })

    it("«πόσο βασίζεται το νοικοκυριό σου στο εισόδημά σου;» follows income, and only when someone may live on it", () => {
        // Placement: right after income, before obligations — never counted.
        const path = computePath({})
        expect(path[path.indexOf("income") + 1]).toBe("income_dependency")
        expect(path[path.indexOf("income_dependency") + 1]).toBe("obligations")
        expect(COUNTED_STEPS as readonly string[]).not.toContain("income_dependency")
        expect(COUNTED_STEPS).toHaveLength(10)
        expect(STEPS.find((s) => s.id === "income_dependency")?.dependsOn).toEqual(["people", "income"])
        expect(STEPS.find((s) => s.id === "income_dependency")?.allowsUnsure).toBe(true)

        // Both earlier answers must allow it: «Μόνο εγώ» hides it…
        expect(computePath({ people: { people: ["only_me"] }, income: { income: "employed" } })).not.toContain("income_dependency")
        // …and so does an income nobody could live on.
        expect(computePath({ people: { people: ["partner"] }, income: { income: "not_working" } })).not.toContain("income_dependency")
        expect(computePath({ people: { people: ["children"], childrenCount: "1" }, income: { income: "student_other" } })).not.toContain("income_dependency")
        // A partner and a wage: asked. A pension the household leans on: asked.
        expect(computePath({ people: { people: ["partner"] }, income: { income: "employed" } })).toContain("income_dependency")
        expect(computePath({ people: { people: ["parents_or_others"] }, income: { income: "business" } })).toContain("income_dependency")
        expect(computePath({ people: { people: ["children"], childrenCount: "2" }, income: { income: "retired" } })).toContain("income_dependency")
        // «Δεν είμαι σίγουρος/η» about who depends on you is not «only me».
        expect(computePath({ people: { people: [], unsure: true }, income: { income: "self_employed" } })).toContain("income_dependency")
        // Unanswered earlier steps keep it on the longest path.
        expect(computePath({ people: { people: ["partner"] } })).toContain("income_dependency")
        expect(computePath({ income: { income: "employed" } })).toContain("income_dependency")

        // The walk goes through it and comes out at obligations.
        const answers: ProtectionAnswers = { people: { people: ["partner"] }, income: { income: "employed" } }
        expect(nextStep("income", answers)).toBe("income_dependency")
        expect(nextStep("income_dependency", answers)).toBe("obligations")
        expect(previousStep("obligations", answers)).toBe("income_dependency")
        // Hidden: income goes straight to obligations, and back skips it.
        const solo: ProtectionAnswers = { people: { people: ["only_me"] }, income: { income: "employed" } }
        expect(nextStep("income", solo)).toBe("obligations")
        expect(previousStep("obligations", solo)).toBe("income")
    })

    it("«Βήμα n από m»: the denominator is constant and n never grows on a conditional screen", () => {
        const total = COUNTED_STEPS.length
        expect(total).toBe(10)
        for (const step of STEPS) {
            const p = progressFor(step.id)
            if (["map", "upload", "advisor"].includes(step.id)) { expect(p).toBeNull(); continue }
            expect(p?.total).toBe(total)
        }
        // orientation shows the number of the step it follows; plans that of changes.
        expect(progressFor("orientation")?.index).toBe(progressFor("intent")?.index)
        expect(progressFor("income_dependency")?.index).toBe(progressFor("income")?.index)
        expect(progressFor("obligations")?.index).toBe((progressFor("income")?.index ?? 0) + 1)
        expect(progressFor("plans")?.index).toBe(progressFor("changes")?.index)
        expect(progressFor("uncertainty_reason")?.index).toBe(progressFor("confidence")?.index)
        expect(progressFor("guidance")?.index).toBe(total)
    })

    it("back walks the same predicted path", () => {
        const answers: ProtectionAnswers = { intent: { intent: "help_me" } }
        expect(previousStep("people", answers)).toBe("orientation")
        expect(previousStep("intent", answers)).toBeNull()
    })

    it("resumes at the first screen without an answer", () => {
        expect(firstOpenStep({}, [])).toBe("intent")
        expect(firstOpenStep({ intent: { intent: "find_gaps" } }, ["intent"])).toBe("people")
        expect(firstOpenStep({ intent: { intent: "find_gaps" }, people: { people: ["only_me"] } }, ["intent", "people"])).toBe("home")
        // An unsure answer counts as answered through answeredSteps.
        expect(firstOpenStep({ intent: { intent: "find_gaps" } }, ["intent", "people"])).toBe("home")
    })
})
