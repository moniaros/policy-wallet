import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { runGapEngine } from "@/lib/services/gap-engine"
import { logger } from "@/lib/logger"

/**
 * POST /api/v1/jobs/protection-score-refresh
 *
 * Cron job: Recomputes protection scores for active users.
 * Targets users who have been active in the last 90 days and have
 * at least one policy. Runs daily.
 *
 * Auth: CRON_SECRET header or admin Bearer token.
 */
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
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        // Find active users with policies
        const users = await db.user.findMany({
            where: {
                lastActiveAt: { gte: ninetyDaysAgo },
                policiesOwned: { some: {} },
                roles: { not: "admin" },
            },
            select: { id: true },
            take: 1000, // batch limit
        })

        let processed = 0
        let errors = 0

        for (const user of users) {
            try {
                await runGapEngine(user.id)
                processed++
            } catch (err) {
                errors++
                logger("error", `Protection score refresh failed for user ${user.id}`, {
                    error: String(err),
                })
            }
        }

        const summary = {
            usersFound: users.length,
            processed,
            errors,
            timestamp: new Date().toISOString(),
        }

        logger("info", "Protection score refresh completed", summary)
        return createApiResponse({ summary })
    } catch (error) {
        return createApiError(
            "INTERNAL_ERROR",
            "Failed to run protection score refresh",
            500,
            String(error)
        )
    }
}
