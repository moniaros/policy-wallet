import { describe, expect, it } from 'vitest'

import {
    aggregateLimit,
    assessAdequacy,
    deductibleExposure,
    deductibleIsMaterial,
    perLossLimit,
} from '@/lib/insurance/coverage-limits'

/**
 * Adequacy, not presence.
 *
 * The standing finding against the risk engine is that it asks "is there a
 * policy?" and never "is the amount anywhere near the exposure?", despite the
 * extraction layer already capturing insured values and limits. This module is
 * the answer, and the tests below are mostly about the ways it must REFUSE to
 * answer — an adequacy engine that guesses is worse than none, because a false
 * "adequate" tells someone to stop looking.
 */
describe('per-loss limit — smallest tower wins', () => {
    it('returns the per-person limit over the larger per-event one', () => {
        // €150k per person / €700k per event: a single claimant meets €150k
        // first, so reporting €700k would overstate what they can recover.
        const limit = perLossLimit({
            name: 'Σωματικές Βλάβες',
            limits: [
                { basis: 'per_event', amount: 700000, currency: 'EUR', unlimited: false },
                { basis: 'per_person', amount: 150000, currency: 'EUR', unlimited: false },
            ],
        })
        expect(limit).toMatchObject({ known: true, unlimited: false, amount: 150000, basis: 'per_person' })
    })

    it('ignores the period aggregate when asked for a single loss', () => {
        const limit = perLossLimit({
            name: 'Σωματικές Βλάβες',
            limits: [
                { basis: 'per_person', amount: 150000, unlimited: false },
                { basis: 'per_period_aggregate', amount: 2100000, unlimited: false },
            ],
        })
        expect(limit).toMatchObject({ amount: 150000 })
        expect(aggregateLimit({
            name: 'Σωματικές Βλάβες',
            limits: [
                { basis: 'per_person', amount: 150000, unlimited: false },
                { basis: 'per_period_aggregate', amount: 2100000, unlimited: false },
            ],
        })).toMatchObject({ amount: 2100000 })
    })

    it('treats an unlimited benefit as unlimited, not as a large number', () => {
        expect(perLossLimit({
            name: 'Αεροδιακομιδή',
            limits: [{ basis: 'per_event', unlimited: true }],
        })).toEqual({ known: true, unlimited: true, currency: undefined })
    })
})

describe('per-loss limit — refusing to answer', () => {
    it('reports free text as unknown rather than parsing it', () => {
        // "1.500.000 € ανά έτος, 750 € απαλλαγή" holds two numbers and no way to
        // tell which is which without guessing.
        expect(perLossLimit({ name: 'Νοσοκομειακή', limit: '1.500.000 € ανά έτος, 750 € απαλλαγή' }))
            .toEqual({ known: false, reason: 'only_free_text' })
    })

    it('distinguishes "nothing stated" from "free text we will not parse"', () => {
        expect(perLossLimit({ name: 'Κάλυψη' })).toEqual({ known: false, reason: 'not_stated' })
    })

    it('returns unknown for a limit entry carrying no amount and no unlimited flag', () => {
        expect(perLossLimit({ name: 'x', limits: [{ basis: 'per_event', unlimited: false }] }))
            .toEqual({ known: false, reason: 'not_stated' })
    })

    it('handles a missing coverage without throwing', () => {
        expect(perLossLimit(undefined)).toEqual({ known: false, reason: 'not_stated' })
        expect(perLossLimit(null)).toEqual({ known: false, reason: 'not_stated' })
    })
})

describe('deductible exposure — the ladder and its resolution rule', () => {
    const yachtHull = {
        name: 'Ίδιες Ζημιές Σκάφους',
        deductibles: [
            { basis: 'per_event' as const, amount: 10000, currency: 'EUR' },
            { basis: 'per_event' as const, amount: 20000, currency: 'EUR' },
            { basis: 'per_event' as const, amount: 500, currency: 'EUR' },
            { basis: 'per_event' as const, amount: 0, currency: 'EUR' },
        ],
    }

    it('takes the largest when the policy says the largest applies', () => {
        const exposure = deductibleExposure(yachtHull, 'largest_applies')
        expect(exposure).toMatchObject({ known: true, worstCase: 20000, resolution: 'largest_applies' })
    })

    it('sums them when the policy says they are cumulative', () => {
        expect(deductibleExposure(yachtHull, 'cumulative').worstCase).toBe(30500)
    })

    it('still reports the worst case when the policy is silent, and flags that it is', () => {
        const exposure = deductibleExposure(yachtHull)
        expect(exposure.worstCase).toBe(20000)
        expect(exposure.resolution).toBe('unknown')
    })

    it('counts a percentage deductible’s floor as a real amount', () => {
        // «% επί κάθε υλικής ζημίας, ελάχιστο 350 €» — the €350 is met on every
        // small claim regardless of what the percentage works out to.
        const exposure = deductibleExposure({
            name: 'Υλικές Ζημιές Τρίτων',
            deductibles: [{ basis: 'per_event', percentOf: 'κάθε υλική ζημία', minimum: 350, currency: 'EUR' }],
        })
        expect(exposure).toMatchObject({ known: true, worstCase: 350, hasPercentageComponent: true })
    })

    it('reports unknown when nothing numeric is stated', () => {
        expect(deductibleExposure({ name: 'x', deductibles: [] }).known).toBe(false)
        expect(deductibleExposure(undefined).known).toBe(false)
    })
})

