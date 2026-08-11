import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

import {
    AI_CALL_TIMEOUT_MS,
    ANALYSIS_FUNCTION_BUDGET_MS,
    INITIAL_BACKOFF_MS,
    MAX_RETRIES,
    WORST_CASE_CALL_MS,
} from '@/lib/services/ai/shared-utils'

/**
 * A retry that cannot finish is not a retry.
 *
 * The per-call timeout was 180s with one retry, against a 300s function budget:
 * 180 + 2 + 180 = 362s. A single transient hang therefore killed the analysis
 * function before the retry — the mechanism that exists to rescue exactly that
 * case — had a chance to run. Nothing connected the two numbers, so nothing
 * noticed.
 *
 * This is not theoretical. Two of five extraction calls against
 * `gemini-3-flash-preview` hit the 180s timeout in a single eval run, while
 * healthy calls on the same document completed in 2.7-25.7s.
 */
describe('AI call timeout fits inside the function budget', () => {
    it('leaves room for the retry the ladder promises', () => {
        expect(WORST_CASE_CALL_MS).toBeLessThan(ANALYSIS_FUNCTION_BUDGET_MS)
    })

    it('computes the worst case from the parts, so changing one is caught', () => {
        expect(WORST_CASE_CALL_MS).toBe(
            AI_CALL_TIMEOUT_MS * (MAX_RETRIES + 1) + INITIAL_BACKOFF_MS * MAX_RETRIES
        )
    })

    it('stays comfortably above the slowest healthy call observed', () => {
        // ~25.7s was the slowest successful extraction measured. A timeout near
        // that would fail healthy work; the point is to catch hangs, not slowness.
        expect(AI_CALL_TIMEOUT_MS).toBeGreaterThan(60_000)
    })

    it('matches the maxDuration actually configured on the analysis route', () => {
        // The budget constant is a copy of a value that lives in two other
        // places. If either moves, this is where it gets noticed.
        const route = readFileSync(
            join(__dirname, '..', '..', 'app/api/v1/jobs/execute-analysis/route.ts'),
            'utf8'
        )
        const match = route.match(/export const maxDuration = (\d+)/)
        expect(match, 'execute-analysis no longer declares maxDuration').toBeTruthy()
        expect(Number(match![1]) * 1000).toBe(ANALYSIS_FUNCTION_BUDGET_MS)
    })
})
