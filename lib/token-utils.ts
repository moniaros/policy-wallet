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
    'gemini-3-flash-preview': {
        input: 0.00007,
        output: 0.00028,
    },
    'gemini-3-pro-preview': {
        input: 0.00035,
        output: 0.0014,
    },
} as const

export type AIModel = keyof typeof TOKEN_COSTS

export type OperationType =
    | 'policy_analysis'
    | 'policy_clarity'
    | 'gap_detection'
    | 'qa_session'
    | 'document_parsing'
    | 'opportunity_analysis'
    | 'client_report'
    | 'notification_generation'
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
