import { Receiver } from "@upstash/qstash"
import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
// Sized from MEASUREMENT, not from a projection.
//
// The only successful analysis on record ran 258s wall-clock
// (policy_analysis_runs cmsted5fb001uf566yax22h1b, 2026-08-14, 29,242 tokens,
// 96% success). 258 × 1.3 = 336s.
//
// Two caveats worth keeping honest: that run PREDATES the step-boundary and
// caching optimisation, so 336 errs high — which is the safe direction for a
// kill timer. And the re-measurement that would confirm the post-optimisation
// figure has not been possible: the Gemini project is at its monthly spend cap,
// so every analysis fails before doing any work.
//
// Undersizing this is not a slow response, it is a KILLED function: the
// executor dies mid-pipeline holding a lease and the policy stays `analyzing`
// until the reaper finds it.
export const maxDuration = 336

const bodySchema = z.object({
    runId: z.string().min(1),
    language: z.enum(["en", "el"]).default("en"),
})

// QStash consumer: executes a queued AI analysis run. Authenticated by the
// QStash request signature (not a user session) — the enqueue helper
// (lib/services/analysis/analysis-queue.ts) publishes here. Idempotent: the
// orchestrator's execution lease means a duplicate delivery (QStash is
// at-least-once) simply no-ops.
export const POST = withApiGuard(
    {
        auth: {
            mode: "webhook",
            // Verify the Upstash signature over the raw body. Read a clone so
            // the handler can still parse the original request body.
            verify: async ({ req }) => {
                const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
                const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY
                if (!currentSigningKey) {
                    return createApiError("SERVICE_UNAVAILABLE", "Queue consumer not configured", 503)
                }
                const signature = req.headers.get("upstash-signature")
                if (!signature) {
                    return createApiError("UNAUTHORIZED", "Missing signature", 401)
                }
                const rawBody = await req.clone().text()
                const receiver = new Receiver({ currentSigningKey, nextSigningKey })
                let valid = false
                try {
                    valid = await receiver.verify({ signature, body: rawBody })
                } catch {
                    valid = false
                }
                return valid ? null : createApiError("UNAUTHORIZED", "Invalid signature", 401)
            },
        },
    },
    async ({ req }) => {
        let json: unknown
        try {
            json = await req.json()
        } catch {
            return createApiError("BAD_REQUEST", "Invalid job payload", 400)
        }
        const result = bodySchema.safeParse(json)
        if (!result.success) {
            return createApiError("BAD_REQUEST", "Invalid job payload", 400)
        }
        const parsed = result.data

        // Hoisted above the try so a module-load failure surfaces as itself,
        // not as a second failed import inside the catch.
        const { OrchestrationError, PolicyAnalysisOrchestratorService } = await import(
            "@/lib/services/analysis/policy-analysis-orchestrator.service"
        )

        try {
            const orchestrator = new PolicyAnalysisOrchestratorService()
            // throwOnLeaseHeld: a held lease must NOT return 200 — QStash would
            // mark the delivery done, and if the lease holder was a killed
            // function the run (and its policy, stuck 'analyzing') would never
            // be retried. A 503 keeps redeliveries alive; if the holder is
            // dead, its lease expires ≤ ~4 min after death and a later
            // redelivery (publish retries are sized for this) re-acquires and
            // resumes. The reap-stale-analyses cron is the final backstop.
            const run = await orchestrator.executeRun(parsed.runId, parsed.language, {
                throwOnLeaseHeld: true,
            })
            return createApiResponse({ run_id: parsed.runId, status: run?.status ?? "unknown" })
        } catch (error) {
            if (error instanceof OrchestrationError && error.code === "RUN_LEASE_HELD") {
                logger("info", "Queued analysis delivery deferred: run lease held", {
                    runId: parsed.runId,
                })
                return createApiError("SERVICE_UNAVAILABLE", "Run locked by another executor, retry later", 503)
            }
            // A 500 makes QStash retry per its retry policy.
            logger("error", "Queued analysis execution failed", {
                runId: parsed.runId,
                error: error instanceof Error ? error.message : String(error),
            })
            return createApiError("INTERNAL_ERROR", "Analysis execution failed", 500)
        }
    }
)
