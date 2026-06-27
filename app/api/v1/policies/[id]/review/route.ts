import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { after } from "next/server"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { msFromNow, COMPLETION_ESTIMATE_MS } from "@/lib/constants/time"

const policyReviewParamsSchema = z.object({
    id: z.string().min(1),
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: policyReviewParamsSchema },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth, params }) => `policy:review:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id } = params

        try {
            const policy = await db.policy.findFirst({
                where: {
                    id,
                    ownerUserId: authResult.dbUser.id
                }
            })

            if (!policy) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }

            const orchestrator = new PolicyAnalysisOrchestratorService()
            const run = await orchestrator.createRun(policy.id, authResult.dbUser.id)

            if (run.status === "blocked") {
                return createApiError(
                    "TOKEN_LIMIT_BLOCKED",
                    "Policy review blocked due to token usage limits",
                    402,
                    { run_id: run.id }
                )
            }

            after(async () => {
                try {
                    await orchestrator.executeRun(run.id, (authResult.dbUser.preferredLanguage as "en" | "el") || "en")
                } catch (error) {
                    console.error("Deferred policy review execution failed:", error)
                }
            })

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_REVIEW_TRIGGERED",
                    description: `Triggered AI review run ${run.id} for policy ${policy.policyNumber}`,
                    timestamp: new Date()
                }
            })

            return createApiResponse({
                run_id: run.id,
                status: "queued",
                message: "Policy review started. Results will be available shortly.",
                estimated_completion: msFromNow(COMPLETION_ESTIMATE_MS),
                estimated_tokens: run.estimatedTokens
            })
        } catch (error) {
            if ((error as { code?: string })?.code === "AI_PROCESSING_CONSENT_REQUIRED") {
                return createApiError(
                    "AI_PROCESSING_CONSENT_REQUIRED",
                    "AI-processing consent is required before this policy can be analysed.",
                    403
                )
            }
            console.error(error)
            return createApiError("INTERNAL_ERROR", "Failed to trigger review", 500)
        }
    }
)
