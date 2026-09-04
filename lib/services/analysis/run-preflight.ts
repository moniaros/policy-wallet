/**
 * The token pre-flight for a deep analysis run — ONE estimate, ONE gate.
 *
 * `PolicyAnalysisOrchestratorService.createRun` estimates a run's tokens and
 * asks `canUserUseTokens` before it queues. Until Sept 2026 that check ran
 * ONLY inside the deferred `after()` of the agent upload, so the upload modal
 * had already said «Η ανάλυση εκτελείται στο παρασκήνιο» when the gate
 * refused — and on the free agent tier it refused every time: a document run
 * estimates at ~211k tokens (token-budget-estimator × safety buffer) while the
 * `agent_free` monthly budget is 150,000, so the gate blocks at zero usage.
 *
 * The action now runs the SAME estimate and the SAME gate before it answers,
 * and the orchestrator estimates through the same function, so the number the
 * modal decides on is the number the run would have been refused on.
 */
import { db } from "@/lib/db"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { canUserUseTokens } from "@/lib/token-tracking"

import { INSURANCE_CLARITY_CHECKLIST } from "./insurance-clarity-checklist"
import { estimatePolicyAnalysisTokenBudget, type PolicyAnalysisStepKey } from "./token-budget-estimator"

export type AnalysisRunBudget = {
    totalEstimatedTokens: number
    byStep: Record<PolicyAnalysisStepKey, number>
    gapDefinitionsCount: number
}

/**
 * Estimate what a deep run over this policy would reserve. The active gap
 * definitions for the branch scale the gap-detection step, exactly as
 * createRun counts them.
 */
export async function estimateAnalysisRunBudget(input: {
    lineOfBusiness: string | null | undefined
    hasDocument: boolean
}): Promise<AnalysisRunBudget> {
    const gapDefinitionsCount = await db.gapDefinition.count({
        where: {
            lineOfBusiness: {
                equals: normalizeBranch(input.lineOfBusiness).id,
                mode: "insensitive",
            },
            isActive: true,
        },
    })

    const estimation = estimatePolicyAnalysisTokenBudget({
        hasDocument: input.hasDocument,
        gapDefinitionsCount,
        checklistPillarsCount: INSURANCE_CLARITY_CHECKLIST.length,
    })

    return { ...estimation, gapDefinitionsCount }
}

export type AnalysisTokenPreflight =
    | { allowed: true; estimatedTokens: number; remainingTokens?: number }
    | { allowed: false; reason: string; estimatedTokens: number; remainingTokens?: number }

/**
 * Would `createRun` queue this run for `userId`, or block it with
 * TOKEN_LIMIT_BLOCKED? Same estimate, same gate, no side effects — nothing is
 * reserved here; the run reserves for itself when it executes.
 */
export async function preflightAnalysisTokenGate(
    userId: string,
    input: { lineOfBusiness: string | null | undefined; hasDocument: boolean }
): Promise<AnalysisTokenPreflight> {
    const budget = await estimateAnalysisRunBudget(input)
    const gate = await canUserUseTokens(userId, budget.totalEstimatedTokens)
    if (gate.allowed) {
        return { allowed: true, estimatedTokens: budget.totalEstimatedTokens, remainingTokens: gate.remainingTokens }
    }
    return {
        allowed: false,
        reason: gate.reason || "insufficient_tokens",
        estimatedTokens: budget.totalEstimatedTokens,
        remainingTokens: gate.remainingTokens,
    }
}
