import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { runWeeklyDigestJob } from "@/lib/services/weekly-digest.service"

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
        // Recorded so the admin console can show that this ran, what it
        // did, and how long it took — and so an operator can pause it
        // without a redeploy.
        const { result, paused } = await withJobRun("weekly-digest", async () => {
            const summary = await runWeeklyDigestJob()
            return createApiResponse({ summary })
        })
        if (paused) return createApiResponse({ paused: true })
        // The wrapped body builds the route response; the wrapper only observes.
        return result!
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run weekly digest job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
