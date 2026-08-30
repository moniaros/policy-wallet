import { describe, it, expect } from "vitest"
import { largestSingleLimit, paidTwicePairs, computeMoneyLine, type MoneyPolicy } from "@/lib/app/money"
import { personState, summariseHousehold } from "@/lib/app/household"
import { badgeCount } from "@/lib/app/badge"
import { shouldReopen, visibleAfterDismissal } from "@/lib/app/dismissal"
import { STREAM_OF_EVENT, streamOf } from "@/lib/app/streams"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"

const in90 = new Date(Date.now() + 90 * 86_400_000)
const motor = (id: string, plate: string, premium = 300): MoneyPolicy => ({
    id,
    lineOfBusiness: "motor",
    status: "active",
    insurerName: "Test Insurer",
    policyNumber: `P-${id}`,
    startDate: new Date("2026-01-01"),
    endDate: in90,
    premiumAmount: premium,
    acordData: { vehicle: { plateNumber: plate } },
    coverages: [
        { name: "Αστική ευθύνη", limits: [{ amount: 1_300_000, currency: "EUR", basis: "per_event" }] },
        { name: "Οδική βοήθεια", limits: [{ unlimited: true, basis: "per_period" }] },
    ],
})

describe("money — three figures, each with its warrant", () => {
    it("protects-up-to is the largest SINGLE limit, never a sum, and names where it came from", () => {
        const a = motor("a", "ΙΚΖ-4821")
        const b = motor("b", "ΑΒΓ-1234")
        b.coverages = [{ name: "Πυρκαγιά", limits: [{ amount: 250_000, currency: "EUR", basis: "per_event" }] }]
        const best = largestSingleLimit([a, b])
        expect(best).toEqual({ amount: 1_300_000, currency: "EUR", policyId: "a", coverName: "Αστική ευθύνη" })
        expect(best!.amount).not.toBe(1_300_000 + 250_000)
    })
    it("ignores unlimited, non-EUR and expired policies", () => {
        const a = motor("a", "ΙΚΖ-4821")
        a.endDate = new Date("2020-01-01")
        a.acordData = { ...(a.acordData as Record<string, unknown>), policy: { expirationDate: "2020-01-01" } }
        expect(largestSingleLimit([a])).toBeNull()
        const c = motor("c", "ΧΥΖ-9999")
        c.coverages = [{ name: "USD cover", limits: [{ amount: 5_000_000, currency: "USD", basis: "per_event" }] }]
        expect(largestSingleLimit([c])).toBeNull()
    })
    it("paid-twice fires only on the SAME insured subject, once per pair, and carries an amount only from a tariff", () => {
        const a = motor("a", "ΙΚΖ-4821")
        const b = motor("b", "ΙΚΖ-4821")
        const c = motor("c", "ΑΒΓ-1234")
        const pairs = paidTwicePairs([a, b, c])
        expect(pairs).toHaveLength(1)
        expect([pairs[0].policyId, pairs[0].partnerPolicyId].sort()).toEqual(["a", "b"])
        expect(pairs[0].amountPerYear).toBeUndefined()
        const withTariff = paidTwicePairs([a, b, c], new Map([["b", 84]]))
        expect(withTariff[0].amountPerYear).toBe(84)
    })
    it("two different cars are never a duplicate", () => {
        expect(paidTwicePairs([motor("a", "ΙΚΖ-4821"), motor("b", "IKZ-4821")])).toHaveLength(0)
    })
    it("the money line reuses the premium footprint for what is paid", () => {
        const line = computeMoneyLine([motor("a", "ΙΚΖ-4821", 300), motor("b", "ΑΒΓ-1234", 200)])
        expect(line.paidPerYear).toBe(500)
    })
})

describe("household — a person's state from the policies naming them", () => {
    it("a dependant with no policy is review, never gap; a non-dependant with none is covered", () => {
        expect(personState({ id: "p", relation: "child", isDependant: true, policyStates: [] })).toBe("review")
        expect(personState({ id: "p", relation: "partner", isDependant: false, policyStates: [] })).toBe("covered")
    })
    it("any gap makes the person gap; any review makes them review; else covered", () => {
        expect(personState({ id: "p", relation: "self", isDependant: false, policyStates: ["covered", "gap", "review"] })).toBe("gap")
        expect(personState({ id: "p", relation: "self", isDependant: false, policyStates: ["covered", "review"] })).toBe("review")
        expect(personState({ id: "p", relation: "self", isDependant: false, policyStates: ["covered"] })).toBe("covered")
    })
    it("summarises the household honestly (empty is not 'all covered')", () => {
        expect(summariseHousehold([]).allCovered).toBe(false)
        expect(summariseHousehold([{ id: "a", relation: "self", isDependant: false, policyStates: ["covered"] }]).allCovered).toBe(true)
    })
})

describe("badge — unread protection items only", () => {
    it("counts unread in_app items in the protection stream and nothing else", () => {
        expect(
            badgeCount([
                { eventType: "policy_expiring", channel: "in_app", readAt: null },
                { eventType: "policy_expiring", channel: "in_app", readAt: new Date() },
                { eventType: "policy_expiring", channel: "email", readAt: null },
                { eventType: "policy_analyzed", channel: "in_app", readAt: null },
                { eventType: "weekly_digest", channel: "in_app", readAt: null },
                { eventType: "unknown_future_event", channel: "in_app", readAt: null },
            ])
        ).toBe(1)
    })
})

describe("streams — every registry event is assigned", () => {
    it("assigns every notification event exactly once and knows no phantom events", () => {
        const registry = Object.keys(NOTIFICATION_EVENTS).sort()
        const assigned = Object.keys(STREAM_OF_EVENT).sort()
        expect(assigned).toEqual(registry)
    })
    it("an unknown event can never inflate the badge", () => {
        expect(streamOf("something_new")).toBe("meanwhile")
    })
    it("a failed reading is a protection fact; a completed one is telemetry", () => {
        expect(streamOf("policy_analysis_failed")).toBe("protection")
        expect(streamOf("policy_analyzed")).toBe("meanwhile")
    })
})

describe("dismissal memory", () => {
    const d = "2026-08-01T00:00:00Z"
    it("stays dismissed while nothing changed", () => {
        expect(shouldReopen({ dismissedAt: d, documentChangedAt: "2026-07-01T00:00:00Z" }, new Date("2026-08-30"))).toBe(false)
    })
    it("reopens on a later document change, profile change, or a passed expiry", () => {
        expect(shouldReopen({ dismissedAt: d, documentChangedAt: "2026-08-15T00:00:00Z" }, new Date("2026-08-30"))).toBe(true)
        expect(shouldReopen({ dismissedAt: d, profileChangedAt: "2026-08-15T00:00:00Z" }, new Date("2026-08-30"))).toBe(true)
        expect(shouldReopen({ dismissedAt: d, expiryAt: "2026-08-20T00:00:00Z" }, new Date("2026-08-30"))).toBe(true)
        expect(shouldReopen({ dismissedAt: d, expiryAt: "2026-09-20T00:00:00Z" }, new Date("2026-08-30"))).toBe(false)
    })
    it("filters a list by hash", () => {
        const fs = [{ hash: "a" }, { hash: "b" }]
        const out = visibleAfterDismissal(fs, new Map([["a", { dismissedAt: d }]]), new Date("2026-08-30"))
        expect(out.map((f) => f.hash)).toEqual(["b"])
    })
})
