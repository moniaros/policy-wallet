import { describe, it, expect } from "vitest"
import {
    isConsentedRelationship,
    isPhantomCustomer,
    agentMaySeeCustomerIdentity,
    presentCustomerIdentity,
} from "@/lib/agent-consent"

const phantom = { hasPassword: false, emailVerified: null }
const realWithPassword = { hasPassword: true, emailVerified: null }
const realVerified = { hasPassword: false, emailVerified: new Date("2026-01-01") }

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

describe("presentCustomerIdentity — the ONE serialization path", () => {
    const customer = {
        name: "Γιώργος Παπαδόπουλος",
        email: "gp@example.com",
        image: "https://cdn/avatar.png",
        ...realWithPassword,
    }

    it("consented → real name and avatar", () => {
        const p = presentCustomerIdentity({ activationStatus: "activated" }, customer, 0)
        expect(p).toEqual({
            identityVisible: true,
            name: "Γιώργος Παπαδόπουλος",
            image: "https://cdn/avatar.png",
        })
    })

    it("unconsented real account → email stands in, avatar stripped", () => {
        const p = presentCustomerIdentity({ activationStatus: "invited" }, customer, 0)
        expect(p).toEqual({
            identityVisible: false,
            name: "gp@example.com",
            image: null,
        })
    })

    it("visible policy count unlocks identity", () => {
        const p = presentCustomerIdentity({ activationStatus: "invited" }, customer, 2)
        expect(p.identityVisible).toBe(true)
        expect(p.name).toBe("Γιώργος Παπαδόπουλος")
    })

    it("consented but nameless → email fallback", () => {
        const p = presentCustomerIdentity(
            { activationStatus: "activated" },
            { ...customer, name: null },
            0
        )
        expect(p.name).toBe("gp@example.com")
    })
})
