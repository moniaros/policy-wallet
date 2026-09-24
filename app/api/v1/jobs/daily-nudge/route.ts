import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { runDailyNudge } from "@/lib/services/daily-nudge.service"

// Daily (vercel.json): one general habit nudge by push, only to people who
// opted in (prevention brief). Same guard as every other job route.
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
        const { result, paused } = await withJobRun("daily-nudge", async () => {
            const summary = await runDailyNudge()
            return createApiResponse({ summary })
        })
        if (paused) return createApiResponse({ paused: true })
        return result!
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run daily nudge job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
