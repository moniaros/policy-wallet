import { describe, expect, it } from 'vitest'
import { recommendationsForPolicy } from '@/lib/wallet/policy-recommendations'

describe('policy recommendation context', () => {
    it('does not assign another insurer’s motor recommendation or a portfolio recommendation to the open policy', () => {
        const own = { id: 'own', sourcePolicyId: 'policy-a', lineOfBusiness: 'motor' }
        const other = { id: 'other', sourcePolicyId: 'policy-b', lineOfBusiness: 'motor' }
        const portfolio = { id: 'portfolio', sourcePolicyId: null, lineOfBusiness: 'motor' }
        expect(recommendationsForPolicy([other, portfolio, own], 'policy-a')).toEqual([own])
        expect(recommendationsForPolicy([other, portfolio], 'policy-a')).toEqual([])
    })
    it('fails closed without a policy identity', () => {
        expect(recommendationsForPolicy([{ sourcePolicyId: '' }], '')).toEqual([])
    })
})
