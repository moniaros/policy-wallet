import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"

const runStatusParamsSchema = z.object({
    id: z.string().min(1),
    runId: z.string().min(1),
})

export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: runStatusParamsSchema },
        rateLimit: {
            limit: 120,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:analysis:status:${auth?.dbUser.id || "anonymous"}:${params.id}:${params.runId}`,
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
                    scope: `policy:${policyId}`,
                    status: "active",
                },
            })
            if (!grant) {
                return createApiError("FORBIDDEN", "Access denied", 403)
            }
        }

        const run = await db.policyAnalysisRun.findFirst({
            where: {
                id: runId,
                policyId,
            },
            include: {
                steps: {
                    orderBy: [{ stepOrder: "asc" }, { attempt: "asc" }],
                },
            },
        })

        if (!run || run.policyId !== policyId) {
            return createApiError("NOT_FOUND", "Analysis run not found", 404)
        }

        const remediation =
            (run.remediationSummary as Record<string, unknown> | null) ||
            ((run.resultJson as any)?.remediation as Record<string, unknown> | null) ||
            null

        const degradedSteps = Array.isArray(remediation?.degradedSteps)
            ? (remediation?.degradedSteps as string[])
            : []
        const missingArtifacts = Array.isArray(remediation?.missingArtifacts)
            ? (remediation?.missingArtifacts as string[])
            : []
        const providerAttempts = Array.isArray(remediation?.providerAttempts)
            ? (remediation?.providerAttempts as Array<Record<string, unknown>>)
            : []

        return createApiResponse({
            run_id: run.id,
            policy_id: run.policyId,
            status: run.status,
            run_attempt: run.runAttempt,
            overall_success_pct: run.overallSuccessPct,
            estimated_tokens: run.estimatedTokens,
            actual_input_tokens: run.actualInputTokens,
            actual_output_tokens: run.actualOutputTokens,
            actual_total_tokens: run.actualTotalTokens,
            blocked_reason: run.blockedReason,
            failure_code: run.failureCode,
            failure_message: run.failureMessage,
            final_user_message_key:
                typeof remediation?.finalUserMessageKey === "string"
                    ? remediation.finalUserMessageKey
                    : null,
            degraded_steps: degradedSteps,
            missing_artifacts: missingArtifacts,
            provider_attempts: providerAttempts,
            remediation_summary: remediation,
            started_at: run.startedAt,
            finished_at: run.finishedAt,
            steps: run.steps.map((step) => ({
                id: step.id,
                key: step.stepKey,
                order: step.stepOrder,
                attempt: step.attempt,
                status: step.status,
                success_pct: step.successPct,
                input_tokens: step.inputTokens,
                output_tokens: step.outputTokens,
                total_tokens: step.totalTokens,
                provider: step.provider,
                remediation_type: step.remediationType,
                log_message: step.logMessage,
                log_json: step.logJson,
                error_code: step.errorCode,
                error_message: step.errorMessage,
                started_at: step.startedAt,
                finished_at: step.finishedAt,
            })),
        })
    }
)
