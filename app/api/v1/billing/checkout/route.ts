import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { createCheckoutSession } from "@/lib/billing"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"

const checkoutRequestSchema = z.object({
    planId: z.string().min(1, "Plan ID is required"),
    billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
    // Same-origin app path to return to after checkout (context preservation);
    // validated server-side in createCheckoutSession.
    returnTo: z.string().max(500).optional(),
    // Analytics label of the trigger surface that opened checkout.
    triggerSource: z.string().max(100).optional(),
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
        const language = (auth!.dbUser.preferredLanguage as "el" | "en") || "el"

        try {
            const { planId, billingPeriod, returnTo, triggerSource } = body!
            const checkout = await createCheckoutSession(auth!.dbUser.id, planId, billingPeriod, returnTo)

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
            logger("error", "Checkout session creation failed", {
                userId: auth!.dbUser.id,
                error: error instanceof Error ? error.message : String(error),
            })
            return createApiError(
                "INTERNAL_ERROR",
                error?.message || "Failed to create checkout session",
                500,
                null,
                language
            )
        }
    }
)
