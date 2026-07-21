import { z } from "zod"
import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { stripe } from "@/lib/stripe"
import { getUserSubscription } from "@/lib/subscription-limits"
import { createTokenCheckoutSession, sanitizeReturnPath } from "@/lib/billing"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { TOKEN_PACKAGES, type TokenPackageKey } from "@/lib/billing/token-packages"

const purchaseSchema = z.object({
    package: z.string().min(1),
    returnTo: z.string().optional(),
})

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error

    return createApiResponse({ packages: TOKEN_PACKAGES })
}

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const userId = authResult.dbUser.id

    // Each call creates a Stripe checkout session — cap per user so the
    // endpoint can't be scripted into session spam (was entirely unthrottled).
    const limitCheck = await rateLimit(userId, 10, 60 * 1000, `token-purchase:${userId}`)
    if (!limitCheck.success) return limitCheck.error!

    // Free tier users cannot purchase tokens
    const { tier } = await getUserSubscription(userId)
    if (tier === "free") {
        return createApiError(
            "FORBIDDEN",
            "Token purchases are only available for paid plans. Please upgrade to Essential or Professional.",
            403
        )
    }

    // Parse + validate request body
    let json: unknown
    try {
        json = await req.json()
    } catch {
        return createApiError("BAD_REQUEST", "Invalid request body", 400)
    }
    const parsed = purchaseSchema.safeParse(json)
    if (!parsed.success) {
        return createApiError("BAD_REQUEST", "Invalid request body", 400)
    }
    const body = parsed.data

    const pkg = TOKEN_PACKAGES[body.package as TokenPackageKey]
    if (!pkg) {
        return createApiError(
            "BAD_REQUEST",
            `Invalid package. Valid options: ${Object.keys(TOKEN_PACKAGES).join(", ")}`,
            400
        )
    }

    // Ensure that stripe is configured
    if (!(stripe as any)) {
        return createApiError("SERVICE_UNAVAILABLE", "Payment service not configured", 503)
    }

    // Same-origin path to land back on after Stripe (open-redirect guard).
    const returnTo = sanitizeReturnPath(body.returnTo ?? null)

    try {
        // Hosted Stripe Checkout (mode: payment) — the previous bare
        // PaymentIntent flow had no payment UI, so purchases stayed pending.
        const session = await createTokenCheckoutSession(
            userId,
            body.package as TokenPackageKey,
            returnTo
        )

        logger("info", "Token purchase checkout session created", {
            userId,
            package: body.package,
            tokens: pkg.tokens,
            amountEur: pkg.priceEur,
        })

        await recordConversionEvent(userId, "checkout_started", {
            source: "token_topup",
            tokens: pkg.tokens,
        })

        return createApiResponse({
            checkout_url: session.url,
            session_id: session.id,
            package: body.package,
            tokens: pkg.tokens,
            amount_eur: pkg.priceEur,
        })
    } catch (error) {
        logger("error", "Failed to create token purchase checkout session", {
            userId,
            package: body.package,
            error: error instanceof Error ? error.message : String(error),
        })
        return createApiError("INTERNAL_ERROR", "Failed to initiate purchase", 500)
    }
}