describe('adequacy — judging a limit against an exposure', () => {
    const limit = (amount: number, currency = 'EUR') =>
        ({ known: true as const, unlimited: false as const, amount, currency, basis: 'per_event' as const })

    it('calls a limit at or above the exposure adequate', () => {
        expect(assessAdequacy(limit(250000), { amount: 200000 })).toMatchObject({ verdict: 'adequate' })
        expect(assessAdequacy(limit(200000), { amount: 200000 })).toMatchObject({ verdict: 'adequate' })
    })

    it('calls a limit just under the exposure tight rather than short', () => {
        const verdict = assessAdequacy(limit(190000), { amount: 200000 })
        expect(verdict.verdict).toBe('tight')
    })

    it('quantifies a real shortfall', () => {
        expect(assessAdequacy(limit(120000), { amount: 200000 }))
            .toMatchObject({ verdict: 'short', shortfall: 80000 })
    })

    it('refuses to compare across currencies rather than converting', () => {
        // A USD crew benefit table against a EUR exposure. Converting would be
        // wrong by roughly a tenth and would look authoritative doing it.
        expect(assessAdequacy(limit(12000, 'USD'), { amount: 12000, currency: 'EUR' }))
            .toEqual({ verdict: 'unknown', reason: 'currency_mismatch' })
    })

    it('defaults both sides to EUR so a Greek retail policy still compares', () => {
        expect(assessAdequacy(
            { known: true, unlimited: false, amount: 300000, basis: 'per_event' },
            { amount: 250000 }
        )).toMatchObject({ verdict: 'adequate' })
    })

    it('says unknown when the exposure is unknown, never adequate', () => {
        expect(assessAdequacy(limit(200000), { amount: null })).toEqual({ verdict: 'unknown', reason: 'no_exposure' })
        expect(assessAdequacy(limit(200000), { amount: 0 })).toEqual({ verdict: 'unknown', reason: 'no_exposure' })
    })

    it('says unknown when the limit is unknown, never short', () => {
        // The dangerous direction: an unreadable limit must not read as no cover.
        expect(assessAdequacy({ known: false, reason: 'only_free_text' }, { amount: 200000 }))
            .toEqual({ verdict: 'unknown', reason: 'no_limit' })
    })

    it('short-circuits on an unlimited benefit', () => {
        expect(assessAdequacy({ known: true, unlimited: true }, { amount: 999999 }))
            .toEqual({ verdict: 'unlimited' })
    })
})

describe('deductible materiality — against savings, not income', () => {
    const ladder = deductibleExposure(
        { name: 'x', deductibles: [{ basis: 'per_event', amount: 10000, currency: 'EUR' }] },
        'largest_applies'
    )

    it('flags a deductible that eats a quarter of savings or more', () => {
        expect(deductibleIsMaterial(ladder, 20000)).toMatchObject({ material: true, known: true })
    })

    it('does not flag one a household absorbs comfortably', () => {
        expect(deductibleIsMaterial(ladder, 200000)).toMatchObject({ material: false, known: true })
    })

    it('says unknown rather than material when savings were never declared', () => {
        // Reporting a €10,000 deductible as material without knowing what the
        // customer has would be an assumption about their finances.
        expect(deductibleIsMaterial(ladder, null)).toEqual({ material: false, known: false })
        expect(deductibleIsMaterial(ladder, 0)).toEqual({ material: false, known: false })
    })

    it('says unknown when the deductible itself is unknown', () => {
        expect(deductibleIsMaterial({ known: false, resolution: 'unknown', hasPercentageComponent: false }, 20000))
            .toEqual({ material: false, known: false })
    })
})
