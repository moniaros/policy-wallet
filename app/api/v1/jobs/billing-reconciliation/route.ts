import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { getBillingReconciliationSnapshot } from "@/lib/services/billing/reconciliation.service"

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null

    const isCronAuthorized = Boolean(
        cronSecret &&
        (
            (headerSecret && headerSecret === cronSecret) ||
            (bearerSecret && bearerSecret === cronSecret)
        )
    )

    if (!isCronAuthorized) {
        const authCheck = await requireApiUser({ roles: ["admin"] })
        if ("error" in authCheck) return authCheck.error
    }

    try {
        const snapshot = await getBillingReconciliationSnapshot({ windowHours: 24, sampleLimit: 25 })

        logger("info", "Billing reconciliation job completed", {
            generatedAt: snapshot.generatedAt,
            needsAttention: snapshot.needsAttention,
            summary: snapshot.summary,
        })

        return createApiResponse({
            generated_at: snapshot.generatedAt,
            needs_attention: snapshot.needsAttention,
            summary: snapshot.summary,
            provider_breakdown: snapshot.providerBreakdown,
        })
    } catch (error) {
        logger("error", "Billing reconciliation job failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to run billing reconciliation job", 500, String(error))
    }
}
