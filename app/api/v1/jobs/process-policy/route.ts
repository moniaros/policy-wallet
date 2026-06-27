import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { detectGapsForPolicy, createGapInstances } from "@/lib/gap-detection"
import { sendNotification } from "@/lib/notifications"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const processPolicySchema = z.object({
    policyId: z.string().min(1, "Policy ID is required"),
})

// Cron/admin-only: this is a system job (rule-based gap detection + owner
// notification), not an end-user action. Authorize via CRON_SECRET or an admin
// Bearer token, matching every other app/api/v1/jobs/* route. (Previously this
// was the only jobs route callable by any authenticated user.)
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
        // Pre-flight: expire stale analysis runs whose serverless lease timed out.
        // Runs stuck in "running" with an expired lease would block future attempts.
        const expiredLeaseCount = await db.policyAnalysisRun.updateMany({
            where: {
                status: "running",
                executionLeaseExpiresAt: { lt: new Date() },
            },
            data: {
                status: "failed",
                failureCode: "LEASE_EXPIRED",
                failureMessage: "Execution lease expired — serverless timeout likely",
                finishedAt: new Date(),
            },
        })
        if (expiredLeaseCount.count > 0) {
            logger("warn", "Expired stale analysis leases in pre-flight", {
                count: expiredLeaseCount.count,
            })
        }

        const { policyId } = processPolicySchema.parse(await req.json())

        const policy = await db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        // M3: Idempotency guard — skip if an analysis is already in-flight for this policy
        const inFlight = await db.policyAnalysisRun.findFirst({
            where: { policyId, status: "running" },
            select: { id: true },
        })
        if (inFlight) {
            logger("info", "process-policy skipped — analysis already running", {
                policyId,
                runId: inFlight.id,
            })
            return createApiResponse({ processed: false, reason: "analysis_already_running" })
        }

        // 1. Process Gaps
        const newGaps = await detectGapsForPolicy(policy)
        await createGapInstances(newGaps)

        // 2. Notify the policy OWNER (not the caller) if critical gaps found
        const criticalGaps = newGaps.filter(g => g.severity === 'critical' || g.severity === 'high')
        if (criticalGaps.length > 0) {
            await sendNotification({
                userId: policy.ownerUserId,
                eventType: 'GAP_DETECTED',
                title: 'Security Alert: Coverage Gap Detected',
                message: `We found ${criticalGaps.length} critical gaps in your ${policy.insurerName} policy.`,
                relatedObjectType: 'policy',
                relatedObjectId: policy.id,
                channels: ['email', 'push']
            })
        }

        return createApiResponse({
            processed: true,
            gaps_found: newGaps.length,
            critical_gaps: criticalGaps.length
        })

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid process policy payload", 400, error.issues)
        }
        logger('error', 'Policy Processing Error', { error })
        return createApiError("INTERNAL_ERROR", "Failed to process policy intelligence", 500)
    }
}
