/**
 * Billing integrity — the fixes for the July 2026 PXA audit §0 defects:
 *  #1 stripeCustomerId never persisted on the live checkout path
 *  #2 in-app cancel never called Stripe
 *  #4 currentPeriodEnd hardcoded to +30 days (wrong for annual/trials)
 *  §8 addendum: legacy "Premium" plan rows resolved to FREE entitlements
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const userUpdateMany = vi.fn()
const planFindUnique = vi.fn()
const subFindUnique = vi.fn()
const subFindFirst = vi.fn()
const subFindMany = vi.fn()
const subCreate = vi.fn()
const subUpdate = vi.fn()
const subUpdateMany = vi.fn()
const activityCreate = vi.fn()
const conversionEvent = vi.fn()
const stripeSubRetrieve = vi.fn()
const stripeSubCancel = vi.fn()
const stripeSubUpdate = vi.fn()
const getAuthenticatedUserOrNull = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        user: { updateMany: (...a: unknown[]) => userUpdateMany(...a) },
        plan: { findUnique: (...a: unknown[]) => planFindUnique(...a) },
        subscription: {
            findUnique: (...a: unknown[]) => subFindUnique(...a),
            findFirst: (...a: unknown[]) => subFindFirst(...a),
            findMany: (...a: unknown[]) => subFindMany(...a),
            create: (...a: unknown[]) => subCreate(...a),
            update: (...a: unknown[]) => subUpdate(...a),
            updateMany: (...a: unknown[]) => subUpdateMany(...a),
        },
        activityLog: { create: (...a: unknown[]) => activityCreate(...a) },
        $transaction: async (ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : undefined),
    },
    isUniqueConstraintViolation: (error: unknown) =>
        error instanceof Error && (error as Error & { code?: string }).code === 'P2002',
}))
vi.mock('@/lib/stripe', () => ({
    stripe: {
        subscriptions: {
            retrieve: (...a: unknown[]) => stripeSubRetrieve(...a),
            cancel: (...a: unknown[]) => stripeSubCancel(...a),
            update: (...a: unknown[]) => stripeSubUpdate(...a),
        },
    },
}))
vi.mock('@/lib/journey/conversion-events', () => ({
    recordConversionEvent: (...a: unknown[]) => conversionEvent(...a),
}))
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...a: unknown[]) => getAuthenticatedUserOrNull(...a),
    getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/lib/services/revenuecat.service', () => ({
    syncRevenueCatSubscription: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
// account/actions.ts imports the zod-validated env, which demands real
// secrets at import time — irrelevant to the units under test here.
vi.mock('@/lib/env', () => ({ env: { NEXTAUTH_URL: 'http://localhost:3000' } }))

import {
    extractStripeCustomerId,
    persistStripeCustomerId,
    handleSubscriptionSuccess,
    fulfillCheckoutSession,
} from '@/lib/billing'
import { cancelSubscription } from '@/app/(protected)/me/actions'
import { resolveUserEntitlements } from '@/lib/subscription-entitlements'

const DAY_MS = 24 * 60 * 60 * 1000
const nowSec = Math.floor(Date.now() / 1000)

beforeEach(() => {
    vi.clearAllMocks()
    subFindMany.mockResolvedValue([])
    subCreate.mockResolvedValue({})
    subUpdateMany.mockResolvedValue({ count: 1 })
    userUpdateMany.mockResolvedValue({ count: 1 })
    activityCreate.mockResolvedValue({})
})

describe('extractStripeCustomerId', () => {
    it('handles string ids, expanded objects, and empties', () => {
        expect(extractStripeCustomerId('cus_123')).toBe('cus_123')
        expect(extractStripeCustomerId({ id: 'cus_456' })).toBe('cus_456')
        expect(extractStripeCustomerId(null)).toBeNull()
        expect(extractStripeCustomerId('')).toBeNull()
        expect(extractStripeCustomerId({ id: 42 })).toBeNull()
    })
})

describe('persistStripeCustomerId', () => {
    it('writes the id, scoped to rows where it differs', async () => {
        await persistStripeCustomerId('user-1', 'cus_123')
        expect(userUpdateMany).toHaveBeenCalledWith({
            where: { id: 'user-1', NOT: { stripeCustomerId: 'cus_123' } },
            data: { stripeCustomerId: 'cus_123' },
        })
    })

    it('is a no-op without an id and never throws on DB failure', async () => {
        await persistStripeCustomerId('user-1', null)
        expect(userUpdateMany).not.toHaveBeenCalled()

        userUpdateMany.mockRejectedValueOnce(new Error('unique collision'))
        await expect(persistStripeCustomerId('user-1', 'cus_dup')).resolves.toBeUndefined()
    })
})

describe('handleSubscriptionSuccess', () => {
    const plan = { id: 'ph-plus', name: 'plus', planType: 'policyholder' }

    it('mirrors the real Stripe period (annual) and persists the customer id', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_annual',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 365 * 24 * 60 * 60,
        })

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_annual')

        const created = subCreate.mock.calls[0][0].data
        const periodDays = (created.currentPeriodEnd.getTime() - created.currentPeriodStart.getTime()) / DAY_MS
        expect(periodDays).toBeGreaterThan(300) // NOT the old hardcoded +30d
        expect(created.autoRenew).toBe(true)
        expect(userUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { stripeCustomerId: 'cus_annual' } })
        )
    })

    it('prefers an explicitly passed customer id over the retrieved one', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_from_sub',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_1', 'cus_from_session')

        expect(userUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { stripeCustomerId: 'cus_from_session' } })
        )
    })

    it('falls back to a 30-day period when Stripe cannot be reached', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockRejectedValue(new Error('network'))

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_unreachable')

        const created = subCreate.mock.calls[0][0].data
        const periodDays = (created.currentPeriodEnd.getTime() - created.currentPeriodStart.getTime()) / DAY_MS
        expect(Math.round(periodDays)).toBe(30)
    })

    it('stays idempotent: an already-recorded subscription creates nothing', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue({ id: 'existing' })

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_dup', 'cus_x')

        expect(subCreate).not.toHaveBeenCalled()
        expect(userUpdateMany).not.toHaveBeenCalled()
    })

    it('grants before revoking: prior subs expire in the same transaction, Stripe cancel comes after', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        subFindMany.mockResolvedValue([{ id: 'prior-1', stripeSubscriptionId: 'sub_old' }])
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })
        stripeSubCancel.mockResolvedValue({})

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_new')

        expect(subCreate).toHaveBeenCalledTimes(1)
        expect(subUpdate).toHaveBeenCalledWith({
            where: { id: 'prior-1' },
            data: { status: 'expired', autoRenew: false },
        })
        // The remote cancel must happen only after the local grant is durable.
        expect(stripeSubCancel).toHaveBeenCalledWith('sub_old')
        expect(stripeSubCancel.mock.invocationCallOrder[0]).toBeGreaterThan(
            subCreate.mock.invocationCallOrder[0]
        )
    })

    it('treats a P2002 on create as a concurrent grant: no double grant, but priors still converge', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        subFindMany.mockResolvedValue([{ id: 'prior-1', stripeSubscriptionId: 'sub_old' }])
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })
        stripeSubCancel.mockResolvedValue({})
        subCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))

        await expect(handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_race')).resolves.toBeUndefined()

        // The concurrent winner may have crashed before its remote cancels —
        // the loser expires and cancels priors so nobody double-bills.
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { id: { in: ['prior-1'] } },
            data: { status: 'expired', autoRenew: false },
        })
        expect(stripeSubCancel).toHaveBeenCalledWith('sub_old')
        expect(activityCreate).not.toHaveBeenCalled()
    })

    it('does NOT grant when the Stripe subscription is already canceled at grant time', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_1',
            status: 'canceled',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_gone')

        expect(subCreate).not.toHaveBeenCalled()
        expect(activityCreate).not.toHaveBeenCalled()
    })

    it('converges prior cleanup on the already-granted short-circuit', async () => {
        planFindUnique.mockResolvedValue(plan)
        subFindUnique.mockResolvedValue({ id: 'existing' })
        subFindMany.mockResolvedValue([{ id: 'prior-1', stripeSubscriptionId: 'sub_old' }])
        stripeSubCancel.mockResolvedValue({})

        await handleSubscriptionSuccess('user-1', 'ph-plus', 'sub_dup', 'cus_x')

        expect(subCreate).not.toHaveBeenCalled()
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { id: { in: ['prior-1'] } },
            data: { status: 'expired', autoRenew: false },
        })
        expect(stripeSubCancel).toHaveBeenCalledWith('sub_old')
    })
})

describe('fulfillCheckoutSession (shared webhook fulfillment)', () => {
    const paidSession = (overrides: Record<string, unknown>) => ({
        id: 'cs_1',
        customer: 'cus_1',
        payment_status: 'paid',
        subscription: 'sub_new',
        metadata: { userId: 'user-1', planId: 'ph-plus' },
        ...overrides,
    })

    it('defers unpaid sessions without granting (async payment confirms later)', async () => {
        await fulfillCheckoutSession(paidSession({ payment_status: 'unpaid' }) as any)

        // Customer id is still persisted, but no plan lookup / no grant.
        expect(userUpdateMany).toHaveBeenCalled()
        expect(planFindUnique).not.toHaveBeenCalled()
        expect(subCreate).not.toHaveBeenCalled()
    })

    it('grants the subscription for a paid session via the canonical path', async () => {
        planFindUnique.mockResolvedValue({ id: 'ph-plus', name: 'plus', planType: 'policyholder' })
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })

        await fulfillCheckoutSession(paidSession({}) as any)

        expect(subCreate).toHaveBeenCalledTimes(1)
        expect(subCreate.mock.calls[0][0].data.stripeSubscriptionId).toBe('sub_new')
    })

    it('falls back to ph-plus for legacy sessions without planId metadata (removed-fallback regression)', async () => {
        planFindUnique.mockResolvedValue({ id: 'ph-plus', name: 'plus', planType: 'policyholder' })
        subFindUnique.mockResolvedValue(null)
        stripeSubRetrieve.mockResolvedValue({
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })

        await fulfillCheckoutSession(paidSession({ metadata: { userId: 'user-1' } }) as any)

        expect(planFindUnique).toHaveBeenCalledWith({ where: { id: 'ph-plus' } })
        expect(subCreate).toHaveBeenCalledTimes(1)
    })
})

describe('cancelSubscription', () => {
    const authedUser = { dbUser: { id: 'user-1' } }

    it('cancels at Stripe (cancel_at_period_end) before flipping autoRenew', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(authedUser)
        subFindMany.mockResolvedValue([{ id: 's1', stripeSubscriptionId: 'sub_live' }])
        stripeSubUpdate.mockResolvedValue({})

        const result = await cancelSubscription()

        expect(stripeSubUpdate).toHaveBeenCalledWith('sub_live', { cancel_at_period_end: true })
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', status: 'active' },
            data: { autoRenew: false },
        })
        expect(result).toEqual({ success: true })
    })

    it('does NOT pretend to cancel when Stripe refuses', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(authedUser)
        subFindMany.mockResolvedValue([{ id: 's1', stripeSubscriptionId: 'sub_live' }])
        stripeSubUpdate.mockRejectedValue(Object.assign(new Error('boom'), { code: 'api_error' }))

        const result = await cancelSubscription()

        expect(result).toHaveProperty('error')
        expect(subUpdateMany).not.toHaveBeenCalled()
    })

    it('treats a Stripe-side missing subscription as already cancelled', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(authedUser)
        subFindMany.mockResolvedValue([{ id: 's1', stripeSubscriptionId: 'sub_gone' }])
        stripeSubUpdate.mockRejectedValue(Object.assign(new Error('gone'), { code: 'resource_missing' }))

        const result = await cancelSubscription()

        expect(result).toEqual({ success: true })
        expect(subUpdateMany).toHaveBeenCalled()
    })

    it('handles grandfathered rows (no Stripe id) locally without calling Stripe', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(authedUser)
        subFindMany.mockResolvedValue([{ id: 's1', stripeSubscriptionId: null }])

        const result = await cancelSubscription()

        expect(stripeSubUpdate).not.toHaveBeenCalled()
        expect(subUpdateMany).toHaveBeenCalled()
        expect(result).toEqual({ success: true })
    })
})

describe('legacy Premium plan normalization (§8 addendum)', () => {
    it('resolves a paying "Premium" subscriber to pro, never free', async () => {
        subFindFirst.mockResolvedValue({
            status: 'active',
            stripeSubscriptionId: 'sub_rc_or_stripe',
            currentPeriodEnd: new Date(Date.now() + 10 * DAY_MS),
            plan: { name: 'Premium', planType: 'policyholder' },
        })

        const entitlements = await resolveUserEntitlements('user-1')

        expect(entitlements.tier).toBe('pro')
        expect(entitlements.isPaid).toBe(true)
    })
})
