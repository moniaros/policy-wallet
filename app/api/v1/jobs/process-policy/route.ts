import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { detectGapsForPolicy, createGapInstances } from "@/lib/gap-detection"
import { sendNotification } from "@/lib/notifications"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    // Rate limiting: max 5 policy analysis requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 5, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const { policyId } = await req.json()
        if (!policyId) return createApiError("BAD_REQUEST", "Policy ID is required", 400)

        // Ensure user owns the policy
        const policy = await db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy || policy.ownerUserId !== session.user.id) {
            return createApiError("FORBIDDEN", "Access denied", 403)
        }

        // 1. Process Gaps
        const newGaps = await detectGapsForPolicy(policy)
        await createGapInstances(newGaps)

        // 2. Notify User if critical gaps found
        const criticalGaps = newGaps.filter(g => g.severity === 'critical' || g.severity === 'high')
        if (criticalGaps.length > 0) {
            await sendNotification({
                userId: session.user.id,
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
        logger('error', 'Policy Processing Error', { error })
        return createApiError("INTERNAL_ERROR", "Failed to process policy intelligence", 500)
    }
}
