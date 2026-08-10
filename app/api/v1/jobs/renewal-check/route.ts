import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withJobRun } from "@/lib/jobs/run-record"
import { logger } from "@/lib/logger"
import { runRenewalCheck } from "@/lib/services/renewal.service"

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
        const { result, paused } = await withJobRun("renewal-check", async () => {
            const summary = await runRenewalCheck()

            logger("info", "Renewal check job completed", {
                policiesScanned: summary.policiesScanned,
                renewalRecordsCreated: summary.renewalRecordsCreated,
                agentTasksCreated: summary.agentTasksCreated,
                policyholderNotificationsSent: summary.policyholderNotificationsSent,
                agentNotificationsSent: summary.agentNotificationsSent,
                errorCount: summary.errors.length,
            })

            return createApiResponse({
                summary: {
                    policies_scanned: summary.policiesScanned,
                    renewal_records_created: summary.renewalRecordsCreated,
                    agent_tasks_created: summary.agentTasksCreated,
                    policyholder_notifications_sent: summary.policyholderNotificationsSent,
                    agent_notifications_sent: summary.agentNotificationsSent,
                    errors: summary.errors,
                },
            })
        })
        if (paused) return createApiResponse({ paused: true })
        // The wrapped body builds the route response; the wrapper only observes.
        return result!
    } catch (error) {
        logger("error", "Renewal check job failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to run renewal check job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
