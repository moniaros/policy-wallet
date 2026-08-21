/**
 * Live public promotions — one definition, used by the page and the tests.
 *
 * A promotion is a public claim with an expiry date, which makes it the kind
 * of copy that rots quietly: the code stops working in Stripe and the banner
 * keeps advertising it. So the end date lives here as a real Date, the banner
 * derives its own visibility from it, and a test fails once the promotion is
 * past its end so the removal is a build failure rather than a discovery.
 */
import type { StripeMode } from "@/lib/pricing/stripe-mode"

export interface PublicPromotion {
    /** The customer-facing code, exactly as it must be typed at checkout. */
    code: string
    /** Which audience's checkout accepts it. B2C checkout does not render a
     *  promotion-code field at all (lib/billing.ts sets allow_promotion_codes
     *  only for `agent` plans), so advertising this to consumers would be a
     *  promise the checkout cannot keep. */
    audience: "agent"
    percentOff: number
    /** Repeating discount duration, in monthly billing periods. */
    durationMonths: number
    /** Last moment the code is redeemable — 23:59 Europe/Athens on the closing
     *  day, which is 20:59Z while Greece is on EEST. Mirrors `expires_at` on
     *  the Stripe promotion code exactly. */
    endsAt: Date
    /** New subscribers only (Stripe `restrictions.first_time_transaction`). */
    newSubscribersOnly: boolean
    /**
     * The Stripe modes this code actually EXISTS in.
     *
     * A promotion advertised in a mode where it does not resolve sends the
     * customer to a checkout that rejects the code they just read. Listing the
     * modes here, and filtering on the mode the deployed build is configured
     * for, is what stops the banner outliving the object.
     */
    availableIn: readonly StripeMode[]
}

export const END_OF_SUMMER_2026: PublicPromotion = {
    code: "ENDOFSUMMER26",
    audience: "agent",
    percentOff: 25,
    durationMonths: 12,
    endsAt: new Date("2026-08-31T20:59:00Z"),
    newSubscribersOnly: true,
    // Created in BOTH modes 2026-08-21:
    //   test  promo_1U6g1q1AXSEXxkcgVPqaLs6y  (coupon uD1zw9EX)
    //   live  promo_1U6jES1JRuUbwXlyN3KQK5Ys  (coupon KoRxXvUh)
    availableIn: ["test", "live"],
}

/** Every promotion the site may advertise. */
export const PUBLIC_PROMOTIONS: readonly PublicPromotion[] = [END_OF_SUMMER_2026]

/**
 * Promotions that may be ADVERTISED: right audience, not expired, and present
 * in the Stripe mode this build charges in.
 *
 * `stripeMode` is required rather than defaulted. A default would silently
 * advertise in an unconfigured build — which is exactly the failure this
 * function exists to prevent, and it would fail open.
 */
export function activePromotions(
    audience: PublicPromotion["audience"],
    stripeMode: StripeMode,
    now: Date = new Date()
): PublicPromotion[] {
    if (stripeMode === "unconfigured") return []
    return PUBLIC_PROMOTIONS.filter(
        (p) => p.audience === audience && p.endsAt > now && p.availableIn.includes(stripeMode)
    )
}

/** "31 Αυγούστου 2026" / "31 August 2026" — the date a reader can act on. */
export function formatPromotionEnd(promotion: PublicPromotion, locale: "el" | "en"): string {
    return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Athens",
    }).format(promotion.endsAt)
}
