/**
 * Daily PITR re-erasure (PW-PROVENANCE-01 R-02, compliance pack §14.6): after a
 * production restore the operator sets `PITR_RESTORE_POINT`; this job re-runs
 * the eraser for every deletion request completed after that instant. Recorded
 * through `withJobRun` like the other sixteen crons, so the admin console shows
 * that it ran and what it did — including the days it had nothing to do.
 */

import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { PITR_JOB_NAME, restorePointFromEnv, runPitrReErasure } from "@/lib/jobs/pitr-re-erasure"
import { withJobRun } from "@/lib/jobs/run-record"
import { logger } from "@/lib/logger"

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null
    const isCronAuthorized = Boolean(cronSecret && ((headerSecret && headerSecret === cronSecret) || (bearerSecret && bearerSecret === cronSecret)))
    if (!isCronAuthorized) {
        const authCheck = await requireApiUser({ roles: ["admin"] })
        if ("error" in authCheck) return authCheck.error
    }
    try {
        const { result, paused } = await withJobRun(
            PITR_JOB_NAME,
            async () => {
                const summary = await runPitrReErasure(restorePointFromEnv())
                logger("info", "PITR re-erasure job completed", {
                    outcome: summary.outcome,
                    restorePoint: summary.restorePoint,
                    candidates: summary.candidates,
                    reExecuted: summary.reExecuted.length,
                    withoutUser: summary.withoutUser.length,
                    failures: summary.failures.length,
                })
                if (summary.failures.length > 0) throw Object.assign(new Error(`PITR re-erasure: ${summary.failures.length} of ${summary.candidates} re-executions failed`), { summary })
                return summary
            },
            { description: "Re-executes completed erasures after a production restore (PITR_RESTORE_POINT)" }
        )
        if (paused) return createApiResponse({ paused: true })
        return createApiResponse(result)
    } catch (error) {
        logger("error", "PITR re-erasure job failed", { error: error instanceof Error ? error.message : String(error) })
        return createApiError("JOB_FAILED", "PITR re-erasure job failed", 500)
    }
}

/** Vercel crons issue GET (the cron proxy trap); same job, same guard. */
export const GET = POST
