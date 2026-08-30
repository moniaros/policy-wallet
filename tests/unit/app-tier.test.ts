import { describe, it, expect } from "vitest"
import { assignTier, capNow, sortByTier, NOW_CAP } from "@/lib/app/tier"

describe("assignTier — when, never how bad", () => {
    it("expiry ≤ 14 days is now; ≤ 45 is this month; else later", () => {
        expect(assignTier({ kind: "expiry", daysUntilExpiry: 14 })).toBe("now")
        expect(assignTier({ kind: "expiry", daysUntilExpiry: 15 })).toBe("month")
        expect(assignTier({ kind: "expiry", daysUntilExpiry: 45 })).toBe("month")
        expect(assignTier({ kind: "expiry", daysUntilExpiry: 46 })).toBe("later")
        expect(assignTier({ kind: "expiry", daysUntilExpiry: null })).toBe("later")
    })
    it("a confirmed gap on a primary asset is now only when the user's own profile supports the exposure", () => {
        const base = { kind: "gap" as const, daysUntilExpiry: null, confirmedGap: true, onPrimaryAsset: true }
        expect(assignTier({ ...base, profileSupportsExposure: true })).toBe("now")
        expect(assignTier({ ...base, profileSupportsExposure: false })).toBe("later")
        expect(assignTier({ ...base, confirmedGap: false, profileSupportsExposure: true })).toBe("later")
    })
    it("a review item is now only when it blocks a now finding; a missing limit is this month", () => {
        expect(assignTier({ kind: "review", daysUntilExpiry: null, blocksNowFinding: true })).toBe("now")
        expect(assignTier({ kind: "review", daysUntilExpiry: null, missingLimit: true })).toBe("month")
        expect(assignTier({ kind: "review", daysUntilExpiry: null })).toBe("later")
    })
    it("a price change above the published index is this month", () => {
        expect(assignTier({ kind: "review", daysUntilExpiry: null, priceChangeAboveIndex: true })).toBe("month")
    })
})

describe("ordering and the cap", () => {
    const items = [
        { id: "c", tier: "later" as const, daysUntilExpiry: 3 },
        { id: "a", tier: "now" as const, daysUntilExpiry: 9 },
        { id: "b", tier: "now" as const, daysUntilExpiry: 2 },
        { id: "d", tier: "now" as const, daysUntilExpiry: null },
        { id: "e", tier: "now" as const, daysUntilExpiry: 5 },
        { id: "f", tier: "month" as const, daysUntilExpiry: 20 },
    ]
    it("sorts by tier then soonest expiry, unknown expiry last", () => {
        expect(sortByTier(items).map((i) => i.id)).toEqual(["b", "e", "a", "d", "f", "c"])
    })
    it(`caps now at ${NOW_CAP} and states the overflow`, () => {
        const { shown, overflow } = capNow(items)
        expect(shown.map((i) => i.id)).toEqual(["b", "e", "a"])
        expect(overflow).toBe(1)
    })
})
