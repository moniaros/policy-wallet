import { describe, expect, it, vi } from 'vitest'

import { TOKEN_COSTS, resolveTokenCosts } from '@/lib/token-utils'

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn().mockRejectedValue(new Error('db down')) },
        subscription: { findFirst: vi.fn().mockRejectedValue(new Error('db down')) },
        $transaction: vi.fn(),
    },
}))
vi.mock('@/lib/subscription-limits', () => ({
    getUserSubscription: vi.fn().mockResolvedValue({ tier: 'free' }),
}))

describe('resolveTokenCosts', () => {
    // Regression for the prod outage: analysis models come from env strings
    // (GEMINI_MODEL_* etc.); every lib/env default MUST have an exact price
    // entry so metering never silently falls back for the standard fleet.
    it.each([
        'gemini-2.5-pro', // GEMINI_MODEL_EXTRACTION / GAP_ANALYSIS default
        'gemini-2.5-flash', // GEMINI_MODEL_CLARITY / QA / FALLBACK default
        'gpt-4.1-mini',
        'claude-sonnet-4-20250514',
        'claude-haiku-4-20250414',
        'gemini-2.0-flash',
    ])('has an exact TOKEN_COSTS entry for env-default model %s', (model) => {
        expect(TOKEN_COSTS[model as keyof typeof TOKEN_COSTS]).toBeDefined()
        expect(resolveTokenCosts(model)).toBe(TOKEN_COSTS[model as keyof typeof TOKEN_COSTS])
    })

    it('falls back to the model family for unknown variants', () => {
        expect(resolveTokenCosts('gemini-2.5-flash-lite')).toEqual(
            TOKEN_COSTS['gemini-2.5-flash']
        )
    })

    it('returns conservative default pricing for fully unknown models', () => {
        const costs = resolveTokenCosts('some-future-model')
        expect(costs.input).toBeGreaterThan(0)
        expect(costs.output).toBeGreaterThan(0)
    })
})

describe('trackTokenUsage', () => {
    it('never throws — a metering failure must not fail the analysis', async () => {
        const { trackTokenUsage } = await import('@/lib/token-tracking')
        await expect(
            trackTokenUsage({
                userId: 'user-1',
                operationType: 'policy_analysis',
                inputTokens: 1000,
                outputTokens: 500,
                model: 'gemini-2.5-flash' as any,
            })
        ).resolves.toBeUndefined()
    })
})
