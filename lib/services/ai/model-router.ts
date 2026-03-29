/**
 * Smart Model Router
 *
 * Cost-optimized routing table that selects the cheapest appropriate model
 * for each operation and provider. Free-tier users always get the cheapest
 * model. Pro users can access premium models for higher-quality extraction.
 *
 * Failover chain: Gemini (cheapest) -> Claude (premium) -> OpenAI (fallback)
 */

import { env } from "@/lib/env"
import type { AICapabilityOperation } from "./ai-service.interface"
import type { AIServiceType } from "./ai-service.factory"
import type { PolicyAnalysisStepKey } from "../analysis/token-budget-estimator"

export type UserTier = "free" | "plus" | "pro" | "agent_starter" | "agent_pro"

interface ModelRouteResult {
    provider: AIServiceType
    model: string
    isPremium: boolean
}

// Cost per 1M tokens (EUR) for quick reference:
// gemini-2.0-flash:        input €0.07,  output €0.28
// gemini-2.0-flash-exp:    input €0.07,  output €0.28
// gpt-4.1-mini:            input €0.40,  output €1.60
// claude-sonnet-4:         input €3.00,  output €15.00
// claude-haiku-4:          input €0.80,  output €4.00

const ROUTING_TABLE: Record<
    AICapabilityOperation,
    Record<AIServiceType, { standard: string; premium?: string }>
> = {
    extractPolicyData: {
        gemini: {
            standard: env.GEMINI_MODEL_EXTRACTION,
            premium: env.GEMINI_MODEL_EXTRACTION,
        },
        openai: {
            standard: env.OPENAI_MODEL_EXTRACTION,
        },
        anthropic: {
            standard: env.CLAUDE_MODEL_EXTRACTION,
        },
        mock: { standard: "mock" },
    },
    analyzeGaps: {
        gemini: {
            standard: env.GEMINI_MODEL_GAP_ANALYSIS,
        },
        openai: {
            standard: env.OPENAI_MODEL_GAP_ANALYSIS,
        },
        anthropic: {
            standard: env.CLAUDE_MODEL_GAP_ANALYSIS,
        },
        mock: { standard: "mock" },
    },
    analyzePolicyClarity: {
        gemini: {
            standard: env.GEMINI_MODEL_CLARITY_ANALYSIS,
        },
        openai: {
            standard: env.OPENAI_MODEL_CLARITY_ANALYSIS,
        },
        anthropic: {
            standard: env.CLAUDE_MODEL_CLARITY_ANALYSIS,
        },
        mock: { standard: "mock" },
    },
    askQuestion: {
        gemini: {
            standard: env.GEMINI_MODEL_QA,
        },
        openai: {
            standard: env.OPENAI_MODEL_QA,
        },
        anthropic: {
            standard: env.CLAUDE_MODEL_QA,
        },
        mock: { standard: "mock" },
    },
    analyzeRiskProfile: {
        gemini: {
            standard: env.GEMINI_MODEL_QA,
        },
        openai: {
            standard: env.OPENAI_MODEL_QA,
        },
        anthropic: {
            standard: env.CLAUDE_MODEL_QA,
        },
        mock: { standard: "mock" },
    },
}

/**
 * Selects the optimal model for a given operation, provider, and user tier.
 */
export function routeModel(
    operation: AICapabilityOperation,
    provider: AIServiceType,
    userTier: UserTier = "free"
): ModelRouteResult {
    const routes = ROUTING_TABLE[operation]?.[provider]
    if (!routes) {
        return { provider, model: "mock", isPremium: false }
    }

    const isPremiumTier = userTier === "pro" || userTier === "agent_pro"
    const model = isPremiumTier && routes.premium ? routes.premium : routes.standard

    return {
        provider,
        model,
        isPremium: isPremiumTier && !!routes.premium,
    }
}

/**
 * Maps an orchestrator step key to the AI capability operation.
 */
export function stepToOperation(stepKey: PolicyAnalysisStepKey): AICapabilityOperation | null {
    switch (stepKey) {
        case "metadata_extraction_and_verification":
            return "extractPolicyData"
        case "plain_language_translation":
            return "analyzePolicyClarity"
        case "gap_detection":
            return "analyzeGaps"
        default:
            return null
    }
}

/**
 * Returns the optimal model for an orchestrator step.
 * Drop-in replacement for getDefaultModelForStep that adds tier-awareness.
 */
export function getModelForStep(
    provider: AIServiceType,
    stepKey: PolicyAnalysisStepKey,
    userTier: UserTier = "free"
): string | undefined {
    const operation = stepToOperation(stepKey)
    if (!operation) return undefined

    const route = routeModel(operation, provider, userTier)
    return route.model
}

/**
 * Selects the cheapest available provider based on API key availability.
 * Priority: Gemini (cheapest) -> Anthropic -> OpenAI
 */
export function getCheapestAvailableProvider(): AIServiceType {
    if (env.GEMINI_API_KEY) return "gemini"
    if (env.ANTHROPIC_API_KEY) return "anthropic"
    if (env.OPENAI_API_KEY) return "openai"
    return "mock"
}
