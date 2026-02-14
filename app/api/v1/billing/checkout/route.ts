import { createApiResponse, createApiError } from "@/lib/api-utils"
import { createCheckoutSession } from "@/lib/billing"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const checkoutRequestSchema = z.object({
    planId: z.string().min(1, "Plan ID is required"),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limit: 5 checkout attempts per minute
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 5, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const { planId } = checkoutRequestSchema.parse(await req.json())

        const checkout = await createCheckoutSession(authResult.dbUser.id, planId)

        return createApiResponse({
            checkout_url: checkout.url,
            session_id: checkout.id,
            details: {
                amount: checkout.amount,
                vat: checkout.vatAmount,
                total: checkout.total
            }
        })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid checkout payload", 400, error.issues)
        }
        logger('error', 'Checkout session creation failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", error.message || "Failed to create checkout session", 500)
    }
}
