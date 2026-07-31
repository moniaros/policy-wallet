/**
 * AI Gateway — the per-call chokepoint for interactive single-shot AI.
 *
 * Sits ABOVE the provider factory. Every call it owns runs the same pipeline:
 *
 *     resolveRoute(request)          — pick provider + model + output cap (tier)
 *   -> getAIService(decision.provider)
 *   -> operation(..., { modelOverride, maxOutputTokens, userId, policyId })
 *   -> structured telemetry line (ai_gateway_call)
 *
 * It does NOT re-implement the analysis orchestrator's remediation ladder (3
 * retries -> model fallback -> provider failover -> degraded completion) — that
 * lives in executeStepWithRetry and stays there. The gateway is for the
 * interactive paths that never had routing: Q&A and risk profile. Those callers
 * still own their own guardUserText / consent / metering gates; the gateway owns
 * model selection and the output cap.
 *
 * Input guarding is the caller's responsibility for free-text (they need to map
 * the reject code to a user message and write the audit row); the gateway takes
 * already-guarded text.
 */

import { logger } from "@/lib/logger"
import { getAIService } from "./ai-service.factory"
import { isTransientError } from "./shared-utils"
import { recordFailure, recordSuccess, type ProviderId } from "./provider-health"
import { getAiRuntimeOverrides } from "./runtime-config"
import { getPromptOverrides, resolveOperatorGuidance } from "./prompt-overrides"
import { resolveRoute, type RouteRequest, type UserTier } from "./model-router"
import type {
    AITrackingOptions,
    PolicyMetadata,
    RiskProfileInput,
    AIRiskProfileAnalysisResponse,
    AIPolicyExtractionResponse,
} from "./ai-service.interface"

interface GatewayContext {
    userId?: string
    policyId?: string
    userTier?: UserTier
    /** Policy line of business, when the caller knows it — selects a
     *  LoB-scoped operator-guidance override over the global one. */
    lineOfBusiness?: string
}

function logCall(operation: string, decision: { provider: string; model: string; tier: string }) {
    logger("info", "ai_gateway_call", {
        operation,
        provider: decision.provider,
        model: decision.model,
        tier: decision.tier,
    })
}

/**
 * Run a provider call under the circuit breaker: a success closes the breaker,
 * a transient failure trips it (so the same provider isn't preferred on the very
 * next call). Non-transient failures (bad request, schema) don't reflect on the
 * provider's health. The error is always rethrown — the breaker observes, it
 * does not swallow.
 */
async function withHealthTracking<T>(provider: ProviderId, fn: () => Promise<T>): Promise<T> {
    try {
        const result = await fn()
        recordSuccess(provider)
        return result
    } catch (err) {
        if (isTransientError(err)) recordFailure(provider, "transient")
        throw err
    }
}

function trackingFor(
    route: ReturnType<typeof resolveRoute>,
    ctx: GatewayContext,
    extra?: Partial<AITrackingOptions>
): AITrackingOptions {
    return {
        userId: ctx.userId,
        policyId: ctx.policyId,
        modelOverride: route.model,
        maxOutputTokens: route.maxOutputTokens,
        provider: route.provider,
        ...extra,
    }
}

export const aiGateway = {
    /**
     * Answer a policy question. `question` must already be guarded/sanitized by
     * the caller (guardUserText). structuredContext carries the ACORD JSON.
     */
    async askQuestion(
        metadata: PolicyMetadata,
        question: string,
        ctx: GatewayContext & { structuredContext?: AIPolicyExtractionResponse }
    ): Promise<string> {
        // Admin runtime overrides (cached; never throws — {} = env behavior).
        const overrides = await getAiRuntimeOverrides()
        const promptOverrides = await getPromptOverrides()
        const route = resolveRoute({ operation: "askQuestion", userTier: ctx.userTier }, overrides)
        logCall("askQuestion", route)
        const service = getAIService(route.provider)
        return withHealthTracking(route.provider, () =>
            service.askQuestion(null, metadata, question, {
                ...trackingFor(route, ctx),
                structuredContext: ctx.structuredContext,
                operatorGuidance: resolveOperatorGuidance(promptOverrides, "askQuestion", ctx.lineOfBusiness),
            })
        )
    },

    /** Analyze a risk profile against the current portfolio. */
    async analyzeRiskProfile(
        profile: RiskProfileInput,
        existingPolicies: PolicyMetadata[],
        ctx: GatewayContext
    ): Promise<AIRiskProfileAnalysisResponse> {
        const overrides = await getAiRuntimeOverrides()
        // Risk profile spans the whole portfolio — only the GLOBAL guidance row
        // applies (no single line of business to scope to).
        const promptOverrides = await getPromptOverrides()
        const route = resolveRoute({
            operation: "analyzeRiskProfile",
            userTier: ctx.userTier,
            portfolioSize: existingPolicies.length,
        }, overrides)
        logCall("analyzeRiskProfile", route)
        const service = getAIService(route.provider)
        return withHealthTracking(route.provider, () =>
            service.analyzeRiskProfile(profile, existingPolicies, {
                ...trackingFor(route, ctx),
                operatorGuidance: resolveOperatorGuidance(promptOverrides, "analyzeRiskProfile"),
            })
        )
    },
}

/** Exposed for tests + the admin dashboard to describe a route without calling. */
export function describeRoute(req: RouteRequest) {
    return resolveRoute(req)
}
