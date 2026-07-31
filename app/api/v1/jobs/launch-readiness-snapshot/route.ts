import { authorizeCronRequest } from "@/lib/api-auth"
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
    // Delegates to the shared guard, which compares the secret in constant
    // time. Twelve job routes inlined this block with `===`, which
    // short-circuits at the first differing byte and leaks a prefix oracle
    // through response timing — and they bypassed the helper, so hardening it
    // alone changed nothing here.
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

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
