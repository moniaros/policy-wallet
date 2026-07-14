import { describe, expect, it } from 'vitest'
import {
    calculatePremiumFootprint,
    calculatePremiumFootprintDetailed,
    isPremiumBearing,
    selectPremiumBearingPolicies,
    type PremiumPolicyLike,
} from '@/lib/wallet/premium-footprint'

const NOW = new Date('2026-07-14T12:00:00Z')

/**
 * Every stored policy carries status 'active' on purpose: nothing in the app
 * ever writes 'expired' onto a policy, so the stored status tells us nothing.
 * These tests exist to prove the total ignores it and reads the real end date.
 */
function policy(overrides: Partial<PremiumPolicyLike> = {}): PremiumPolicyLike {
    return {
        id: 'p1',
        policyNumber: 'PN-1',
        insurerName: 'Interamerican',
        status: 'active',
        endDate: new Date('2027-01-01T00:00:00Z'),
        premiumAmount: 100,
        ...overrides,
    }
}

function withExpiration(expirationDate: string) {
    return { policy: { expirationDate } }
}

describe('calculatePremiumFootprint', () => {
    it('excludes a policy whose extracted expiration has passed even when the endDate column still holds a future placeholder', () => {
        // The exact production bug: the upload-day placeholder (+365d) makes an
        // expired policy look active forever, so its premium keeps being billed
        // into the "annual premium" widget.
        const policies = [
            policy({ id: 'live', policyNumber: 'PN-LIVE', premiumAmount: 400 }),
            policy({
                id: 'expired',
                policyNumber: 'PN-DEAD',
                premiumAmount: 900,
                endDate: new Date('2027-06-01T00:00:00Z'), // placeholder, still in the future
                acordData: withExpiration('2025-03-10'), // the truth: already expired
            }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(400)
    })

    it('excludes cancelled policies', () => {
        const policies = [
            policy({ id: 'live', policyNumber: 'PN-LIVE', premiumAmount: 400 }),
            policy({ id: 'gone', policyNumber: 'PN-GONE', premiumAmount: 250, status: 'cancelled' }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(400)
    })

    it('excludes policies still being analyzed', () => {
        const policies = [
            policy({ id: 'live', policyNumber: 'PN-LIVE', premiumAmount: 400 }),
            policy({ id: 'pending', policyNumber: 'PN-NEW', premiumAmount: 700, status: 'analyzing' }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(400)
    })

    it('excludes policies with an unreadable end date and reports them instead of dropping them silently', () => {
        const policies = [
            policy({ id: 'live', policyNumber: 'PN-LIVE', premiumAmount: 400 }),
            policy({
                id: 'mystery',
                policyNumber: 'PN-???',
                premiumAmount: 550,
                acordData: withExpiration('δεν αναγράφεται'),
            }),
        ]

        const footprint = calculatePremiumFootprintDetailed(policies, NOW)

        expect(footprint.total).toBe(400)
        expect(footprint.countedPolicies).toBe(1)
        expect(footprint.unknownDurationCount).toBe(1)
    })

    it('counts a policy that is in force but missing its insurer name (action_needed)', () => {
        const policies = [
            policy({ id: 'incomplete', policyNumber: 'PN-1', insurerName: null, premiumAmount: 320 }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(320)
    })

    it('counts a policy expiring within 30 days', () => {
        const policies = [
            policy({ id: 'soon', premiumAmount: 180, acordData: withExpiration('2026-07-28') }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(180)
    })

    it('counts a renewed policy whose renewal history supersedes an expired original term', () => {
        const policies = [
            policy({
                id: 'renewed',
                premiumAmount: 610,
                acordData: {
                    policy: { expirationDate: '2025-09-01' },
                    renewalHistory: [{ endDate: '2027-09-01' }],
                },
            }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(610)
    })

    it('counts a re-uploaded policy number once, keeping the most recent term', () => {
        const policies = [
            policy({ id: 'old-upload', policyNumber: 'PN-SAME', premiumAmount: 300 }),
            policy({
                id: 'new-upload',
                policyNumber: 'PN-SAME',
                premiumAmount: 350,
                acordData: withExpiration('2028-01-01'),
            }),
        ]

        const footprint = calculatePremiumFootprintDetailed(policies, NOW)

        expect(footprint.total).toBe(350)
        expect(footprint.countedPolicies).toBe(1)
    })

    it('treats a missing premium as zero rather than NaN', () => {
        const policies = [
            policy({ id: 'no-premium', policyNumber: 'PN-A', premiumAmount: null }),
            policy({ id: 'priced', policyNumber: 'PN-B', premiumAmount: 240 }),
        ]

        expect(calculatePremiumFootprint(policies, NOW)).toBe(240)
    })

    it('returns zero for an empty wallet', () => {
        expect(calculatePremiumFootprint([], NOW)).toBe(0)
    })
})

describe('selectPremiumBearingPolicies', () => {
    it('returns the same list the total is summed from, so per-branch chips cannot exceed the total', () => {
        // The /home card renders a total next to per-branch chips. Both read this
        // list — if the chips were built from an un-deduped set they would add up
        // to more than the total sitting right beside them.
        const policies = [
            policy({ id: 'a', policyNumber: 'PN-DUP', premiumAmount: 300 }),
            policy({ id: 'b', policyNumber: 'PN-DUP', premiumAmount: 300 }),
            policy({ id: 'c', policyNumber: 'PN-DEAD', premiumAmount: 999, acordData: withExpiration('2024-01-01') }),
            policy({ id: 'd', policyNumber: 'PN-OK', premiumAmount: 120 }),
        ]

        const { policies: inForce } = selectPremiumBearingPolicies(policies, NOW)
        const chipSum = inForce.reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0)

        expect(inForce.map((p) => p.id).sort()).toEqual(['a', 'd'])
        expect(chipSum).toBe(calculatePremiumFootprint(policies, NOW))
        expect(chipSum).toBe(420)
    })
})

describe('isPremiumBearing', () => {
    it('ignores the stored status and follows the real end date', () => {
        // Stored 'active', actually expired — the shape that inflates every total.
        expect(
            isPremiumBearing(policy({ status: 'active', acordData: withExpiration('2024-01-01') }), NOW)
        ).toBe(false)

        expect(isPremiumBearing(policy({ status: 'active' }), NOW)).toBe(true)
    })
})
