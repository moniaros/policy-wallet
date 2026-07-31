import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"

// Backstop for orphaned analysis runs: a serverless executor killed at the
// platform ceiling leaves its run 'running' with an expired lease, the policy
// stuck 'analyzing' (blocking review and re-analysis), and its documents stuck
// 'processing'. QStash redeliveries recover fresh cases via the 503-on-held-
// lease path; this route catches whatever outlives the retry budget. The
// actual state transitions live in the orchestrator (reapStaleRuns) so their
// shape can never drift from failRun's.
//
// Scheduling: vercel.json now runs this every 15 minutes directly. It used to
// be daily "because Vercel Hobby allows only daily crons", with the real
// cadence delegated to an out-of-band QStash schedule
// (scripts/setup-qstash-reaper-schedule.mjs) — so if that schedule was never
// created, worst-case recovery for an orphaned run was ~24h. The project runs
// 11 crons, which Hobby does not permit at all, so the constraint did not
// apply. The QStash schedule remains valid as a redundant trigger, and the
// process-policy pre-flight still reaps opportunistically on user traffic.

// Lease must have been expired this long before the holder is declared dead —
// QStash redeliveries land within minutes and may still resume the run.
const LEASE_EXPIRY_GRACE_MS = 5 * 60 * 1000

export async function POST(req: Request) {
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

    try {
        const { PolicyAnalysisOrchestratorService } = await import(
            "@/lib/services/analysis/policy-analysis-orchestrator.service"
        )
        const { clearOrphanedReservations } = await import("@/lib/token-tracking")

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const { staleCandidates, reaped } = await orchestrator.reapStaleRuns({
            graceMs: LEASE_EXPIRY_GRACE_MS,
            limit: 50,
        })
        const tokenRowsCleared = await clearOrphanedReservations()

        logger("info", "Stale analysis reaper completed", {
            staleCandidates,
            reaped,
            tokenRowsCleared,
        })

        return createApiResponse({
            summary: {
                stale_candidates: staleCandidates,
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
