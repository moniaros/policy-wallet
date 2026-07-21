/**
 * Shared AI Service Utilities
 *
 * Common functions used across all AI service implementations.
 * Extracted to eliminate duplication between Gemini, OpenAI, and Anthropic services.
 */

import { logger } from '@/lib/logger'

export const AI_CALL_TIMEOUT_MS = 180_000
export const MAX_RETRIES = 1
export const INITIAL_BACKOFF_MS = 2_000

/**
 * Checks if a regex pattern matches a value (case-insensitive)
 */
export function matchesAnyPattern(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => new RegExp(pattern, 'i').test(value))
}

/**
 * Determines if an error is transient and worth retrying.
 *
 * Structured signals win: the `ai` SDK's APICallError carries the HTTP status
 * and its own retryability verdict. Message matching is only the fallback,
 * with anchored status codes — the old bare `includes('500')`/`'aborted'`
 * matched those substrings anywhere (ids, validation text) and retried
 * permanent failures.
 */
export function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const status = (error as Error & { statusCode?: unknown }).statusCode
    if (typeof status === 'number') {
        return status === 408 || status === 409 || status === 429 || status >= 500
    }
    const retryable = (error as Error & { isRetryable?: unknown }).isRetryable
    if (typeof retryable === 'boolean') return retryable

    // The wrapper's own timeout abort and fetch/undici aborts.
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return true

    const msg = error.message.toLowerCase()
    return (
        msg.includes('timeout') ||
        msg.includes('timed out') ||
        msg.includes('deadline') ||
        /\b(429|500|502|503|504)\b/.test(msg) ||
        msg.includes('service unavailable') ||
        msg.includes('temporarily') ||
        msg.includes('overloaded')
    )
}

/** The provider's requested retry delay, from APICallError response headers. */
function retryAfterMsFrom(error: unknown): number | null {
    const headers = (error as { responseHeaders?: Record<string, string> })?.responseHeaders
    if (!headers) return null
    const ms = Number(headers['retry-after-ms'])
    if (Number.isFinite(ms) && ms > 0) return ms
    const seconds = Number(headers['retry-after'])
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
    return null
}

/**
 * Wraps an async function with a timeout and retry logic for transient failures.
 * Accepts an optional AbortSignal so callers can propagate cancellation from
 * the orchestrator.  When a timeout fires, the returned AbortController is
 * aborted so SDK calls that honour AbortSignal can clean up immediately.
 */
export async function withTimeoutAndRetry<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    context: string
): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => {
            controller.abort()
        }, AI_CALL_TIMEOUT_MS)

        try {
            const result = await Promise.race([
                fn(controller.signal),
                new Promise<never>((_, reject) => {
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS}ms`))
                    })
                }),
            ])
            clearTimeout(timer)
            return result
        } catch (error) {
            clearTimeout(timer)
            if (!controller.signal.aborted) {
                controller.abort()
            }
            lastError = error
            if (attempt < MAX_RETRIES && isTransientError(error)) {
                // maxRetries: 0 on the SDK calls also disabled the SDK's
                // Retry-After-aware backoff — honor the provider's requested
                // wait here (capped) or a 2s retry into a 30s rate limit is
                // guaranteed to fail again.
                const backoff = Math.min(
                    30_000,
                    Math.max(INITIAL_BACKOFF_MS * Math.pow(2, attempt), retryAfterMsFrom(error) ?? 0)
                )
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
