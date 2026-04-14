import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { detectGapsForPolicy, createGapInstances } from "@/lib/gap-detection"
import { sendNotification } from "@/lib/notifications"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const processPolicySchema = z.object({
    policyId: z.string().min(1, "Policy ID is required"),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 5 policy analysis requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 5, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        // Pre-flight: expire stale analysis runs whose serverless lease timed out
        // Runs stuck in "running" with an expired lease would block future attempts
        const expiredLeaseCount = await db.policyAnalysisRun.updateMany({
            where: {
                status: "running",
                executionLeaseExpiresAt: { lt: new Date() },
            },
            data: {
                status: "failed",
                failureCode: "LEASE_EXPIRED",
                failureMessage: "Execution lease expired — serverless timeout likely",
                completedAt: new Date(),
            },
        })
        if (expiredLeaseCount.count > 0) {
            logger("warn", "Expired stale analysis leases in pre-flight", {
                count: expiredLeaseCount.count,
            })
        }

        const { policyId } = processPolicySchema.parse(await req.json())

        // Ensure user owns the policy
        const policy = await db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy || policy.ownerUserId !== authResult.dbUser.id) {
            return createApiError("FORBIDDEN", "Access denied", 403)
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

        // 2. Notify User if critical gaps found
        const criticalGaps = newGaps.filter(g => g.severity === 'critical' || g.severity === 'high')
        if (criticalGaps.length > 0) {
            await sendNotification({
                userId: authResult.dbUser.id,
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
