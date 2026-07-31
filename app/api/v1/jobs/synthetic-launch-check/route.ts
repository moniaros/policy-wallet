import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { runSyntheticLaunchChecks } from "@/lib/services/ops/synthetic-launch-check.service"

export async function POST(req: Request) {
    // Delegates to the shared guard, which compares the secret in constant
    // time. Twelve job routes inlined this block with `===`, which
    // short-circuits at the first differing byte and leaks a prefix oracle
    // through response timing — and they bypassed the helper, so hardening it
    // alone changed nothing here.
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

    try {
        const snapshot = await runSyntheticLaunchChecks()

        logger("info", "Synthetic launch checks completed", {
            generatedAt: snapshot.generatedAt,
            overallStatus: snapshot.overallStatus,
            checks: snapshot.checks,
        })

        return createApiResponse({
            generated_at: snapshot.generatedAt,
            overall_status: snapshot.overallStatus,
            checks: snapshot.checks,
        })
    } catch (error) {
        logger("error", "Synthetic launch checks failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to run synthetic launch checks", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
