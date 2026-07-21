import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

// Reaper for orphaned analysis runs: a serverless executor killed at the
// platform ceiling leaves its run 'running' with an expired lease, the policy
// stuck 'analyzing' (blocking review and re-analysis), and its documents stuck
// 'processing'. QStash redeliveries recover most cases via the 503-on-held-
// lease path; this cron is the backstop when redeliveries are exhausted.
// It also clears leaked reserved_tokens for users with no running run —
// reservations are only live while a run is running, so anything left over
// silently shrinks the user's monthly budget.

// Lease must have been expired for this long before we declare the holder
// dead — QStash redeliveries land within minutes, so a fresh expiry may still
// be picked up and resumed.
const LEASE_EXPIRY_GRACE_MS = 10 * 60 * 1000

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
        const cutoff = new Date(Date.now() - LEASE_EXPIRY_GRACE_MS)
        const staleRuns = await db.policyAnalysisRun.findMany({
            where: {
                status: "running",
                executionLeaseExpiresAt: { lt: cutoff },
            },
            select: {
                id: true,
                policyId: true,
                policy: { select: { acordData: true } },
            },
        })

        let reaped = 0
        for (const run of staleRuns) {
            // Guarded update: only fail the run if it is STILL running with the
            // same expired lease — a redelivery that resumed it in the meantime
            // has refreshed the lease and must not be clobbered.
            const failed = await db.policyAnalysisRun.updateMany({
                where: {
                    id: run.id,
                    status: "running",
                    executionLeaseExpiresAt: { lt: cutoff },
                },
                data: {
                    status: "failed",
                    failureCode: "LEASE_EXPIRED",
                    failureMessage: "Analysis executor died and the run was never resumed",
                    executionLeaseId: null,
                    executionLeaseExpiresAt: null,
                    finishedAt: new Date(),
                },
            })
            if (failed.count !== 1) continue

            // Mirror failRun's policy shape so the wallet UI surfaces the error
            // and offers retry instead of an eternal spinner.
            const acordData = (run.policy?.acordData as Record<string, unknown> | null) || {}
            await db.$transaction([
                db.policy.update({
                    where: { id: run.policyId },
                    data: {
                        status: "action_needed",
                        acordData: {
                            ...acordData,
                            processingError: {
                                code: "LEASE_EXPIRED",
                                message: "Analysis was interrupted and did not resume",
                                retryable: true,
                                occurredAt: new Date().toISOString(),
                            },
                        },
                    },
                }),
                db.policyDocument.updateMany({
                    where: { policyId: run.policyId, processingStatus: "processing" },
                    data: { processingStatus: "failed" },
                }),
            ])
            reaped += 1
        }

        // Leaked reservations: no running run for the user means nothing is
        // legitimately in flight this month.
        const now = new Date()
        const month = new Date(now.getFullYear(), now.getMonth(), 1)
        const tokenRowsCleared = await db.$executeRaw`
            UPDATE monthly_token_usage m
            SET reserved_tokens = 0
            WHERE m.month = ${month}
              AND m.reserved_tokens > 0
              AND NOT EXISTS (
                  SELECT 1 FROM policy_analysis_runs r
                  WHERE r.user_id = m.user_id AND r.status = 'running'
              )`

        logger("info", "Stale analysis reaper completed", {
            staleCandidates: staleRuns.length,
            reaped,
            tokenRowsCleared,
        })

        return createApiResponse({
            summary: {
                stale_candidates: staleRuns.length,
                reaped,
                token_rows_cleared: tokenRowsCleared,
            },
        })
    } catch (error) {
        logger("error", "Stale analysis reaper failed", { error })
        return createApiError("INTERNAL_ERROR", "Failed to reap stale analyses", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
