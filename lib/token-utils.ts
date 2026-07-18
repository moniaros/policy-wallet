/**
 * Token Tracking Utilities
 * Shared helper functions and types for token tracking
 * Safe for use in Client Components
 */

// Token costs for different AI models (in EUR per 1M tokens)
export const TOKEN_COSTS = {
    'gemini-2.0-flash': {
        input: 0.00007, // €0.070 per 1M tokens
        output: 0.00028, // €0.28 per 1M tokens
    },
    'gemini-2.0-flash-exp': {
        input: 0.00007,
        output: 0.00028,
    },
    'gemini-2.5-flash': {
        input: 0.0003,
        output: 0.0025,
    },
    'gemini-2.5-pro': {
        input: 0.00125,
        output: 0.01,
    },
    'gemini-3-flash-preview': {
        input: 0.0005,  // €0.50 per 1M tokens
        output: 0.003,  // €3.00 per 1M tokens
    },
    'gemini-3-pro-preview': {
        input: 0.002,
        output: 0.012,
    },
    'gemini-3.1-pro-preview': {
        input: 0.002,
        output: 0.012,
    },
    'gemini-3.5-flash': {
        input: 0.0015,
        output: 0.009,
    },
    'gemini-3.1-flash-lite': {
        input: 0.00025,
        output: 0.0015,
    },
    'gpt-4.1-mini': {
        input: 0.0004,
        output: 0.0016,
    },
    'gpt-4o-mini': {
        input: 0.00015,
        output: 0.0006,
    },
    'claude-sonnet-5': {
        input: 0.003,   // €3.00 per 1M tokens (sticker; intro pricing is lower through 2026-08)
        output: 0.015,  // €15.00 per 1M tokens
    },
    'claude-haiku-4-5': {
        input: 0.001,   // €1.00 per 1M tokens
        output: 0.005,  // €5.00 per 1M tokens
    },
    // Legacy keys — keep so historical usage rows still resolve exact prices.
    'claude-sonnet-4-20250514': {
        input: 0.003,
        output: 0.015,
    },
    'claude-haiku-4-20250414': {
        input: 0.0008,
        output: 0.004,
    },
} as const

export type AIModel = keyof typeof TOKEN_COSTS

// Model names reach tracking as arbitrary env-configured strings
// (GEMINI_MODEL_* etc.), so an exact TOKEN_COSTS hit is never guaranteed.
// Missing entries used to crash trackTokenUsage mid-analysis
// ("Cannot read properties of undefined (reading 'input')").
const UNKNOWN_MODEL_COSTS = { input: 0.00125, output: 0.01 } // priced as gemini-2.5-pro (conservative)

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
