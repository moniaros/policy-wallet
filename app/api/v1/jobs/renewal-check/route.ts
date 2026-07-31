import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { runRenewalCheck } from "@/lib/services/renewal.service"

export async function POST(req: Request) {
    // Delegates to the shared guard, which compares the secret in constant
    // time. Twelve job routes inlined this block with `===`, which
    // short-circuits at the first differing byte and leaks a prefix oracle
    // through response timing — and they bypassed the helper, so hardening it
    // alone changed nothing here.
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

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

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
