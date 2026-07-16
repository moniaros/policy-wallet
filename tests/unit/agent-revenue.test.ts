import { describe, it, expect } from 'vitest'
import { computeAgentBookRevenue, MAX_PLAUSIBLE_ANNUAL_PREMIUM } from '@/lib/agent/revenue'

// ~200 days out so resolvePolicyLifecycle treats these as in force (active).
const future = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000)

const policy = (over: Record<string, unknown> = {}) => ({
    id: Math.random().toString(36).slice(2),
    status: 'active',
    endDate: future,
    lineOfBusiness: 'motor',
    policyNumber: 'P-1',
    insurerName: 'Allianz',
    premiumAmount: 1000,
    ...over,
})

describe('computeAgentBookRevenue', () => {
    it('dedupes re-uploads of the same policy number (three uploads = one exposure)', () => {
        const r = computeAgentBookRevenue([
            policy({ id: 'a', policyNumber: 'P-1', premiumAmount: 1000 }),
            policy({ id: 'b', policyNumber: 'P-1', premiumAmount: 1000 }),
            policy({ id: 'c', policyNumber: 'P-1', premiumAmount: 1000 }),
        ], { motor: 10 })

        expect(r.policyCount).toBe(1)
        expect(r.dedupedPremium).toBe(1000)
        expect(r.annualCommission).toBe(100) // 1000 * 10%
        expect(r.monthlyCommission).toBeCloseTo(100 / 12)
    })

    it('sums distinct policy numbers with their per-line rates', () => {
        const r = computeAgentBookRevenue([
            policy({ policyNumber: 'P-1', premiumAmount: 1000, lineOfBusiness: 'motor' }),
            policy({ policyNumber: 'P-2', premiumAmount: 2000, lineOfBusiness: 'home' }),
        ], { motor: 10, home: 20 })

        expect(r.policyCount).toBe(2)
        expect(r.dedupedPremium).toBe(3000)
        expect(r.annualCommission).toBe(1000 * 0.1 + 2000 * 0.2) // 100 + 400
    })

    it('excludes an implausible mis-extracted premium (sum-insured captured as premium)', () => {
        const r = computeAgentBookRevenue([
            policy({ policyNumber: 'P-1', premiumAmount: 500 }),
            policy({ policyNumber: 'P-2', premiumAmount: MAX_PLAUSIBLE_ANNUAL_PREMIUM + 1 }),
        ], { motor: 15 })

        expect(r.policyCount).toBe(1)
        expect(r.dedupedPremium).toBe(500)
        expect(r.annualCommission).toBe(75) // 500 * 15%, the €100k+ row dropped
    })

    it('falls back to the default 15% commission when no rate is configured', () => {
        const r = computeAgentBookRevenue([policy({ premiumAmount: 1000, lineOfBusiness: 'other' })], {})
        expect(r.annualCommission).toBeCloseTo(150)
    })
})
