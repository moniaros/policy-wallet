/**
 * Smart Model Router
 *
 * Two layers live here:
 *
 *  1. The legacy step router (routeModel / getModelForStep / stepToOperation)
 *     used by the analysis orchestrator. Unchanged in behavior — it returns the
 *     env-configured model for each pipeline step.
 *
 *  2. The per-call route resolver (resolveRoute / selectPrimaryProvider), the
 *     single source of routing truth for the interactive single-shot paths that
 *     go through the AI gateway (Q&A, risk profile, …). It classifies each
 *     request into a model TIER (cheap | standard | premium) from a deterministic
 *     decision table, then maps (operation, provider, tier) → concrete model +
 *     an output-token cap.
 *
 * Behavior note: the tier decision table is real and unit-tested, but the two
 * paths wired to resolveRoute today (askQuestion, analyzeRiskProfile) map to the
 * same env model at EVERY tier, so shipping this changes no production model.
 * Enabling tier upgrades on the deep pipeline (extraction/gaps/clarity for pro
 * users) is deferred until the evaluation pipeline can validate the swap.
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

// Per-model prices live in ONE place: TOKEN_COSTS (lib/token-utils.ts).
// Routing order of magnitude: gemini flash-lite < gemini flash < gpt-4.1-mini
// < claude — check the table there before reasoning about cost here.

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
 * An admin per-operation override applies only when its provider matches the
 * step's provider (same rule as resolveRoute — failover safety).
 */
export function getModelForStep(
    provider: AIServiceType,
    stepKey: PolicyAnalysisStepKey,
    userTier: UserTier = "free",
    overrides: AiRuntimeOverrides = {}
): string | undefined {
    const operation = stepToOperation(stepKey)
    if (!operation) return undefined

    const opOverride = overrides.operations?.[operation]
    if (opOverride && opOverride.provider === provider) {
        return opOverride.model
    }

    const route = routeModel(operation, provider, userTier)
    return route.model
}

// ── Per-call route resolver ─────────────────────────────────────────

export type ModelTier = "cheap" | "standard" | "premium"

export type RouteOperation = AICapabilityOperation | "translate"

export interface RouteRequest {
    operation: RouteOperation
    /** Pin a provider (e.g. the failover ladder). Omit for auto-selection. */
    provider?: AIServiceType
    userTier?: UserTier
    /** True for pipeline steps that ship the raw document. */
    hasDocument?: boolean
    /** Approximate input size, used to escalate large jobs. */
    inputBytes?: number
    /** Portfolio size for risk-profile routing. */
    portfolioSize?: number
}

export interface RouteDecision {
    provider: AIServiceType
    model: string
    tier: ModelTier
    /** Output-token cap for the call (undefined = provider default). */
    maxOutputTokens?: number
    /** Same-provider fallback model, if one is configured. */
    fallbackModel?: string
    /** Health-ordered provider preference for the single-shot ladder. */
    providerOrder: AIServiceType[]
}

// ── Admin runtime overrides (DB config, loaded by runtime-config.ts) ──

/** A fully pinned (provider, model) pair for one operation. */
export interface AiOperationOverride {
    provider: AIServiceType
    model: string
}

/**
 * Admin-configured routing overrides. The router stays pure/sync — callers
 * pre-load these via getAiRuntimeOverrides() (cached, never throws) and pass
 * them in. `{}` / omitted reproduces today's env-only behavior exactly.
 */
export interface AiRuntimeOverrides {
    primaryProvider?: AIServiceType
    operations?: Partial<Record<RouteOperation, AiOperationOverride>>
}

/**
 * Model tier matrix: (operation, provider) -> { cheap, standard, premium }.
 *
 * askQuestion and analyzeRiskProfile map to the same env model at every tier —
 * these are the paths wired to resolveRoute today, so routing them is
 * behavior-neutral. extraction/gaps/clarity carry real tier spreads for future
 * (eval-gated) deep-pipeline routing; nothing wired triggers them yet.
 */
