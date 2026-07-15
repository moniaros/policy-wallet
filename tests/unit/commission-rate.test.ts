import { describe, expect, it } from 'vitest'

import { commissionOn, commissionRate, DEFAULT_COMMISSION_RATE_PERCENT } from '@/lib/agent/commission'

describe('commissionRate', () => {
    it('uses the agent-configured percentage for a line of business', () => {
        expect(commissionRate({ motor: 20, health: 10 }, 'motor')).toBeCloseTo(0.2)
        expect(commissionRate({ motor: 20, health: 10 }, 'HEALTH')).toBeCloseTo(0.1)
    })

    it('falls back to the default when a line has no configured rate', () => {
        expect(commissionRate({ motor: 20 }, 'home')).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
        expect(commissionRate(null, 'motor')).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
        expect(commissionRate(undefined, null)).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
    })

    it('is case-insensitive and treats missing LoB as "other"', () => {
        expect(commissionRate({ other: 5 }, undefined)).toBeCloseTo(0.05)
    })
})

describe('commissionOn', () => {
    it('multiplies premium by the configured rate', () => {
        expect(commissionOn({ motor: 20 }, 'motor', 500)).toBeCloseTo(100)
    })

    it('applies the default rate when unconfigured, and 0 for empty premium', () => {
        expect(commissionOn({}, 'life', 1000)).toBeCloseTo(1000 * DEFAULT_COMMISSION_RATE_PERCENT / 100)
        expect(commissionOn({ motor: 20 }, 'motor', null)).toBe(0)
        expect(commissionOn({ motor: 20 }, 'motor', undefined)).toBe(0)
    })
})
