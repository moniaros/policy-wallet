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

        try {
            const { PolicyAnalysisOrchestratorService } = await import(
                "@/lib/services/analysis/policy-analysis-orchestrator.service"
            )
            const orchestrator = new PolicyAnalysisOrchestratorService()
            const run = await orchestrator.executeRun(parsed.runId, parsed.language)
            return createApiResponse({ run_id: parsed.runId, status: run?.status ?? "unknown" })
        } catch (error) {
            // A 500 makes QStash retry per its retry policy.
            logger("error", "Queued analysis execution failed", {
                runId: parsed.runId,
                error: error instanceof Error ? error.message : String(error),
            })
            return createApiError("INTERNAL_ERROR", "Analysis execution failed", 500)
        }
    }
)
