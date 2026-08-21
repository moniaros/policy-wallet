/**
 * Shared AI Service Utilities
 *
 * Common functions used across all AI service implementations.
 * Extracted to eliminate duplication between Gemini, OpenAI, and Anthropic services.
 */

import { logger } from '@/lib/logger'

/**
 * The analysis function's own budget, from `maxDuration` on
 * app/api/v1/jobs/execute-analysis/route.ts and vercel.json. Named here because
 * the timeout below has to FIT INSIDE it, and nothing enforced that.
 */
export const ANALYSIS_FUNCTION_BUDGET_MS = 300_000

/**
 * Per-call timeout.
 *
 * Was 180s, which does not survive its own retry: 180 + 2 + 180 = 362s against a
 * 300s function budget, so a single transient hang killed the whole analysis run
 * before the retry could finish — and the retry exists precisely to rescue that
 * case. Measured, not theoretical: two of five extraction calls against
 * `gemini-3-flash-preview` hit the 180s timeout in one eval run.
 *
 * 120s leaves 120 + 2 + 120 = 242s inside the budget, and it is still roughly
 * five times the slowest HEALTHY call observed (25.7s; most land under 20s). A
 * call past two minutes is not slow, it is hung, and failing it over to the
 * fallback model is both faster and cheaper than waiting.
 */
export const AI_CALL_TIMEOUT_MS = 120_000
export const MAX_RETRIES = 1
export const INITIAL_BACKOFF_MS = 2_000

/** Worst-case wall time of one guarded call, including its retry and backoff. */
export const WORST_CASE_CALL_MS =
    AI_CALL_TIMEOUT_MS * (MAX_RETRIES + 1) + INITIAL_BACKOFF_MS * MAX_RETRIES

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
/**
 * Provider conditions that arrive wearing a retryable status code but cannot
 * succeed on retry, because the account — not the request — is the problem.
 *
 * Observed 2026-08-21: Gemini returns "Your project has exceeded its monthly
 * spending cap" as **HTTP 429**. 429 means "slow down", so every layer above
 * dutifully retried it: the wrapper twice, the orchestrator ten times over,
 * twenty attempts and 483 seconds before the run failed. Nothing about waiting
 * fixes a monthly cap.
 *
 * That is not merely wasteful. `maxDuration` on the queue consumer is 300s, so
 * in production the function is KILLED mid-storm — and a killed executor
 * leaves its policy stuck `analyzing` until the lease expires and the reaper
 * finds it. A fast, honest failure produces a policy the wallet can explain.
 */
const PERMANENT_ACCOUNT_FAILURES = [
    "spending cap",
    "spend cap",
    "exceeded your current quota",
    "insufficient_quota",
    "insufficient quota",
    "billing",
    "credit balance is too low",
    "payment required",
    "account is not active",
]

/** True when the provider is refusing for a reason that outlives the request. */
export function isPermanentAccountError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    return PERMANENT_ACCOUNT_FAILURES.some((needle) => msg.includes(needle))
}

export function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    // Checked BEFORE the status rules, because these arrive as 429 and would
    // otherwise be retried until the function is killed.
    if (isPermanentAccountError(error)) return false

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
