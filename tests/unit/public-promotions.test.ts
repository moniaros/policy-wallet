import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import {
    END_OF_SUMMER_2026,
    PUBLIC_PROMOTIONS,
    activePromotions,
    formatPromotionEnd,
} from "@/lib/pricing/promotions"

/**
 * A promotion is a public claim with a deadline, which is the kind of copy
 * that rots silently: the code stops working in Stripe and the banner keeps
 * advertising it to people who then type it and get an error at checkout.
 *
 * These tests hold the four things that must stay true together — the code's
 * audience, its restrictions, its end date, and the fact that the page can
 * only show it while it is live.
 */
describe("ENDOFSUMMER26", () => {
    it("is B2B-only, and the B2C checkout has no field to enter it", () => {
        expect(END_OF_SUMMER_2026.audience).toBe("agent")

        // The enforcement is not a label — it is that consumer checkout never
        // sets allow_promotion_codes, so the box does not render at all.
        const billing = readFileSync("lib/billing.ts", "utf-8")
        expect(billing).toMatch(/allow_promotion_codes:\s*plan\.planType === "agent"/)

        expect(activePromotions("agent", new Date("2026-08-21T00:00:00Z"))).toHaveLength(1)
        // There is no "policyholder" audience for promotions, by type and by data.
        expect(PUBLIC_PROMOTIONS.every((p) => p.audience === "agent")).toBe(true)
    })

    it("is 25% off for 12 months, new subscribers only", () => {
        expect(END_OF_SUMMER_2026.percentOff).toBe(25)
        expect(END_OF_SUMMER_2026.durationMonths).toBe(12)
        expect(END_OF_SUMMER_2026.newSubscribersOnly).toBe(true)
    })

    it("ends 23:59 Europe/Athens on 31 August 2026", () => {
        // Greece is on EEST (UTC+3) in August, so 23:59 local is 20:59Z. Storing
        // the local wall time as if it were UTC would silently extend the offer
        // by three hours — small, and exactly the kind of thing nobody checks.
        expect(END_OF_SUMMER_2026.endsAt.toISOString()).toBe("2026-08-31T20:59:00.000Z")

        const athens = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Athens",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(END_OF_SUMMER_2026.endsAt)
        expect(athens).toBe("23:59")
    })

    it("stops being advertised the moment it expires", () => {
        const justBefore = new Date("2026-08-31T20:58:00Z")
        const justAfter = new Date("2026-08-31T21:00:00Z")
        expect(activePromotions("agent", justBefore)).toHaveLength(1)
        expect(
            activePromotions("agent", justAfter),
            "the banner must disappear on its own — a promotion outliving its " +
                "Stripe code is a code that errors at checkout"
        ).toHaveLength(0)
    })

    it("renders the end date a reader can act on, in both languages", () => {
        expect(formatPromotionEnd(END_OF_SUMMER_2026, "en")).toBe("31 August 2026")
        // Greek genitive month, via Intl rather than a hand-typed table.
        expect(formatPromotionEnd(END_OF_SUMMER_2026, "el")).toMatch(/31.*2026/)
    })

    it("the pricing page only renders promotions for the agent tab", () => {
        const page = readFileSync("app/(public)/pricing/PricingPageClient.tsx", "utf-8")
        expect(page).toMatch(/aud === "agent" &&\s*\n?\s*activePromotions\("agent"\)/)
    })
})
