/**
 * Live public promotions — one definition, used by the page and the tests.
 *
 * A promotion is a public claim with an expiry date, which makes it the kind
 * of copy that rots quietly: the code stops working in Stripe and the banner
 * keeps advertising it. So the end date lives here as a real Date, the banner
 * derives its own visibility from it, and a test fails once the promotion is
 * past its end so the removal is a build failure rather than a discovery.
 */
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
}

export const END_OF_SUMMER_2026: PublicPromotion = {
    code: "ENDOFSUMMER26",
    audience: "agent",
    percentOff: 25,
    durationMonths: 12,
    endsAt: new Date("2026-08-31T20:59:00Z"),
    newSubscribersOnly: true,
}

/** Every promotion the site may advertise. */
export const PUBLIC_PROMOTIONS: readonly PublicPromotion[] = [END_OF_SUMMER_2026]

/** Promotions still live at `now`, for the audience given. */
export function activePromotions(
    audience: PublicPromotion["audience"],
    now: Date = new Date()
): PublicPromotion[] {
    return PUBLIC_PROMOTIONS.filter((p) => p.audience === audience && p.endsAt > now)
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
