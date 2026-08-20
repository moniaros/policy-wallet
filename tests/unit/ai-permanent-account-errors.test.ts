import { describe, it, expect } from "vitest"
import { isTransientError, isPermanentAccountError } from "@/lib/services/ai/shared-utils"

/**
 * A billing wall is not a rate limit.
 *
 * On 2026-08-21 a real analysis run burned 483 seconds and twenty attempts
 * before failing, because Gemini reports "Your project has exceeded its
 * monthly spending cap" with HTTP 429. Every retry layer read 429 as "slow
 * down" and waited. No amount of waiting clears a monthly cap.
 *
 * The cost is not just the wasted time: the queue consumer's `maxDuration` is
 * 300s, so production would kill the function partway through the storm, and a
 * killed executor leaves its policy stuck `analyzing` until the lease expires.
 */
describe("permanent account failures are never retried", () => {
    function err(message: string, statusCode?: number): Error {
        const e = new Error(message)
        if (statusCode !== undefined) (e as any).statusCode = statusCode
        return e
    }

    const permanent = [
        "Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend",
        "You exceeded your current quota, please check your plan and billing details",
        "insufficient_quota",
        "Your credit balance is too low to access the Anthropic API",
    ]

    for (const message of permanent) {
        it(`does not retry: ${message.slice(0, 48)}…`, () => {
            // The 429 is the trap — it is what made these look retryable.
            expect(isPermanentAccountError(err(message, 429))).toBe(true)
            expect(isTransientError(err(message, 429))).toBe(false)
        })
    }

    it("still retries a real rate limit", () => {
        expect(isTransientError(err("Too Many Requests", 429))).toBe(true)
        expect(isPermanentAccountError(err("Too Many Requests", 429))).toBe(false)
    })

    it("still retries genuine server and timeout failures", () => {
        expect(isTransientError(err("Service Unavailable", 503))).toBe(true)
        expect(isTransientError(err("AI call timed out after 120000ms"))).toBe(true)
        const aborted = new Error("aborted")
        aborted.name = "AbortError"
        expect(isTransientError(aborted)).toBe(true)
    })
})
