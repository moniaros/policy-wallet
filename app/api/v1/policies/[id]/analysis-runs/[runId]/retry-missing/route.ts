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

        // Central per-policy rule (owner, write/manage grant on THIS policy,
        // or managing agent) — the previous check accepted ANY active grant
        // from the owner regardless of scope.
        const { getPolicyAccess } = await import("@/lib/policy-access")
        const access = await getPolicyAccess(policyId, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }
        if (!access.canAnalyze) {
            return createApiError("FORBIDDEN", "Access denied", 403)
        }

        // Manual re-analysis is paying-only for agent-role users (upload-time
        // auto-analysis is unaffected — this route is only ever a manual
        // trigger). The shared gate enforces paid plan + monthly cap.
        const { canAgentTriggerManualAnalysis } = await import("@/lib/subscription-entitlements")
        const manualGate = await canAgentTriggerManualAnalysis(
            authResult.dbUser.id,
            authResult.dbUser.roles
        )
        if (!manualGate.allowed) {
            return createApiError(
                manualGate.code,
                manualGate.code === "AGENT_UPGRADE_REQUIRED"
                    ? "Manual re-analysis requires a paid agent plan"
                    : "Monthly analysis limit reached for the agent plan",
                402
            )
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
