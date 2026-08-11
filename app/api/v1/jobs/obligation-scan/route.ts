import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { runObligationScan } from "@/lib/services/compliance/obligation-scan"

/**
 * POST /api/v1/jobs/obligation-scan
 *
 * Raises the conditions of cover that are coming due — annual servicing to the
 * maker's instructions, certificates that must stay valid, an alarm that must
 * stay connected to a monitoring centre.
 *
 * Nothing else in the product watches for these, and the failure mode is quiet:
 * nobody decides to stop servicing the engines, the service is simply not
 * booked, and the policy keeps renewing and keeps looking fine right up until
 * the claim that tests it. On a Greek ΑΠΑΡΑΒΑΤΟΣ ΟΡΟΣ a breach does not reduce
 * the claim — it removes the cover.
 *
 * Auth: CRON_SECRET header or admin Bearer token, matching every other job.
 */
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
        const { result, paused } = await withJobRun("obligation-scan", async () => {
            const summary = await runObligationScan()
            return createApiResponse({ summary })
        })
        if (paused) return createApiResponse({ paused: true })
        return result!
    } catch (error) {
        return createApiError(
            "INTERNAL_ERROR",
            "Failed to run obligation scan",
            500,
            String(error)
        )
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
