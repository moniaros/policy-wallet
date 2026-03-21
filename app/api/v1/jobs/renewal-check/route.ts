import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
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
    } catch (error) {
        logger("error", "Renewal check job failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to run renewal check job", 500, String(error))
    }
}