const MODEL_TIERS: Record<
    RouteOperation,
    Partial<Record<AIServiceType, Record<ModelTier, string>>>
> = {
    extractPolicyData: {
        gemini: { cheap: env.GEMINI_MODEL_CLARITY_ANALYSIS, standard: env.GEMINI_MODEL_EXTRACTION, premium: env.GEMINI_MODEL_FALLBACK },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_EXTRACTION, premium: env.CLAUDE_MODEL_EXTRACTION },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_EXTRACTION, premium: env.OPENAI_MODEL_EXTRACTION },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
    analyzeGaps: {
        gemini: { cheap: env.GEMINI_MODEL_QA, standard: env.GEMINI_MODEL_GAP_ANALYSIS, premium: env.GEMINI_MODEL_GAP_ANALYSIS },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_GAP_ANALYSIS, premium: env.CLAUDE_MODEL_GAP_ANALYSIS },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_GAP_ANALYSIS, premium: env.OPENAI_MODEL_GAP_ANALYSIS },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
    analyzePolicyClarity: {
        gemini: { cheap: env.GEMINI_MODEL_CLARITY_ANALYSIS, standard: env.GEMINI_MODEL_EXTRACTION, premium: env.GEMINI_MODEL_EXTRACTION },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_CLARITY_ANALYSIS, premium: env.CLAUDE_MODEL_CLARITY_ANALYSIS },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_CLARITY_ANALYSIS, premium: env.OPENAI_MODEL_CLARITY_ANALYSIS },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
    // Interactive path — same model at every tier (cost is capped by the guard,
    // not the model), so wiring it is neutral.
    askQuestion: {
        gemini: { cheap: env.GEMINI_MODEL_QA, standard: env.GEMINI_MODEL_QA, premium: env.GEMINI_MODEL_QA },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_QA, premium: env.CLAUDE_MODEL_QA },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_QA, premium: env.OPENAI_MODEL_QA },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
    analyzeRiskProfile: {
        gemini: { cheap: env.GEMINI_MODEL_QA, standard: env.GEMINI_MODEL_QA, premium: env.GEMINI_MODEL_QA },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_QA, premium: env.CLAUDE_MODEL_QA },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_QA, premium: env.OPENAI_MODEL_QA },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
    translate: {
        gemini: { cheap: env.GEMINI_MODEL_TRANSLATION, standard: env.GEMINI_MODEL_TRANSLATION, premium: env.GEMINI_MODEL_TRANSLATION },
        anthropic: { cheap: env.CLAUDE_MODEL_QA, standard: env.CLAUDE_MODEL_QA, premium: env.CLAUDE_MODEL_QA },
        openai: { cheap: env.OPENAI_MODEL_QA, standard: env.OPENAI_MODEL_QA, premium: env.OPENAI_MODEL_QA },
        mock: { cheap: "mock", standard: "mock", premium: "mock" },
    },
}

/**
 * Output-token cap per operation. First time output is bounded anywhere in the
 * repo — interactive answers are short, so a generous cap protects against
 * runaway output cost without truncating a real answer. Extraction/gaps/clarity
 * are schema-bound large outputs and stay uncapped.
 */
export const MAX_OUTPUT_TOKENS: Partial<Record<RouteOperation, number>> = {
    askQuestion: 1500,
    analyzeRiskProfile: 4000,
    translate: 8000,
}

const PREMIUM_TIERS: ReadonlySet<UserTier> = new Set(["pro", "agent_pro"])

/**
 * Deterministic tier classification. This is the routing "policy": which model
 * class a request deserves given its operation, the user's plan, and the shape
 * of its input.
 */
