import { describe, it, expect } from "vitest"
import { policyState, kindToState, isCountedLifecycle, GAP_EXPIRY_DAYS } from "@/lib/app/state"
import { computeVerdict, type VerdictPolicy, type VerdictFinding } from "@/lib/app/verdict"

const live = (id: string, over: Partial<VerdictPolicy> = {}): VerdictPolicy => ({
    id,
    lifecycle: "active",
    daysUntilExpiry: 200,
    neverAnalysed: false,
    analysisFailed: false,
    ...over,
})

describe("policyState — the three-state mapping", () => {
    it("a gap finding wins over everything", () => {
        expect(policyState({ lifecycle: "active", daysUntilExpiry: 200, findings: [{ kind: "gap" }, { kind: "review" }] })).toBe("gap")
    })
    it(`expiry within ${GAP_EXPIRY_DAYS} days is a gap even with nothing found`, () => {
        expect(policyState({ lifecycle: "expiring_soon", daysUntilExpiry: GAP_EXPIRY_DAYS, findings: [] })).toBe("gap")
        expect(policyState({ lifecycle: "expiring_soon", daysUntilExpiry: GAP_EXPIRY_DAYS + 1, findings: [] })).toBe("covered")
    })
    it("silence is review, never gap", () => {
        expect(policyState({ lifecycle: "active", daysUntilExpiry: 200, findings: [{ kind: "review" }] })).toBe("review")
        expect(policyState({ lifecycle: "unknown_duration", daysUntilExpiry: null, findings: [] })).toBe("review")
        expect(policyState({ lifecycle: "action_needed", daysUntilExpiry: 200, findings: [] })).toBe("review")
        expect(policyState({ lifecycle: "active", daysUntilExpiry: 200, findings: [], unresolvedFields: 1 })).toBe("review")
    })
    it("expired, cancelled and analyzing policies have no state and count nowhere", () => {
        expect(policyState({ lifecycle: "expired", daysUntilExpiry: -3, findings: [{ kind: "gap" }] })).toBeNull()
        expect(policyState({ lifecycle: "cancelled", daysUntilExpiry: 40, findings: [] })).toBeNull()
        expect(policyState({ lifecycle: "analyzing", daysUntilExpiry: null, findings: [] })).toBeNull()
        expect(isCountedLifecycle("expired")).toBe(false)
        expect(isCountedLifecycle("active")).toBe(true)
    })
    it("a finding's colour comes from its kind", () => {
        expect(kindToState("expiry")).toBe("gap")
        expect(kindToState("review")).toBe("review")
    })
})

describe("computeVerdict — counts of documents, never a judgement", () => {
    const family = { gapAnalysisPerDay: null }
    const free = { gapAnalysisPerDay: 0 }

    it("covered + gap + review sum to the active policies; expired excluded", () => {
        const policies = [live("a"), live("b", { daysUntilExpiry: 10 }), live("c", { lifecycle: "unknown_duration", daysUntilExpiry: null }), live("x", { lifecycle: "expired", daysUntilExpiry: -30 })]
        const v = computeVerdict(policies, [], family)
        expect(v.counts).toEqual({ covered: 1, gap: 1, review: 1 })
        expect(v.active).toBe(3)
        expect(v.expired).toBe(1)
        expect(v.counts.covered + v.counts.gap + v.counts.review).toBe(v.active)
        expect(v.perPolicy.x).toBeUndefined()
    })

    it("is quiet only when nothing is due now, nothing expires within 30 days, and the check covered the wallet", () => {
        const ok = computeVerdict([live("a", { daysUntilExpiry: 37 }), live("b")], [], family)
        expect(ok.quiet).toBe(true)
        expect(ok.nextExpiryDays).toBe(37)
        expect(ok.nextExpiryPolicyId).toBe("a")

        const soon = computeVerdict([live("a", { daysUntilExpiry: 30 })], [], family)
        expect(soon.quiet).toBe(false)

        const now: VerdictFinding = { policyId: "a", kind: "gap", tier: "now" }
        expect(computeVerdict([live("a")], [now], family).quiet).toBe(false)

        const unread = computeVerdict([live("a"), live("b", { neverAnalysed: true })], [], family)
        expect(unread.quiet).toBe(false)
        expect(unread.notChecked).toContain("policies_not_analysed")

        const failed = computeVerdict([live("a", { analysisFailed: true })], [], family)
        expect(failed.quiet).toBe(false)
        expect(failed.notChecked).toContain("readings_failed")
    })

    it("an empty wallet is never quiet", () => {
        expect(computeVerdict([], [], family).quiet).toBe(false)
    })

    it("states what the plan did not check instead of a silent all-clear (A-13)", () => {
        const v = computeVerdict([live("a")], [], free)
        expect(v.notChecked).toContain("gap_detection_not_in_plan")
        expect(computeVerdict([live("a")], [], family).notChecked).not.toContain("gap_detection_not_in_plan")
    })

    it("never produces a percentage", () => {
        const v = computeVerdict([live("a"), live("b")], [], family)
        expect(JSON.stringify(v)).not.toMatch(/%/)
        expect(Object.values(v.counts).every(Number.isInteger)).toBe(true)
    })
})
