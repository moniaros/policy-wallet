import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { getPolicyAccess } from "@/lib/policy-access"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { enqueueAnalysisRun } from "@/lib/services/analysis/analysis-queue"
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
            // Triggering a re-analysis spends tokens against someone's plan and
            // reads the document, so this is `canAnalyze` — owner, a write or
            // manage grant, or the managing agent — not the owner alone.
            const access = await getPolicyAccess(id, {
                id: authResult.dbUser.id,
                roles: authResult.dbUser.roles,
            })
            if (!access.exists || !access.canAnalyze) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }
            // getPolicyAccess returns only the fields the decision needs; the
            // activity-log line below names the policy the way an operator
            // reading it would.
            const policy = await db.policy.findUniqueOrThrow({
                where: { id },
                select: { id: true, policyNumber: true },
            })

            // Manual re-analysis is paying-only for agent-role users. A
            // dual-role owner bypasses the orchestrator's b2c pro gate
            // (createRun skips it for agent initiators), so the shared gate —
            // paid plan + monthly cap — must run here.
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

            const orchestrator = new PolicyAnalysisOrchestratorService()
            const run = await orchestrator.createRun(policy.id, authResult.dbUser.id)

            if (run.status === "blocked") {
                if (run.failureCode === "AI_CONSENT_REQUIRED") {
                    return createApiError(
                        "AI_CONSENT_REQUIRED",
                        "Policy owner has not granted AI-processing consent",
                        403,
                        { run_id: run.id }
                    )
                }
                if (run.failureCode === "UPGRADE_REQUIRED") {
                    return createApiError(
                        "UPGRADE_REQUIRED",
                        "AI analysis requires a paid plan; the free trial analysis has been used",
                        402,
                        { run_id: run.id }
                    )
                }
                return createApiError(
                    "TOKEN_LIMIT_BLOCKED",
                    "Policy review blocked due to token usage limits",
                    402,
                    { run_id: run.id }
                )
            }

            const reviewLanguage = (authResult.dbUser.preferredLanguage as "en" | "el") || "en"
            const queued = await enqueueAnalysisRun(run.id, reviewLanguage)
            if (!queued) {
                after(async () => {
                    try {
                        await orchestrator.executeRun(run.id, reviewLanguage)
                    } catch (error) {
                        console.error("Deferred policy review execution failed:", error)
                    }
                })
            }

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
            console.error(error)
            return createApiError("INTERNAL_ERROR", "Failed to trigger review", 500)
        }
    }
)
