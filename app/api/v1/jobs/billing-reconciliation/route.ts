import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { getBillingReconciliationSnapshot } from "@/lib/services/billing/reconciliation.service"

export async function POST(req: Request) {
    // Delegates to the shared guard, which compares the secret in constant
    // time. Twelve job routes inlined this block with `===`, which
    // short-circuits at the first differing byte and leaks a prefix oracle
    // through response timing — and they bypassed the helper, so hardening it
    // alone changed nothing here.
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

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
