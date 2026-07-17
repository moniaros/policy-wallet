import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { runSyntheticLaunchChecks } from "@/lib/services/ops/synthetic-launch-check.service"

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
