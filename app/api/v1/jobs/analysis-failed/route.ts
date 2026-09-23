import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { verifyQstashSignature } from "@/lib/jobs/qstash-signature"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

// QStash failure callback for /api/v1/jobs/execute-analysis: fires once the
// consumer's retry budget (analysis-queue.ts, 5 retries) is exhausted. Before
// this existed a run whose every delivery failed sat `queued`/`running` until
// the daily reaper found it — if it ever did, since the reaper only reaps
// RUNNING runs with an expired lease and a never-delivered run has neither.
// The policy card then showed "analysing" for a day over nothing.
//
// QStash posts { sourceBody: base64(original message), status, retried, ... }.
const bodySchema = z.object({
    sourceBody: z.string().min(1),
    status: z.number().optional(),
    retried: z.number().optional(),
    maxRetries: z.number().optional(),
    sourceMessageId: z.string().optional(),
})
const sourceSchema = z.object({ runId: z.string().min(1) })

export const POST = withApiGuard(
    { auth: { mode: "webhook", verify: verifyQstashSignature } },
    async ({ req }) => {
        let json: unknown
        try {
            json = await req.json()
        } catch {
            return createApiError("BAD_REQUEST", "Invalid callback payload", 400)
        }
        const parsed = bodySchema.safeParse(json)
        if (!parsed.success) {
            return createApiError("BAD_REQUEST", "Invalid callback payload", 400)
        }
        let source: unknown
        try {
            source = JSON.parse(Buffer.from(parsed.data.sourceBody, "base64").toString("utf8"))
        } catch {
            return createApiError("BAD_REQUEST", "Invalid source body", 400)
        }
        const run = sourceSchema.safeParse(source)
        if (!run.success) {
            return createApiError("BAD_REQUEST", "Invalid source body", 400)
        }

        const { PolicyAnalysisOrchestratorService } = await import(
            "@/lib/services/analysis/policy-analysis-orchestrator.service"
        )
        const orchestrator = new PolicyAnalysisOrchestratorService()
        const { reaped } = await orchestrator.reapStaleRuns({
            runIds: [run.data.runId],
            failureCode: "QUEUE_DELIVERY_EXHAUSTED",
            failureMessage: "Every queued delivery of the analysis failed and the retry budget is spent",
        })
        logger(reaped ? "warn" : "info", "Queued analysis delivery exhausted", {
            runId: run.data.runId,
            reaped,
            lastStatus: parsed.data.status,
            retried: parsed.data.retried,
            sourceMessageId: parsed.data.sourceMessageId,
        })
        return createApiResponse({ run_id: run.data.runId, failed: reaped === 1 })
    }
)
