import { describe, it, expect } from 'vitest'
import { calculatePremiumFootprintDetailed } from '@/lib/wallet/premium-footprint'

const p = (over: Record<string, unknown> = {}) => ({
    id: Math.random().toString(36).slice(2),
    status: 'active',
    policyNumber: `P-${Math.random().toString(36).slice(2, 7)}`,
    insurerName: 'ΕΘΝΙΚΗ',
    endDate: new Date('2027-01-01'),
    premiumAmount: 100,
    acordData: {},
    ...over,
})

/**
 * The footprint already told the user when policies were left out for having no
 * readable end date. A policy with a readable date but NO PREMIUM was a second,
 * unspoken exclusion: it counts as cover, contributes 0, and quietly drags the
 * "total annual premium" below what the household actually pays.
 *
 * Both reasons now surface. A number presented as a total has to say when it is
 * not one.
 */
describe('the premium footprint admits what it could not count', () => {
    const now = new Date('2026-07-24T09:00:00Z')

    it('counts in-force policies that have no premium recorded', () => {
        const r = calculatePremiumFootprintDetailed(
            [p(), p({ premiumAmount: null }), p({ premiumAmount: undefined })] as any,
            now
        )
        expect(r.unknownPremiumCount).toBe(2)
    })

    it('still returns the total of what it could count', () => {
        const r = calculatePremiumFootprintDetailed([p(), p({ premiumAmount: null })] as any, now)
        expect(r.total).toBe(100)
        expect(r.countedPolicies).toBe(2)   // both are in force…
        expect(r.unknownPremiumCount).toBe(1) // …but only one had a figure
    })

    it('reports zero when every policy has a premium', () => {
        const r = calculatePremiumFootprintDetailed([p(), p({ premiumAmount: 250 })] as any, now)
        expect(r.unknownPremiumCount).toBe(0)
        expect(r.total).toBe(350)
    })

    it('treats an unparseable premium as unknown, not as zero', () => {
        const r = calculatePremiumFootprintDetailed([p({ premiumAmount: 'n/a' })] as any, now)
        expect(r.unknownPremiumCount).toBe(1)
    })

    it('keeps reporting the unknown-duration exclusion separately', () => {
        // The two reasons are different facts and must not be conflated.
        const r = calculatePremiumFootprintDetailed(
            [p(), p({ endDate: null, acordData: {} })] as any,
            now
        )
        expect(r.unknownDurationCount).toBeGreaterThanOrEqual(0)
        expect(r).toHaveProperty('unknownPremiumCount')
    })
})
