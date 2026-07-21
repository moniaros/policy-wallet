/**
 * isTransientError — the retry gate for every AI provider call. Structured
 * signals (APICallError statusCode / isRetryable) must win over message
 * matching, and the old bare substrings ('500', 'aborted', 'internal') must no
 * longer classify permanent failures as retryable.
 */
import { describe, it, expect } from 'vitest'
import { isTransientError } from '@/lib/services/ai/shared-utils'

const withProps = (message: string, props: Record<string, unknown>) =>
    Object.assign(new Error(message), props)

describe('isTransientError', () => {
    it('trusts the HTTP status when present — retryable codes', () => {
        expect(isTransientError(withProps('x', { statusCode: 429 }))).toBe(true)
        expect(isTransientError(withProps('x', { statusCode: 500 }))).toBe(true)
        expect(isTransientError(withProps('x', { statusCode: 503 }))).toBe(true)
        expect(isTransientError(withProps('x', { statusCode: 408 }))).toBe(true)
    })

    it('trusts the HTTP status when present — permanent codes never retry, whatever the message says', () => {
        expect(isTransientError(withProps('request timeout maybe?', { statusCode: 400 }))).toBe(false)
        expect(isTransientError(withProps('overloaded', { statusCode: 401 }))).toBe(false)
        expect(isTransientError(withProps('service unavailable', { statusCode: 422 }))).toBe(false)
    })

    it("respects the SDK's own isRetryable verdict when no status exists", () => {
        expect(isTransientError(withProps('anything', { isRetryable: true }))).toBe(true)
        expect(isTransientError(withProps('timeout-sounding text', { isRetryable: false }))).toBe(false)
    })

    it('treats abort/timeout error names as transient (the wrapper timeout path)', () => {
        expect(isTransientError(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))).toBe(true)
        expect(isTransientError(Object.assign(new Error(''), { name: 'TimeoutError' }))).toBe(true)
        expect(isTransientError(new Error('AI call timed out after 180000ms'))).toBe(true)
    })

    it('message fallback: anchored status codes only', () => {
        expect(isTransientError(new Error('Upstream returned 503'))).toBe(true)
        expect(isTransientError(new Error('Error 429: rate limited'))).toBe(true)
        // '500' inside an identifier is NOT a server error.
        expect(isTransientError(new Error('invalid schema for field item5000'))).toBe(false)
        // The old bare-'internal' match retried permanent validation failures.
        expect(isTransientError(new Error('internal validation failed: missing field'))).toBe(false)
        // Plain aborted text without an AbortError name is not blanket-retryable.
        expect(isTransientError(new Error('stream aborted by client'))).toBe(false)
    })

    it('non-Error values are never transient', () => {
        expect(isTransientError('503')).toBe(false)
        expect(isTransientError(null)).toBe(false)
    })
})
