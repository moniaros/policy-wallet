import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth-helpers", () => ({ getAuthenticatedUser: vi.fn(async () => ({ dbUser: { id: "u1", roles: "policyholder" } })) }))
vi.mock("@/lib/partner-offers/catalog", () => ({
    getOffersForUser: vi.fn(async () => ({
        unlocked: [{ id: "o-link", redemptionMethod: "link" }],
        locked: [{ id: "o-locked", redemptionMethod: "link" }],
    })),
}))
vi.mock("@/lib/db", () => ({
    db: {
        partnerReferral: { findFirst: vi.fn(), create: vi.fn(async () => ({})) },
        partnerOffer: { findUnique: vi.fn(async () => ({ vendorId: "v1" })) },
    },
}))

import { db } from "@/lib/db"
import { recordPartnerReferral } from "@/app/(protected)/benefits/actions"

beforeEach(() => vi.clearAllMocks())

/** Owner decision 2026-09-24: record use of a partner offer — nothing more. */
describe("recordPartnerReferral", () => {
    it("records an offer the person may use, with its vendor and method", async () => {
        vi.mocked(db.partnerReferral.findFirst).mockResolvedValue(null)
        expect(await recordPartnerReferral({ offerId: "o-link", method: "link" })).toEqual({ ok: true })
        expect(vi.mocked(db.partnerReferral.create).mock.calls[0][0]).toEqual({ data: { userId: "u1", offerId: "o-link", vendorId: "v1", method: "link" } })
    })
    it("refuses a locked offer, an unknown one, and a method the offer does not have", async () => {
        expect(await recordPartnerReferral({ offerId: "o-locked", method: "link" })).toEqual({ error: "NOT_FOUND" })
        expect(await recordPartnerReferral({ offerId: "nope", method: "link" })).toEqual({ error: "NOT_FOUND" })
        expect(await recordPartnerReferral({ offerId: "o-link", method: "phone" })).toEqual({ error: "NOT_FOUND" })
        expect(db.partnerReferral.create).not.toHaveBeenCalled()
    })
    it("one row per offer per Athens day", async () => {
        vi.mocked(db.partnerReferral.findFirst).mockResolvedValue({ id: "r1" } as any)
        expect(await recordPartnerReferral({ offerId: "o-link", method: "link" })).toEqual({ ok: true })
        expect(db.partnerReferral.create).not.toHaveBeenCalled()
    })
})
