/**
 * Token Tracking Utilities
 * Shared helper functions and types for token tracking
 * Safe for use in Client Components
 */

// Token costs per model in EUR PER 1M TOKENS. trackTokenUsage computes
// (tokens / 1_000_000) * cost, so these values must be the full per-million
// price. The pre-2026-07 table stored per-1K prices against the same
// divisor, silently under-metering every cost_eur row by 1000x — historical
// rows written before this fix carry that scale.
export const TOKEN_COSTS = {
    'gemini-2.0-flash': {
        input: 0.07,
        output: 0.28,
    },
    'gemini-2.0-flash-exp': {
        input: 0.07,
        output: 0.28,
    },
    'gemini-2.5-flash': {
        input: 0.30,
        output: 2.50,
    },
    'gemini-2.5-pro': {
        input: 1.25,
        output: 10,
    },
    'gemini-3-flash-preview': {
        input: 0.50,
        output: 3,
    },
    'gemini-3-pro-preview': {
        input: 2,
        output: 12,
    },
    'gemini-3.1-pro-preview': {
        input: 2,
        output: 12,
    },
    'gemini-3.5-flash': {
        input: 1.50,
        output: 9,
    },
    'gemini-3.1-flash-lite': {
        input: 0.25,
        output: 1.50,
    },
    'gpt-4.1-mini': {
        input: 0.40,
        output: 1.60,
    },
    'gpt-4o-mini': {
        input: 0.15,
        output: 0.60,
    },
    'claude-sonnet-5': {
        input: 3,   // sticker; intro pricing is lower through 2026-08
        output: 15,
    },
    'claude-haiku-4-5': {
        input: 1,
        output: 5,
    },
    // Legacy keys — keep so historical usage rows still resolve exact prices.
    'claude-sonnet-4-20250514': {
        input: 3,
        output: 15,
    },
    'claude-haiku-4-20250414': {
        input: 0.80,
        output: 4,
    },
} as const

export type AIModel = keyof typeof TOKEN_COSTS

// Model names reach tracking as arbitrary env-configured strings
// (GEMINI_MODEL_* etc.), so an exact TOKEN_COSTS hit is never guaranteed.
// Missing entries used to crash trackTokenUsage mid-analysis
// ("Cannot read properties of undefined (reading 'input')").
// Priced at Opus-tier — the fallback must OVER-meter an unknown model
// (e.g. an env override to a claude-opus-* ID), never under-meter it.
const UNKNOWN_MODEL_COSTS = { input: 5, output: 25 }

export function resolveTokenCosts(model: string): { input: number; output: number } {
    const exact = TOKEN_COSTS[model as AIModel]
    if (exact) return exact

    // Family fallback: longest known key sharing a prefix with the model
    // (e.g. 'gemini-2.5-flash-lite' → 'gemini-2.5-flash').
    const family = (Object.keys(TOKEN_COSTS) as AIModel[])
        .filter((key) => model.startsWith(key) || key.startsWith(model))
        .sort((a, b) => b.length - a.length)[0]
    if (family) return TOKEN_COSTS[family]

    return UNKNOWN_MODEL_COSTS
}

export type OperationType =
    | 'policy_analysis'
    | 'policy_clarity'
    | 'gap_detection'
    | 'qa_session'
    | 'document_parsing'
    | 'opportunity_analysis'
    | 'client_report'
    | 'notification_generation'
    | 'risk_profile_analysis'
    | 'other'

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(2)}M`
    }
    if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(1)}K`
    }
    return tokens.toString()
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
    return `€${cost.toFixed(4)}`
}
