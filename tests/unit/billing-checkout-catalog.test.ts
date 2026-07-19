import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * createCheckoutSession must charge the DB plan row's admin-managed values:
 * annual_price / trial_days win over the code fallbacks, and isActive=false
 * blocks new checkouts entirely.
 */

const planFindUnique = vi.fn()
const userFindUnique = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        plan: { findUnique: (...args: unknown[]) => planFindUnique(...args) },
        user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    },
}))

const sessionCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
    stripe: { checkout: { sessions: { create: (...args: unknown[]) => sessionCreate(...args) } } },
}))

import { createCheckoutSession } from '@/lib/billing'
import { DEFAULT_ANNUAL_PRICE_BY_PLAN } from '@/lib/pricing/plan-defaults'

function plan(overrides: Record<string, unknown> = {}) {
    return {
        id: 'ph-pro',
        planType: 'policyholder',
        name: 'Pro',
        displayName: 'PolicyWallet Plus',
        price: 7.99,
        annualPrice: 79,
        trialDays: 14,
        isActive: true,
        ...overrides,
    }
}

beforeEach(() => {
    planFindUnique.mockReset()
    userFindUnique.mockReset()
    sessionCreate.mockReset()
    userFindUnique.mockResolvedValue({ email: 'user@example.com' })
    sessionCreate.mockResolvedValue({ id: 'cs_test', url: 'https://stripe.test/session' })
})

function createdSessionArg() {
    return sessionCreate.mock.calls[0][0] as {
        line_items: Array<{ price_data: { unit_amount: number; recurring: { interval: string } } }>
        subscription_data?: { trial_period_days: number }
    }
}

describe('createCheckoutSession × admin-managed plan row', () => {
    it('monthly charges the DB monthly price', async () => {
        planFindUnique.mockResolvedValue(plan())
        await createCheckoutSession('user-1', 'ph-pro', 'monthly')
        expect(createdSessionArg().line_items[0].price_data.unit_amount).toBe(799)
    })

    it('annual charges the row annual_price when set (admin edit wins)', async () => {
        planFindUnique.mockResolvedValue(plan({ annualPrice: 89 }))
        await createCheckoutSession('user-1', 'ph-pro', 'annual')
        const arg = createdSessionArg()
        expect(arg.line_items[0].price_data.unit_amount).toBe(8900)
        expect(arg.line_items[0].price_data.recurring.interval).toBe('year')
    })

    it('annual falls back to the code map when the column is null', async () => {
        planFindUnique.mockResolvedValue(plan({ annualPrice: null }))
        await createCheckoutSession('user-1', 'ph-pro', 'annual')
        expect(createdSessionArg().line_items[0].price_data.unit_amount).toBe(
            DEFAULT_ANNUAL_PRICE_BY_PLAN['ph-pro'] * 100
        )
    })

    it('annual falls back to 12× monthly for a plan in neither source', async () => {
        planFindUnique.mockResolvedValue(
            plan({ id: 'ph-custom', annualPrice: null, price: 5 })
        )
        await createCheckoutSession('user-1', 'ph-custom', 'annual')
        expect(createdSessionArg().line_items[0].price_data.unit_amount).toBe(6000)
    })

    it('trial comes from the row; an admin-set 0 genuinely removes it', async () => {
        planFindUnique.mockResolvedValue(plan({ trialDays: 7 }))
        await createCheckoutSession('user-1', 'ph-pro', 'monthly')
        expect(createdSessionArg().subscription_data).toEqual({ trial_period_days: 7 })

        sessionCreate.mockClear()
        planFindUnique.mockResolvedValue(plan({ trialDays: 0 }))
        await createCheckoutSession('user-1', 'ph-pro', 'monthly')
        expect(createdSessionArg().subscription_data).toBeUndefined()
    })

    it('legacy rows without the column fall back to the trial map', async () => {
        planFindUnique.mockResolvedValue(plan({ trialDays: undefined }))
        await createCheckoutSession('user-1', 'ph-pro', 'monthly')
        expect(createdSessionArg().subscription_data).toEqual({ trial_period_days: 14 })
    })

    it('isActive=false blocks new checkouts', async () => {
        planFindUnique.mockResolvedValue(plan({ isActive: false }))
        await expect(createCheckoutSession('user-1', 'ph-pro', 'monthly')).rejects.toThrow(
            /not purchasable/
        )
        expect(sessionCreate).not.toHaveBeenCalled()
    })

    it('legacy rows without isActive still check out (mock/pre-migration safety)', async () => {
        planFindUnique.mockResolvedValue(plan({ isActive: undefined }))
        await createCheckoutSession('user-1', 'ph-pro', 'monthly')
        expect(sessionCreate).toHaveBeenCalled()
    })
})
