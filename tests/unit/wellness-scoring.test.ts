import { describe, it, expect } from "vitest"
import { scoreAssessment, isCompleteAnswers, bandFor, ASSESSMENT_QUESTIONS } from "@/lib/wellness/scoring"
import { preventiveItemsFor, ageFromBand } from "@/lib/wellness/preventive"

/** Spec v2 §9.2 / §9.3 — deterministic, readable by hand, silent on missing answers. */
const LOW = { ageBand: "18_29", sex: "male", smoking: "never", activity: "high", bmiBand: "normal", bloodPressure: "normal", familyCardio: "no", familyDiabetes: "no", backPain: "no" }
const HIGH = { ageBand: "60_plus", sex: "female", smoking: "current", activity: "low", bmiBand: "obese", bloodPressure: "high", familyCardio: "yes", familyDiabetes: "yes", backPain: "often" }

describe("scoreAssessment", () => {
    it("the healthiest answers score low in every category, the riskiest elevated", () => {
        const low = scoreAssessment(LOW)
        const high = scoreAssessment(HIGH)
        expect(low.map((s) => s.band)).toEqual(["low", "low", "low"])
        expect(high.map((s) => s.band)).toEqual(["elevated", "elevated", "elevated"])
        for (const s of [...low, ...high]) expect(s.score).toBeGreaterThanOrEqual(0)
        for (const s of [...low, ...high]) expect(s.score).toBeLessThanOrEqual(100)
    })

    it("is a table, not a model: the same answers always give the same numbers", () => {
        expect(scoreAssessment(HIGH)).toEqual(scoreAssessment({ ...HIGH }))
        expect(scoreAssessment(LOW).find((s) => s.category === "cardiovascular")?.score).toBe(0)
    })

    it("recommends checks only above the low band, and only calendar ids", () => {
        const low = scoreAssessment(LOW)
        expect(low.find((s) => s.category === "metabolic")?.checks).toEqual([])
        expect(scoreAssessment(HIGH).find((s) => s.category === "cardiovascular")?.checks).toEqual(["blood_pressure", "lipid_panel"])
    })

    it("completeness demands every question answered from its own options", () => {
        expect(isCompleteAnswers(LOW)).toBe(true)
        expect(isCompleteAnswers({ ...LOW, smoking: "sometimes" })).toBe(false)
        expect(isCompleteAnswers({ ageBand: "18_29" })).toBe(false)
        expect(ASSESSMENT_QUESTIONS.length).toBe(9)
    })

    it("bands are contiguous", () => {
        expect(bandFor(0)).toBe("low"); expect(bandFor(24)).toBe("low")
        expect(bandFor(25)).toBe("moderate"); expect(bandFor(49)).toBe("moderate")
        expect(bandFor(50)).toBe("elevated"); expect(bandFor(100)).toBe("elevated")
    })
})

describe("preventive calendar", () => {
    it("keys off the assessment's age band and sex, and is empty without one", () => {
        expect(preventiveItemsFor(undefined, undefined)).toEqual([])
        expect(ageFromBand("50_59")).toBe(55)
        const ids = preventiveItemsFor("50_59", "female").map((i) => i.id)
        expect(ids).toEqual(expect.arrayContaining(["blood_pressure", "lipid_panel", "glucose", "cervical", "mammography", "colorectal"]))
        expect(preventiveItemsFor("50_59", "male").map((i) => i.id)).not.toContain("mammography")
        expect(preventiveItemsFor("18_29", "female").map((i) => i.id)).toEqual(["blood_pressure", "dental_cleaning", "cervical"])
    })
})
