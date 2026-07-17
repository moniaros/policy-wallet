import { describe, it, expect } from "vitest"
import {
    isConsentedRelationship,
    isPhantomCustomer,
    agentMaySeeCustomerIdentity,
} from "@/lib/agent-consent"

const phantom = { password: null, emailVerified: null }
const realWithPassword = { password: "hash", emailVerified: null }
const realVerified = { password: null, emailVerified: new Date("2026-01-01") }

describe("isConsentedRelationship", () => {
    it("true only when activationStatus is 'activated' (the redeemInvite state)", () => {
        expect(isConsentedRelationship({ activationStatus: "activated" })).toBe(true)
    })
    it("false for invited / no_policies / null", () => {
        expect(isConsentedRelationship({ activationStatus: "invited" })).toBe(false)
        expect(isConsentedRelationship({ activationStatus: "no_policies" })).toBe(false)
        expect(isConsentedRelationship({})).toBe(false)
        expect(isConsentedRelationship(null)).toBe(false)
    })
})

describe("isPhantomCustomer", () => {
    it("true only with no password and no verified email", () => {
        expect(isPhantomCustomer(phantom)).toBe(true)
        expect(isPhantomCustomer(realWithPassword)).toBe(false)
        expect(isPhantomCustomer(realVerified)).toBe(false)
    })
})

describe("agentMaySeeCustomerIdentity", () => {
    it("consented real customer → visible", () => {
        expect(agentMaySeeCustomerIdentity({ activationStatus: "activated" }, realWithPassword, 0)).toBe(true)
    })
    it("agent-created phantom → visible even without consent", () => {
        expect(agentMaySeeCustomerIdentity({ activationStatus: "no_policies" }, phantom, 0)).toBe(true)
    })
    it("has ≥1 visible policy → visible (legitimately managed)", () => {
        expect(agentMaySeeCustomerIdentity({ activationStatus: "invited" }, realWithPassword, 1)).toBe(true)
    })
    it("LEAK CASE — unconsented real user, no visible policy → hidden", () => {
        // agent typed a stranger's email → invited relationship, real account,
        // no policy the agent may see: identity must stay masked.
        expect(agentMaySeeCustomerIdentity({ activationStatus: "invited" }, realWithPassword, 0)).toBe(false)
        expect(agentMaySeeCustomerIdentity({ activationStatus: "no_policies" }, realVerified, 0)).toBe(false)
    })
})
