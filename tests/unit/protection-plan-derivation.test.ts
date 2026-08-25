import { describe, it, expect } from "vitest"
import { buildProtectionPlan, type ProtectionPlanFacts } from "@/lib/services/protection-plan"

/**
 * Guards for the protection-plan derivation.
 *
 * The plan replaced the getting-started checklist, and the rule that matters
 * most survived the move: zero gaps without a completed analysis is "we have
 * not looked", never "no gaps". Progress must be derived only from recorded
 * facts — the derivation has no way to say "almost done" about anything.
 */

const NONE: ProtectionPlanFacts = {
    policyCount: 0,
    hasCompletedAnalysis: false,
    openGapCount: 0,
    hasAgent: false,
    notificationsEnabled: false,
    activeRecommendationIds: [],
    handledRecommendationCount: 0,
}

describe("buildProtectionPlan", () => {
    it("starts a new account at 0 of 5 with every setup step open", () => {
        const plan = buildProtectionPlan(NONE)
        expect(plan.steps).toHaveLength(5)
        expect(plan.completed).toBe(0)
        expect(plan.total).toBe(5)
        expect(plan.allDone).toBe(false)
        expect(plan.steps.every((s) => s.state === "open")).toBe(true)
    })

    it("keeps the gaps step open when no analysis ever ran, even at zero gaps", () => {
        const plan = buildProtectionPlan({ ...NONE, policyCount: 1, openGapCount: 0 })
        const gaps = plan.steps.find((s) => s.id === "gaps")
        expect(gaps?.state).toBe("open")
    })

    it("completes the gaps step only with a completed analysis and zero open gaps", () => {
        const looked = buildProtectionPlan({ ...NONE, policyCount: 1, hasCompletedAnalysis: true, openGapCount: 0 })
        expect(looked.steps.find((s) => s.id === "gaps")?.state).toBe("done")

        const openGaps = buildProtectionPlan({ ...NONE, policyCount: 1, hasCompletedAnalysis: true, openGapCount: 2 })
        expect(openGaps.steps.find((s) => s.id === "gaps")?.state).toBe("open")
    })

    it("adds each active recommendation as an open step and grows the total", () => {
        const plan = buildProtectionPlan({ ...NONE, activeRecommendationIds: ["r1", "r2"] })
        const recSteps = plan.steps.filter((s) => s.kind === "recommendation")
        expect(recSteps).toHaveLength(2)
        expect(recSteps.map((s) => s.id)).toEqual(["recommendation:r1", "recommendation:r2"])
        expect(recSteps.every((s) => s.state === "open" && s.href === "/protection")).toBe(true)
        expect(plan.total).toBe(7)
    })

    it("counts handled recommendations as completed work without adding steps", () => {
        const plan = buildProtectionPlan({ ...NONE, handledRecommendationCount: 3 })
        expect(plan.steps).toHaveLength(5)
        expect(plan.completed).toBe(3)
        expect(plan.total).toBe(8)
    })

    it("is all done when every setup step is done and no recommendation is active", () => {
        const plan = buildProtectionPlan({
            policyCount: 2,
            hasCompletedAnalysis: true,
            openGapCount: 0,
            hasAgent: true,
            notificationsEnabled: true,
            activeRecommendationIds: [],
            handledRecommendationCount: 2,
        })
        expect(plan.completed).toBe(plan.total)
        expect(plan.allDone).toBe(true)
    })

    it("routes setup steps where the checklist routed them", () => {
        const plan = buildProtectionPlan(NONE)
        const href = (id: string) => plan.steps.find((s) => s.id === id)?.href
        expect(href("upload")).toBe("/wallet/add")
        expect(href("analysis")).toBe("/protection")
        expect(href("gaps")).toBe("/protection")
        expect(href("agent")).toBe("/agent")
        expect(href("notifications")).toBe("/notifications")
    })
})