export function classifyTier(req: RouteRequest): ModelTier {
    const isPremiumUser = req.userTier ? PREMIUM_TIERS.has(req.userTier) : false
    switch (req.operation) {
        case "askQuestion":
            // High-volume interactive path — always the cheap tier.
            return "cheap"
        case "analyzeRiskProfile":
            // Larger portfolios produce larger structured output → standard.
            return (req.portfolioSize ?? 0) > 5 ? "standard" : "cheap"
        case "translate":
            return "cheap"
        case "extractPolicyData":
            // Feeds everything downstream — never below standard. Large policies
            // for paying users escalate to premium.
            if (isPremiumUser && req.hasDocument && (req.inputBytes ?? 0) > 2_000_000) return "premium"
            return "standard"
        case "analyzeGaps":
            // Recall-critical — always standard.
            return "standard"
        case "analyzePolicyClarity":
            return isPremiumUser ? "standard" : "cheap"
        default:
            return "standard"
    }
}

/**
 * Provider auto-selection: honor AI_SERVICE_TYPE, then key availability. Mirrors
 * the factory's determineServiceType so the gateway and the factory agree on the
 * primary. (Health-aware ordering is layered in by provider-health in Phase 3.)
 */
export function selectPrimaryProvider(overrides: AiRuntimeOverrides = {}): AIServiceType {
    // Admin DB override wins over env (the /admin/ai/settings "Primary
    // provider" row); the loader only emits providers it validated.
    if (overrides.primaryProvider) return overrides.primaryProvider
    // AI_SERVICE_TYPE is not in the env schema (the factory reads it off
    // process.env directly); match that here so both agree on the primary.
    const envType = process.env.AI_SERVICE_TYPE?.toLowerCase()
    if (envType === "gemini" || envType === "openai" || envType === "anthropic" || envType === "mock") {
        return envType
    }
    if (env.GEMINI_API_KEY) return "gemini"
    if (env.ANTHROPIC_API_KEY) return "anthropic"
    if (env.OPENAI_API_KEY) return "openai"
    return "mock"
}

/** Same-provider fallback model, if configured. */
export function fallbackModelFor(provider: AIServiceType): string | undefined {
    switch (provider) {
        case "gemini":
            return env.GEMINI_MODEL_FALLBACK
        case "anthropic":
            return env.CLAUDE_MODEL_FALLBACK
        case "openai":
            return env.OPENAI_MODEL_FALLBACK
        default:
            return undefined
    }
}

function providerOrderFrom(primary: AIServiceType): AIServiceType[] {
    // Failover preference: primary first, then the standard chain, deduped.
    const chain: AIServiceType[] = [primary, "gemini", "anthropic", "openai"]
    return [...new Set(chain)]
}

/**
 * Resolve a full routing decision for a single call: provider, concrete model,
 * tier, output-token cap, fallback model, and provider order.
 *
 * Precedence with admin overrides:
 *  - provider: req.provider (explicit pin — the failover ladder keeps winning)
 *    > per-operation override provider > primaryProvider override > env.
 *  - model: the per-operation override model applies ONLY when its provider
 *    matches the resolved provider. When the ladder pins a different provider
 *    mid-incident, that provider serves its own env-configured models — never
 *    a model name from the wrong vendor.
 */
export function resolveRoute(req: RouteRequest, overrides: AiRuntimeOverrides = {}): RouteDecision {
    const opOverride = overrides.operations?.[req.operation]
    const provider =
        req.provider ?? opOverride?.provider ?? selectPrimaryProvider(overrides)
    const tier = classifyTier(req)

    const perProvider = MODEL_TIERS[req.operation]?.[provider]
    const tierModel = perProvider?.[tier] ?? perProvider?.standard ?? perProvider?.cheap ?? "mock"
    const model =
        opOverride && opOverride.provider === provider ? opOverride.model : tierModel

    return {
        provider,
        model,
        tier,
        maxOutputTokens: MAX_OUTPUT_TOKENS[req.operation],
        fallbackModel: fallbackModelFor(provider),
        providerOrder: providerOrderFrom(provider),
    }
}
