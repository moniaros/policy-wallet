import { describe, expect, it } from "vitest"
import { resolveProtectionOnboardingState, shouldEnterProtectionOnboarding } from "@/lib/services/protection-profile/state"

const row = (over: Partial<Parameters<typeof resolveProtectionOnboardingState>[0] & {}> = {}) => ({
    answers: null, answeredSteps: null, unsureSteps: null, completedAt: null, skippedAt: null, summaryViewedAt: null, uploadChoice: null,
    ...over,
})

describe("protection onboarding — resume", () => {
    it("no row → not started, at the first screen", () => {
        expect(resolveProtectionOnboardingState(null)).toMatchObject({ status: "not_started", stepId: "intent" })
    })

    it("a refresh mid-flow returns to the first unanswered screen with the answers kept", () => {
        const state = resolveProtectionOnboardingState(row({
            answers: { intent: { intent: "find_gaps" }, people: { people: ["children"], childrenCount: "1" } },
            answeredSteps: ["intent", "people"],
        }))
        expect(state.status).toBe("in_progress")
        expect(state.stepId).toBe("home")
        expect(state.answers.people).toEqual({ people: ["children"], childrenCount: "1" })
    })

    it("a completed profile resumes at the upload, then at the advisor once uploaded", () => {
        expect(resolveProtectionOnboardingState(row({ completedAt: new Date(), answeredSteps: ["intent"] })).stepId).toBe("upload")
        expect(resolveProtectionOnboardingState(row({ completedAt: new Date(), uploadChoice: "later" }))).toMatchObject({ status: "completed", stepId: "upload" })
        expect(resolveProtectionOnboardingState(row({ completedAt: new Date(), uploadChoice: "done" }))).toMatchObject({ status: "completed", stepId: "advisor" })
    })

    it("ignores garbage in the stored answers", () => {
        const state = resolveProtectionOnboardingState(row({ answers: { bogus: 1, people: "x", home: { home: "owned" } } as any }))
        expect(state.answers).toEqual({ home: { home: "owned" } })
    })
})

describe("the dashboard's one-time redirect", () => {
    const base = { completedAt: null, skippedAt: null, policyCount: 0, legacyCompleted: false }
    it("only a brand-new policyholder with nothing is sent in", () => {
        expect(shouldEnterProtectionOnboarding(base)).toBe(true)
        expect(shouldEnterProtectionOnboarding({ ...base, policyCount: 1 })).toBe(false)
        expect(shouldEnterProtectionOnboarding({ ...base, completedAt: new Date() })).toBe(false)
        expect(shouldEnterProtectionOnboarding({ ...base, skippedAt: new Date() })).toBe(false)
        expect(shouldEnterProtectionOnboarding({ ...base, legacyCompleted: true })).toBe(false)
    })
})
