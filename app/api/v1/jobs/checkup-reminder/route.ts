import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { runCheckupReminderScan } from "@/lib/services/checkup-reminder.service"

// Yearly, 15 January (vercel.json): the annual check-up benefit reminder
// (spec v2 §14 BENEFIT_REMINDER). Same guard as every other job route.
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
        const { result, paused } = await withJobRun("checkup-reminder", async () => {
            const summary = await runCheckupReminderScan()
            return createApiResponse({ summary })
        })
        if (paused) return createApiResponse({ paused: true })
        return result!
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run check-up reminder job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
