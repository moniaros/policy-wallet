/**
 * Which Stripe mode this build is configured to charge in.
 *
 * SERVER ONLY — it reads the secret key's PREFIX, never its value, and never
 * returns anything but the mode. Callers pass the resulting string to client
 * components; the key itself must not cross that boundary.
 *
 * This exists because of a live false claim. policywallet.gr advertised
 * ENDOFSUMMER26 — a dated, percentage commercial offer — while production was
 * configured against a sandbox account that cannot take a real payment. An
 * offer that cannot be honoured is not a marketing detail; it is a public
 * claim the code does not support, which this repository treats as a defect.
 *
 * The CATALOG COUPLING rule in CLAUDE.md says plan rows must never lead the
 * code and the Stripe objects. A promotion is the same coupling with a sharper
 * edge, because it also has an expiry date: the banner outlives the code the
 * moment either side moves.
 */
export type StripeMode = "test" | "live" | "unconfigured"

export function configuredStripeMode(
    secretKey: string | undefined = process.env.STRIPE_SECRET_KEY
): StripeMode {
    if (!secretKey) return "unconfigured"
    if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) return "live"
    if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) return "test"
    return "unconfigured"
}

/** Why a paid plan may not be offered for purchase right now. */
export type CheckoutBlockReason = "sandbox_in_production" | "unconfigured"

export interface CheckoutAvailability {
    /** May the public surface present paid plans as buyable? */
    available: boolean
    reason: CheckoutBlockReason | null
}

/**
 * May this deployment actually take money — the question the pricing page has
 * to answer before it offers a plan for sale.
 *
 * CLAUDE.md's CATALOG COUPLING rule carried a standing task: «make the public
 * pricing surface refuse to render any plan whose stripe_price_id does not
 * resolve in LIVE mode». Written literally that guards the wrong field.
 * `lib/billing.ts` builds checkout line items from inline `price_data` — the
 * amount comes from the plan ROW, and `Plan.stripePriceId` is only ever
 * written back FROM Stripe by the webhook. No price object has to exist for a
 * charge to happen, so a plan can have an empty `stripe_price_id` and still
 * charge correctly, and a plan can have a perfectly good one and charge
 * nothing. The field is not what makes a price chargeable.
 *
 * What actually makes an advertised price unchargeable is the MODE. Checkout
 * in test mode produces a sandbox session: the visitor sees a real-looking
 * Stripe page, can type a card, and returns to a success screen having paid
 * nothing. That is the ENDOFSUMMER26 defect again — a public claim the code
 * does not support — and on 2026-09-10 production was serving exactly it:
 * `/pricing` advertised the paid tiers with a working buy button while
 * `STRIPE_SECRET_KEY` was a test key.
 *
 * Test mode is CORRECT everywhere else, which is the whole point of it, so the
 * gate is deliberately not «test mode is bad»: it is «a PRODUCTION deployment
 * must not offer a purchase it cannot complete». Local dev, preview and
 * `next start` keep a working sandbox checkout.
 */
export function publicCheckoutAvailability(
    mode: StripeMode = configuredStripeMode(),
    vercelEnv: string | undefined = process.env.VERCEL_ENV
): CheckoutAvailability {
    if (mode === "live") return { available: true, reason: null }
    // Unconfigured never charges anywhere — checkout would throw, so offering
    // it is a broken promise in every environment, not only on production.
    if (mode === "unconfigured") return { available: false, reason: "unconfigured" }
    // Sandbox: correct off production, a false offer on it.
    if (vercelEnv === "production") return { available: false, reason: "sandbox_in_production" }
    return { available: true, reason: null }
}
