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

    it("«Βήμα n από m»: the denominator is constant and n never grows on a conditional screen", () => {
        const total = COUNTED_STEPS.length
        for (const step of STEPS) {
            const p = progressFor(step.id)
            if (["map", "upload", "advisor"].includes(step.id)) { expect(p).toBeNull(); continue }
            expect(p?.total).toBe(total)
        }
        // orientation shows the number of the step it follows; plans that of changes.
        expect(progressFor("orientation")?.index).toBe(progressFor("intent")?.index)
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
