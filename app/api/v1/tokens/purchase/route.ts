import { NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { stripe } from "@/lib/stripe"
import { getUserSubscription } from "@/lib/subscription-limits"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const TOKEN_PACKAGES = {
    small: { tokens: 500_000, priceEur: 0.49, label: "500K tokens" },
    medium: { tokens: 1_000_000, priceEur: 0.99, label: "1M tokens" },
    large: { tokens: 5_000_000, priceEur: 4.99, label: "5M tokens" },
    xl: { tokens: 10_000_000, priceEur: 9.99, label: "10M tokens" },
} as const

export type TokenPackageKey = keyof typeof TOKEN_PACKAGES

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

    // Free tier users cannot purchase tokens
    const { tier } = await getUserSubscription(userId)
    if (tier === "free") {
        return createApiError(
            "FORBIDDEN",
            "Token purchases are only available for paid plans. Please upgrade to Essential or Professional.",
            403
        )
    }

    // Parse request body
    let body: { package: string }
    try {
        body = await req.json()
    } catch {
        return createApiError("BAD_REQUEST", "Invalid request body", 400)
    }

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

    try {
        // Ensure user has a Stripe customer ID
        let stripeCustomerId = authResult.dbUser.stripeCustomerId
        if (!stripeCustomerId) {
            const customer = await (stripe as any).customers.create({
                email: authResult.dbUser.email,
                name: authResult.dbUser.name || authResult.dbUser.email,
                metadata: { userId },
            })
            stripeCustomerId = customer.id
            await db.user.update({
                where: { id: userId },
                data: { stripeCustomerId },
            })
        }

        const amountCents = Math.round(pkg.priceEur * 100)

        const paymentIntent = await (stripe as any).paymentIntents.create({
            amount: amountCents,
            currency: "eur",
            customer: stripeCustomerId,
            description: `PolicyWallet token purchase: ${pkg.label}`,
            metadata: {
                userId,
                tokenPackage: body.package,
                tokensPurchased: String(pkg.tokens),
                priceEur: String(pkg.priceEur),
            },
        })

        // Create a pending token purchase record
        await db.tokenPurchase.create({
            data: {
                userId,
                tokensPurchased: BigInt(pkg.tokens),
                amountEur: pkg.priceEur,
                stripePaymentIntentId: paymentIntent.id,
                status: "pending",
            },
        })

        logger("info", "Token purchase payment intent created", {
            userId,
            package: body.package,
            tokens: pkg.tokens,
            amountEur: pkg.priceEur,
        })

        return createApiResponse({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            package: body.package,
            tokens: pkg.tokens,
            amount_eur: pkg.priceEur,
        })
    } catch (error) {
        logger("error", "Failed to create token purchase payment intent", {
            userId,
            package: body.package,
            error: error instanceof Error ? error.message : String(error),
        })
        return createApiError("INTERNAL_ERROR", "Failed to initiate purchase", 500)
    }
}
