import { describe, it, expect } from 'vitest'
import { sortNotableConditions, type NotableCondition } from '@/lib/wallet/policy-detail'

const c = (conditionType: string, userActionRequired = false): NotableCondition => ({
    conditionType,
    summary: { en: conditionType, el: conditionType },
    userActionRequired,
})

/**
 * The notable-conditions list rendered in raw extraction order, so a claim
 * deadline (miss it, claim denied) could sit below an informational no-claims
 * bonus. These are the policy's gotchas; the ones that deny a claim or cost money
 * belong at the top.
 */
describe('notable conditions are ordered by risk to the holder', () => {
    it('puts claim-denying conditions before informational ones', () => {
        const ordered = sortNotableConditions([
            c('no_claims_bonus'),
            c('claim_deadline'),
            c('auto_renewal'),
            c('cancellation_penalty'),
        ]).map((x) => x.conditionType)
        expect(ordered).toEqual(['claim_deadline', 'cancellation_penalty', 'auto_renewal', 'no_claims_bonus'])
    })

    it('lifts anything requiring user action above everything else', () => {
        const ordered = sortNotableConditions([
            c('sub_limit'),
            c('geographic_restriction', true), // action required — jumps the queue
            c('claim_deadline'),
        ]).map((x) => x.conditionType)
        expect(ordered[0]).toBe('geographic_restriction')
    })

    it('is a stable tiebreak within the same rank (extraction order kept)', () => {
        const first = { ...c('sub_limit'), value: 'first' }
        const second = { ...c('sub_limit'), value: 'second' }
        const ordered = sortNotableConditions([first, second])
        expect(ordered.map((x) => x.value)).toEqual(['first', 'second'])
    })

    it('sorts an unknown condition type to the end, not the top', () => {
        const ordered = sortNotableConditions([c('mystery_clause'), c('claim_deadline')]).map((x) => x.conditionType)
        expect(ordered).toEqual(['claim_deadline', 'mystery_clause'])
    })

    it('does not drop or duplicate any condition', () => {
        const input = ['no_claims_bonus', 'claim_deadline', 'co_payment', 'waiting_period'].map((t) => c(t))
        const ordered = sortNotableConditions(input)
        expect(ordered).toHaveLength(4)
        expect(new Set(ordered.map((x) => x.conditionType)).size).toBe(4)
    })
})
