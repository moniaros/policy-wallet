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
