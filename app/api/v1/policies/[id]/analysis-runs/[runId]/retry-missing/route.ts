import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"

const retryMissingParamsSchema = z.object({
    id: z.string().min(1),
    runId: z.string().min(1),
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: retryMissingParamsSchema },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:analysis:retry-missing:${auth?.dbUser.id || "anonymous"}:${params.id}:${params.runId}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id: policyId, runId } = params

        const policy = await db.policy.findUnique({
            where: { id: policyId },
            select: { id: true, ownerUserId: true },
        })
        if (!policy) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        const isOwner = policy.ownerUserId === authResult.dbUser.id
        if (!isOwner) {
            const grant = await db.accessGrant.findFirst({
                where: {
                    granterUserId: policy.ownerUserId,
                    granteeUserId: authResult.dbUser.id,
                    status: "active",
                },
            })
            if (!grant) {
                return createApiError("FORBIDDEN", "Access denied", 403)
            }
        }

        const sourceRun = await db.policyAnalysisRun.findFirst({
            where: {
                id: runId,
                policyId,
            },
            select: {
                id: true,
                status: true,
            },
        })
        if (!sourceRun) {
            return createApiError("NOT_FOUND", "Analysis run not found", 404)
        }
        if (sourceRun.status !== "completed_with_warnings") {
            return createApiError(
                "INVALID_STATE",
                "Retry missing is only available for completed runs with warnings",
                409
            )
        }

        const orchestrator = new PolicyAnalysisOrchestratorService()
        try {
            const rerun = await orchestrator.retryMissing(
                runId,
                authResult.dbUser.id,
                (authResult.dbUser.preferredLanguage as "en" | "el") || "en"
            )

            return createApiResponse({
                source_run_id: runId,
                run_id: rerun?.id || null,
                status: rerun?.status || "queued",
                message: "Retry for missing analysis sections started",
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to retry missing sections"
            if (message.toLowerCase().includes("token")) {
                return createApiError("TOKEN_LIMIT_BLOCKED", message, 402)
            }
            return createApiError("INTERNAL_ERROR", message, 500)
        }
    }
)
