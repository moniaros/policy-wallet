/**
 * Shared AI Service Utilities
 *
 * Common functions used across all AI service implementations.
 * Extracted to eliminate duplication between Gemini, OpenAI, and Anthropic services.
 */

import { logger } from '@/lib/logger'

export const AI_CALL_TIMEOUT_MS = 60_000
export const MAX_RETRIES = 1
export const INITIAL_BACKOFF_MS = 2_000

/**
 * Checks if a regex pattern matches a value (case-insensitive)
 */
export function matchesAnyPattern(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => new RegExp(pattern, 'i').test(value))
}

/**
 * Determines if an error is transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    return (
        msg.includes('timeout') ||
        msg.includes('aborted') ||
        msg.includes('deadline') ||
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('503') ||
        msg.includes('service unavailable') ||
        msg.includes('internal') ||
        msg.includes('temporarily') ||
        msg.includes('overloaded')
    )
}

/**
 * Wraps an async function with a timeout and retry logic for transient failures.
 */
export async function withTimeoutAndRetry<T>(
    fn: () => Promise<T>,
    context: string
): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await Promise.race([
                fn(),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS}ms`)),
                        AI_CALL_TIMEOUT_MS
                    )
                ),
            ])
            return result
        } catch (error) {
            lastError = error
            if (attempt < MAX_RETRIES && isTransientError(error)) {
                const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
                logger(
                    'warn',
                    `${context}: transient failure, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
                    { error: error instanceof Error ? error.message : String(error) }
                )
                await new Promise((resolve) => setTimeout(resolve, backoff))
            } else {
                throw error
            }
        }
    }
    throw lastError
}

/**
 * Normalizes token usage from various AI SDK response formats into a consistent shape.
 */
export function parseUsage(
    usage: any,
    model: string,
    provider: 'gemini' | 'openai' | 'anthropic' | 'mock'
) {
    const inputTokens = Number(usage?.inputTokens ?? usage?.promptTokens ?? 0)
    const outputTokens = Number(usage?.outputTokens ?? usage?.completionTokens ?? 0)
    return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        provider,
    }
}
