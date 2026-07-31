import { describe, it, expect, vi } from "vitest"

// resolveAgentEntitlements queries db.subscription.findFirst; a null result
// resolves to agent_free. Mocking that lets us exercise the free-tier gate.
vi.mock("@/lib/db", () => ({
    db: { subscription: { findFirst: vi.fn(async () => null) } },
}))

import { AGENT_ENTITLEMENT_LIMITS, canAgentUseFeature } from "@/lib/subscription-entitlements"

/**
 * Locks the sold-vs-enforced agent tier contract enforced by the fencing wave
 * (PR #127). If a boolean flag silently moves tiers, or a cap changes, these
 * assertions fail — preventing a Pro feature from leaking to lower tiers again.
 */
describe("agent tier fencing — sold-vs-enforced contract", () => {
    const FENCED: Record<string, { free: boolean; starter: boolean; pro: boolean; agency: boolean }> = {
        commissionTracking:    { free: false, starter: false, pro: true, agency: true },
        renewalAutomation:     { free: false, starter: false, pro: true, agency: true },
        priorityQueue:         { free: false, starter: false, pro: true, agency: true },
        crossSellIntelligence: { free: false, starter: false, pro: true, agency: true },
        proposalFlow:          { free: false, starter: true, pro: true, agency: true },
        documentRequestFlow:   { free: false, starter: true, pro: true, agency: true },
        // sharedPolicyRoom is deliberately absent. It used to be pinned here as
        // free=false / paid=true, which locked in the SALE of a capability that
        // does not exist: `SharedPolicyRoomData` is an interface with zero
        // consumers. It is now false on every tier, asserted by
        // sold-feature-honesty.test.ts, until the room actually ships.
    }

    for (const [feature, tiers] of Object.entries(FENCED)) {
        it(`${feature} is gated: free=${tiers.free}, starter=${tiers.starter}, pro/agency=true`, () => {
            const L = AGENT_ENTITLEMENT_LIMITS as any
            expect(L.agent_free[feature]).toBe(tiers.free)
            expect(L.agent_starter[feature]).toBe(tiers.starter)
            expect(L.agent_pro[feature]).toBe(tiers.pro)
            expect(L.agency[feature]).toBe(tiers.agency)
        })
    }

    it("questionnaireTemplates cap: free 0, starter 5, pro/agency unlimited (null)", () => {
        expect(AGENT_ENTITLEMENT_LIMITS.agent_free.questionnaireTemplates).toBe(0)
        expect(AGENT_ENTITLEMENT_LIMITS.agent_starter.questionnaireTemplates).toBe(5)
        expect(AGENT_ENTITLEMENT_LIMITS.agent_pro.questionnaireTemplates).toBeNull()
        expect(AGENT_ENTITLEMENT_LIMITS.agency.questionnaireTemplates).toBeNull()
    })
})

describe("canAgentUseFeature — agent_free (no subscription) is fenced", () => {
    const paidOnlyFlags = [
        "commissionTracking",
        "renewalAutomation",
        "crossSellIntelligence",
        "priorityQueue",
        "proposalFlow",
        "documentRequestFlow",
        "sharedPolicyRoom",
    ] as const

    it("blocks every Starter/Pro-sold flag for a free agent", async () => {
        for (const flag of paidOnlyFlags) {
            expect(await canAgentUseFeature("free-agent", flag as any)).toBe(false)
        }
    })

    it("questionnaireTemplates (cap 0) resolves to false for a free agent", async () => {
        // number > 0 → true; 0 → false (the create path must enforce the count).
        expect(await canAgentUseFeature("free-agent", "questionnaireTemplates" as any)).toBe(false)
    })
})
