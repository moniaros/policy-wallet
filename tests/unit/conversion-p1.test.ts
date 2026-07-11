import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn() },
        plan: { findUnique: vi.fn() },
        subscription: { findUnique: vi.fn(), create: vi.fn() },
        activityLog: { create: vi.fn() },
    },
}))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: vi.fn() } } } }))

import { sanitizeReturnPath, handleSubscriptionSuccess } from '@/lib/billing'
import { isSubscriptionLive } from '@/lib/subscription-entitlements'
import { db } from '@/lib/db'

const DAY = 24 * 60 * 60 * 1000

describe('sanitizeReturnPath (open-redirect guard)', () => {
    it('accepts same-origin app paths', () => {
        expect(sanitizeReturnPath('/wallet/abc?tab=analysis')).toBe('/wallet/abc?tab=analysis')
        expect(sanitizeReturnPath('/coverage-insights')).toBe('/coverage-insights')
    })

    it('rejects absolute URLs, protocol-relative URLs, and empty values', () => {
        expect(sanitizeReturnPath('https://evil.example.com/x')).toBeNull()
        expect(sanitizeReturnPath('//evil.example.com/x')).toBeNull()
        expect(sanitizeReturnPath('wallet')).toBeNull()
        expect(sanitizeReturnPath('')).toBeNull()
        expect(sanitizeReturnPath(null)).toBeNull()
        expect(sanitizeReturnPath(undefined)).toBeNull()
    })
})

describe('isSubscriptionLive (grandfathering rules)', () => {
    it('no subscription → not live', () => {
        expect(isSubscriptionLive(null)).toBe(false)
        expect(isSubscriptionLive(undefined)).toBe(false)
    })

    it('non-active status → not live regardless of ids', () => {
        expect(isSubscriptionLive({
            status: 'expired', stripeSubscriptionId: 'sub_1',
            currentPeriodEnd: new Date(Date.now() + 10 * DAY), provider: 'stripe',
        })).toBe(false)
    })

    it('Stripe-backed active subscription → live (webhook lifecycle owns it)', () => {
        expect(isSubscriptionLive({
            status: 'active', stripeSubscriptionId: 'sub_1',
            currentPeriodEnd: new Date(Date.now() - 5 * DAY), provider: 'stripe',
        })).toBe(true)
    })

    it('RevenueCat subscription → live while active', () => {
        expect(isSubscriptionLive({
            status: 'active', stripeSubscriptionId: null,
            currentPeriodEnd: new Date(Date.now() - 5 * DAY), provider: 'revenue_cat',
        })).toBe(true)
    })

    it('legacy free-granted row (no Stripe id) → grandfathered ONLY until period end', () => {
        const base = { status: 'active', stripeSubscriptionId: null, provider: 'stripe' }
        expect(isSubscriptionLive({ ...base, currentPeriodEnd: new Date(Date.now() + 5 * DAY) })).toBe(true)
        expect(isSubscriptionLive({ ...base, currentPeriodEnd: new Date(Date.now() - 1 * DAY) })).toBe(false)
    })
})

describe('handleSubscriptionSuccess idempotency', () => {
    beforeEach(() => vi.clearAllMocks())

    it('skips creation when the stripeSubscriptionId already has a row (webhook/success-page race)', async () => {
        ;(db.plan.findUnique as any).mockResolvedValue({ id: 'ph-pro', name: 'pro' })
        ;(db.subscription.findUnique as any).mockResolvedValue({ id: 'existing' })

        await handleSubscriptionSuccess('user-1', 'ph-pro', 'sub_123')

        expect(db.subscription.create).not.toHaveBeenCalled()
    })

    it('creates the subscription with the Stripe id when none exists', async () => {
        ;(db.plan.findUnique as any).mockResolvedValue({ id: 'ph-pro', name: 'pro' })
        ;(db.subscription.findUnique as any).mockResolvedValue(null)

        await handleSubscriptionSuccess('user-1', 'ph-pro', 'sub_123')

        expect(db.subscription.create).toHaveBeenCalledTimes(1)
        const args = (db.subscription.create as any).mock.calls[0][0]
        expect(args.data.stripeSubscriptionId).toBe('sub_123')
        expect(args.data.status).toBe('active')
    })
})
