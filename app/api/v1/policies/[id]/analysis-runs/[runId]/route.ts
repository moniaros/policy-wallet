import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; runId: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth
    const { id: policyId, runId } = await params

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
            log_message: step.logMessage,
            log_json: step.logJson,
            error_code: step.errorCode,
            error_message: step.errorMessage,
            started_at: step.startedAt,
            finished_at: step.finishedAt,
        })),
    })
}
