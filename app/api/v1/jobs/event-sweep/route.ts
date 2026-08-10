/**
 * POST /api/v1/jobs/event-sweep
 *
 * Drains the business-event outbox: claims pending events, then runs each
 * delivery through the decision engine and its actions.
 *
 * The BACKSTOP, not the primary path — latency-sensitive publishers dispatch
 * inline. This exists so an event can never be stranded because a request ended
 * before its consequences ran, which is exactly the failure the outbox replaces.
 *
 * Auth: CRON_SECRET header or admin Bearer token, matching every other job.
 */
import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { runEventSweep } from "@/lib/events/dispatcher"

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
        const { result, paused } = await withJobRun("event-sweep", async () => {
            const summary = await runEventSweep()
            return createApiResponse({ summary })
        })
        if (paused) return createApiResponse({ paused: true })
        // The wrapped body builds the route response; the wrapper only observes.
        return result!
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run event sweep", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
