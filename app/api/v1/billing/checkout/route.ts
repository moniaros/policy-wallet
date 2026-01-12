import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { createCheckoutSession } from "@/lib/billing"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    // Rate limit: 5 checkout attempts per minute
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 5, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const { planId } = await req.json()
        if (!planId) return createApiError("BAD_REQUEST", "Plan ID is required", 400)

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
        logger('error', 'Checkout session creation failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", error.message || "Failed to create checkout session", 500)
    }
}
