import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { getDsrEvidenceSnapshot } from "@/lib/services/compliance/dsr-evidence.service"
import * as Sentry from "@sentry/nextjs"

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
        const snapshot = await getDsrEvidenceSnapshot({ windowHours: 24, sampleLimit: 25, pendingSlaHours: 24 })

        logger("info", "DSR evidence snapshot generated", {
            generatedAt: snapshot.generatedAt,
            needsAttention: snapshot.needsAttention,
            summary: snapshot.summary,
        })

        // GDPR requests carry a legal deadline — a stale or failed request has
        // to page someone, not sit in a JSON nobody reads.
        if (snapshot.needsAttention) {
            Sentry.captureMessage(
                `DSR queue needs attention: ${snapshot.summary.pendingBeyondSla} beyond SLA, ${snapshot.summary.failedInWindow} failed in window`,
                "warning"
            )
        }

        return createApiResponse({
            generated_at: snapshot.generatedAt,
            needs_attention: snapshot.needsAttention,
            summary: snapshot.summary,
            data_export_status_breakdown: snapshot.dataExportStatusBreakdown,
            deletion_status_breakdown: snapshot.deletionStatusBreakdown,
        })
    } catch (error) {
        logger("error", "DSR evidence snapshot job failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to generate DSR evidence snapshot", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
