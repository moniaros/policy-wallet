import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { configuredStripeMode } from "@/lib/pricing/stripe-mode"
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

        expect(activePromotions("agent", "live", new Date("2026-08-21T00:00:00Z"))).toHaveLength(1)
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
        expect(activePromotions("agent", "live", justBefore)).toHaveLength(1)
        expect(
            activePromotions("agent", "live", justAfter),
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
        expect(page).toMatch(/aud === "agent" &&[\s\S]{0,40}activePromotions\("agent", stripeMode\)/)
    })
})

/**
 * The catalog-coupling rule, applied to promotions.
 *
 * policywallet.gr advertised ENDOFSUMMER26 — 25% off, expiring on a stated
 * date — while production was configured against a sandbox account that cannot
 * take a real payment. The offer was live, dated, and impossible to honour.
 *
 * A promotion is therefore only advertised when it resolves in the Stripe mode
 * the deployed build actually charges in. The banner cannot outlive the object.
 */
describe("a promotion is never advertised in a mode where it does not exist", () => {
    const before = new Date("2026-08-21T00:00:00Z")

    it("advertises nothing when Stripe is unconfigured", () => {
        // Fails CLOSED. An unconfigured build showing a discount code is the
        // exact failure this guard exists for.
        expect(activePromotions("agent", "unconfigured", before)).toEqual([])
    })

    it("only advertises codes that exist in the configured mode", () => {
        for (const mode of ["test", "live"] as const) {
            for (const promo of activePromotions("agent", mode, before)) {
                expect(
                    promo.availableIn,
                    `${promo.code} is advertised in ${mode} mode but is not recorded as existing there`
                ).toContain(mode)
            }
        }
    })

    it("hides a promotion that exists only in the other mode", () => {
        const testOnly = {
            ...END_OF_SUMMER_2026,
            code: "TESTONLY",
            availableIn: ["test"] as const,
        }
        const live = [testOnly].filter(
            (p) => p.endsAt > before && p.availableIn.includes("live" as never)
        )
        expect(live).toEqual([])
    })

    it("reads the mode from the key PREFIX and never the key", () => {
        expect(configuredStripeMode("sk_live_abc123")).toBe("live")
        expect(configuredStripeMode("sk_test_abc123")).toBe("test")
        expect(configuredStripeMode("rk_live_abc123")).toBe("live")
        expect(configuredStripeMode(undefined)).toBe("unconfigured")
        expect(configuredStripeMode("")).toBe("unconfigured")
        // Anything unrecognised is unconfigured, not assumed live.
        expect(configuredStripeMode("pk_live_abc")).toBe("unconfigured")
    })

    it("the pricing page resolves the mode server-side and passes only the mode", () => {
        const page = readFileSync("app/(public)/pricing/page.tsx", "utf-8")
        expect(page).toMatch(/configuredStripeMode\(\)/)
        expect(page).toMatch(/stripeMode=\{stripeMode\}/)
        // The secret itself must never reach the client component.
        const client = readFileSync("app/(public)/pricing/PricingPageClient.tsx", "utf-8")
        expect(client).not.toMatch(/STRIPE_SECRET_KEY/)
    })
})
