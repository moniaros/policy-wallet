import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { createCheckoutSession } from "@/lib/billing"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const checkoutRequestSchema = z.object({
    planId: z.string().min(1, "Plan ID is required"),
    billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
    // Same-origin app path to return to after checkout (context preservation);
    // validated server-side in createCheckoutSession.
    returnTo: z.string().max(500).optional(),
    // Analytics label of the trigger surface that opened checkout.
    triggerSource: z.string().max(100).optional(),
    // Feature the user upgraded from — threaded to /upgrade/success for
    // feature-specific success copy + the feature_unlocked event.
    feature: z.string().max(60).optional(),
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { body: checkoutRequestSchema },
        rateLimit: {
            limit: 5,
            windowMs: 60 * 1000,
            key: ({ auth }) => `billing:checkout:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        const language = resolveUserLanguage(auth!.dbUser.preferredLanguage)

        try {
            const { planId, billingPeriod, returnTo, triggerSource, feature } = body!
            const checkout = await createCheckoutSession(auth!.dbUser.id, planId, billingPeriod, returnTo, feature)

            await recordConversionEvent(auth!.dbUser.id, "checkout_started", {
                plan: planId,
                billingPeriod,
                source: triggerSource,
            })

            return createApiResponse(
                {
                    checkout_url: checkout.url,
                    session_id: checkout.id,
                    details: {
                        amount: checkout.amount,
                        vat: checkout.vatAmount,
                        total: checkout.total,
                    },
                },
                language
            )
        } catch (error: any) {
            const message = error instanceof Error ? error.message : String(error)

            // Not a failure: this deployment cannot take money at all
            // (lib/pricing/stripe-mode.ts), so every caller would fail the same
            // way. A 503 with its own code lets the surfaces that never pass
            // the pricing card — UpgradeModal, CarriedPlanCard, /account — say
            // «purchases are paused» instead of «something went wrong», and
            // keeps a configuration state out of the 500-error signal.
            if (message === "CHECKOUT_UNAVAILABLE") {
                logger("warn", "Checkout refused: this deployment cannot charge", {
                    userId: auth!.dbUser.id,
                })
                return createApiError(
                    "CHECKOUT_UNAVAILABLE",
                    "Online purchases are paused",
                    503,
                    null,
                    language
                )
            }

            logger("error", "Checkout session creation failed", {
                userId: auth!.dbUser.id,
                error: message,
            })
            // Never echo internal error text (Stripe/DB details) to the client.
            return createApiError(
                "INTERNAL_ERROR",
                "Failed to create checkout session",
                500,
                null,
                language
            )
        }
    }
)
