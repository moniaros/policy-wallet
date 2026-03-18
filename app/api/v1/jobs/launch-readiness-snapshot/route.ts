import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { getLaunchReadinessSnapshot } from "@/lib/services/ops/launch-readiness.service"

function resolveWindowHours(url: string): number {
    const value = new URL(url).searchParams.get("window_hours")
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 24
    return Math.max(1, Math.min(168, Math.trunc(parsed)))
}

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
        const snapshot = await getLaunchReadinessSnapshot({
            windowHours: resolveWindowHours(req.url),
        })

        const blockerCount = snapshot.signals.filter((signal) => signal.severity === "blocker").length
        const warningCount = snapshot.signals.filter((signal) => signal.severity === "warning").length

        logger("info", "Launch readiness snapshot generated", {
            generatedAt: snapshot.generatedAt,
            level: snapshot.level,
            blockerCount,
            warningCount,
        })

        return createApiResponse({
            generated_at: snapshot.generatedAt,
            window_hours: snapshot.windowHours,
            level: snapshot.level,
            blocker_count: blockerCount,
            warning_count: warningCount,
            signals: snapshot.signals,
            synthetic: snapshot.synthetic,
            billing: snapshot.billing,
            dsr: snapshot.dsr,
        })
    } catch (error) {
        logger("error", "Launch readiness snapshot failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to generate launch readiness snapshot", 500, String(error))
    }
}
