import { Receiver } from "@upstash/qstash"
import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
// AI analysis is long-running; give the consumer the platform max.
export const maxDuration = 300

const bodySchema = z.object({
    runId: z.string().min(1),
    language: z.enum(["en", "el"]).default("en"),
    /**
     * Set by first analyses, which previously did their post-analysis work
     * (dedup/merge, status transitions, notifications) inline in the caller.
     * Defaults to false so the three re-run paths keep their behaviour.
     */
    finalize: z.boolean().default(false),
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

            // Post-analysis work for a first analysis. It runs HERE because the
            // caller that used to do it inline has already returned — without
            // this, moving first analyses onto the queue would silently drop
            // duplicate detection, the policy 'active' transition and the
            // completion notification. Never fails the delivery: the run itself
            // succeeded, and a retry would re-execute a completed run.
            if (parsed.finalize) {
                try {
                    const { PolicyService } = await import("@/lib/services/policy.service")
                    await new PolicyService().finalizeQueuedAnalysis(parsed.runId, parsed.language)
                } catch (finalizeError) {
                    logger("error", "Queued analysis finalization failed", {
                        runId: parsed.runId,
                        error: finalizeError instanceof Error ? finalizeError.message : String(finalizeError),
                    })
                }
            }

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
