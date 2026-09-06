import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { enqueueAnalysisRun } from "@/lib/services/analysis/analysis-queue"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { withJobRun } from "@/lib/jobs/run-record"
import { z } from "zod"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const processPolicySchema = z.object({
    policyId: z.string().min(1, "Policy ID is required"),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 5 policy analysis requests per minute per user.
    // The bare-IP key shared proxy.ts's global bucket, so browsing the site
    // could 429 the analysis trigger; keying on the authenticated user also
    // survives NAT'd offices sharing one IP.
    const limitCheck = await rateLimit(authResult.dbUser.id, 5, 60000, `process-policy:${authResult.dbUser.id}`)
    if (!limitCheck.success) return limitCheck.error!

    try {
        // Recorded so the admin console can show that this ran, what it
        // did, and how long it took — and so an operator can pause it
        // without a redeploy.
        const { result, paused } = await withJobRun("process-policy", async () => {
            // Pre-flight: reap stale runs whose serverless lease timed out — they
            // would block this user's new attempt via the in-flight guard below.
            // Uses the orchestrator's reaper (NOT an inline updateMany) so the
            // policy and documents are reset too; the old inline version failed
            // only the run and left the policy stuck 'analyzing' forever. The
            // short grace protects a lease mid-handover to a QStash redelivery.
            try {
                const { PolicyAnalysisOrchestratorService } = await import(
                    "@/lib/services/analysis/policy-analysis-orchestrator.service"
                )
                const preflight = await new PolicyAnalysisOrchestratorService().reapStaleRuns({
                    graceMs: 2 * 60 * 1000,
                    limit: 25,
                })
                if (preflight.reaped > 0) {
                    logger("warn", "Reaped stale analysis runs in pre-flight", {
                        reaped: preflight.reaped,
                    })
                }
            } catch (reapError) {
                // Best-effort: a reaper hiccup must not block a fresh analysis.
                logger("warn", "Pre-flight stale-run reap failed", {
                    error: reapError instanceof Error ? reapError.message : String(reapError),
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

            // Rule findings are written ONLY by an analysis run, through
            // lib/gaps/gap-instance-writer.ts (B0.1). This job used to run the
            // legacy detector over the stored extraction and write rows with no
            // run, no provenance and reactivate semantics, then notify on the
            // result. "Process this policy" now means what the rest of the
            // product means by it: create the run (idempotent — an in-flight run
            // is returned, a gated one comes back `blocked`) and hand it to the
            // durable queue; the run's own completion events carry the findings.
            const { PolicyAnalysisOrchestratorService } = await import(
                "@/lib/services/analysis/policy-analysis-orchestrator.service"
            )
            const orchestrator = new PolicyAnalysisOrchestratorService()
            const run = await orchestrator.createRun(policyId, authResult.dbUser.id)

            if (run.status === "blocked") {
                return createApiResponse({
                    processed: false,
                    reason: run.blockedReason || run.failureCode || "blocked",
                    run_id: run.id,
                })
            }

            const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)
            const queued = await enqueueAnalysisRun(run.id, language)
            if (!queued) {
                // No durable queue configured (dev): execute inline, like the
                // wallet action does, rather than leaving a `queued` row nobody
                // will pick up.
                await orchestrator.executeRun(run.id, language)
            }

            return createApiResponse({
                processed: true,
                run_id: run.id,
                queued,
            })

        })
        if (paused) return createApiResponse({ paused: true })
        // The wrapped body builds the route response; the wrapper only observes.
        return result!
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid process policy payload", 400, error.issues)
        }
        logger('error', 'Policy Processing Error', { error })
        return createApiError("INTERNAL_ERROR", "Failed to process policy intelligence", 500)
    }
}
