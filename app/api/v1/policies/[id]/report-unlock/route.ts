import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { createReportUnlockCheckoutSession } from "@/lib/billing"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"

/**
 * One-off €3 checkout to unlock a single policy's full gap report.
 *
 * Deliberately AVAILABLE to the free tier — this purchase exists precisely
 * for free users after their complimentary trial analysis (unlike token
 * packs, which are paid-plan-only). Owner-only: viewers/agents get 404.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const userId = authCheck.auth.dbUser.id

    const { id: policyId } = await context.params

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { id: true, ownerUserId: true, reportUnlockedAt: true },
    })
    if (!policy || policy.ownerUserId !== userId) {
        return createApiError("NOT_FOUND", "Policy not found", 404)
    }

    const { tier } = await resolveUserEntitlements(userId)
    if (policy.reportUnlockedAt || tier !== "free") {
        return createApiResponse({ already_unlocked: true })
    }

    if (!(stripe as any)) {
        return createApiError("SERVICE_UNAVAILABLE", "Payment service not configured", 503)
    }

    let returnTo: string | null = null
    try {
        const body = await req.json()
        if (typeof body?.returnTo === "string") returnTo = body.returnTo
    } catch {
        // body is optional
    }

    try {
        const session = await createReportUnlockCheckoutSession(userId, policyId, returnTo)

        logger("info", "Report unlock checkout session created", {
            userId,
            policyId,
            amountEur: session.amountEur,
        })

        await recordConversionEvent(userId, "checkout_started", {
            source: "report_unlock",
            policyId,
        })

        return createApiResponse({
            checkout_url: session.url,
            session_id: session.id,
            amount_eur: session.amountEur,
        })
    } catch (error) {
        logger("error", "Failed to create report unlock checkout session", {
            userId,
            policyId,
            error: error instanceof Error ? error.message : String(error),
        })
        return createApiError("INTERNAL_ERROR", "Failed to initiate purchase", 500)
    }
}
