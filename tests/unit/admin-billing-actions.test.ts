/**
 * Admin billing operations (refund / cancel / apply-credit) must: validate
 * input, call the right Stripe method with correctly-scaled amounts, reflect
 * cancellations locally, map Stripe failures to a friendly message (never leak a
 * raw dump), and audit every mutation. The Stripe secret never leaves the server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN = { id: 'admin-1', email: 'admin@policywallet.gr', roles: 'admin' }
const mockVerifyAdminRole = vi.fn(async (..._a: any[]): Promise<any> => ADMIN)
const mockLogAdminAction = vi.fn(async (..._a: any[]) => {})
vi.mock('@/lib/admin/admin-guard', () => ({
    verifyAdminRole: (...a: unknown[]) => (mockVerifyAdminRole as any)(...a),
    logAdminAction: (...a: unknown[]) => (mockLogAdminAction as any)(...a),
}))

const mockRefundCreate = vi.fn(async (..._a: any[]): Promise<any> => ({ id: 're_1' }))
const mockSubCancel = vi.fn(async (..._a: any[]): Promise<any> => ({ id: 'sub_stripe_1', status: 'canceled' }))
const mockSubUpdate = vi.fn(async (..._a: any[]): Promise<any> => ({ id: 'sub_stripe_1', cancel_at_period_end: true }))
const mockBalanceTxn = vi.fn(async (..._a: any[]): Promise<any> => ({ id: 'cbtxn_1' }))
vi.mock('@/lib/stripe', () => ({
    stripe: {
        refunds: { create: (...a: unknown[]) => (mockRefundCreate as any)(...a) },
        subscriptions: {
            cancel: (...a: unknown[]) => (mockSubCancel as any)(...a),
            update: (...a: unknown[]) => (mockSubUpdate as any)(...a),
        },
        customers: { createBalanceTransaction: (...a: unknown[]) => (mockBalanceTxn as any)(...a) },
    },
}))

const mockSubFindUnique = vi.fn(async (..._a: any[]): Promise<any> => ({
    id: 'sub-db-1', userId: 'user-1', stripeSubscriptionId: 'sub_stripe_1', provider: 'stripe',
}))
const mockSubUpdateDb = vi.fn(async (..._a: any[]) => ({}))
const mockUserFindUnique = vi.fn(async (..._a: any[]): Promise<any> => ({ stripeCustomerId: 'cus_1', email: 'u@example.gr' }))
vi.mock('@/lib/db', () => ({
    db: {
        subscription: {
            findUnique: (...a: unknown[]) => (mockSubFindUnique as any)(...a),
            update: (...a: unknown[]) => (mockSubUpdateDb as any)(...a),
        },
        user: { findUnique: (...a: unknown[]) => (mockUserFindUnique as any)(...a) },
    },
}))

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

import { issueRefund, cancelSubscriptionAsAdmin, applyCredit } from '@/app/(protected)/admin/billing-actions'

beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRole.mockResolvedValue(ADMIN)
    mockRefundCreate.mockResolvedValue({ id: 're_1' })
    mockSubCancel.mockResolvedValue({ id: 'sub_stripe_1' })
    mockSubUpdate.mockResolvedValue({ id: 'sub_stripe_1' })
    mockBalanceTxn.mockResolvedValue({ id: 'cbtxn_1' })
    mockSubFindUnique.mockResolvedValue({ id: 'sub-db-1', userId: 'user-1', stripeSubscriptionId: 'sub_stripe_1', provider: 'stripe' })
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_1', email: 'u@example.gr' })
})

describe('issueRefund', () => {
    it('does a partial refund with euro→cents conversion and audits it', async () => {
        const res = await issueRefund({ paymentIntentId: 'pi_1', amountEur: 12.5, reason: 'goodwill' })
        expect(res).toEqual({ ok: true, refundId: 're_1' })
        expect(mockRefundCreate).toHaveBeenCalledWith(
            expect.objectContaining({ payment_intent: 'pi_1', amount: 1250, reason: 'requested_by_customer' })
        )
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('BILLING_REFUND')
    })

    it('omits amount for a full refund', async () => {
        await issueRefund({ paymentIntentId: 'pi_1' })
        const arg = mockRefundCreate.mock.calls[0]?.[0]
        expect(arg.payment_intent).toBe('pi_1')
        expect('amount' in arg).toBe(false)
    })

    it('maps a Stripe error to a friendly message (no raw dump)', async () => {
        mockRefundCreate.mockRejectedValue({ code: 'charge_already_refunded' })
        const res = await issueRefund({ paymentIntentId: 'pi_1' })
        expect(res.ok).toBe(false)
        expect(res).toMatchObject({ error: expect.stringMatching(/already been fully refunded/i), code: 'charge_already_refunded' })
    })

    it('rejects invalid input before calling Stripe', async () => {
        const res = await issueRefund({ paymentIntentId: '' })
        expect(res).toEqual({ ok: false, error: 'Invalid refund details.' })
        expect(mockRefundCreate).not.toHaveBeenCalled()
    })
})

describe('cancelSubscriptionAsAdmin', () => {
    it('cancels at period end via subscriptions.update and mirrors locally', async () => {
        const res = await cancelSubscriptionAsAdmin({ subscriptionId: 'sub-db-1', immediately: false })
        expect(res).toEqual({ ok: true, mode: 'period_end' })
        expect(mockSubUpdate).toHaveBeenCalledWith('sub_stripe_1', { cancel_at_period_end: true })
        expect(mockSubCancel).not.toHaveBeenCalled()
        expect(mockSubUpdateDb).toHaveBeenCalledWith(expect.objectContaining({ data: { autoRenew: false } }))
    })

    it('cancels immediately via subscriptions.cancel and marks the row cancelled', async () => {
        const res = await cancelSubscriptionAsAdmin({ subscriptionId: 'sub-db-1', immediately: true })
        expect(res).toEqual({ ok: true, mode: 'immediate' })
        expect(mockSubCancel).toHaveBeenCalledWith('sub_stripe_1')
        expect(mockSubUpdateDb).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'cancelled', autoRenew: false } }))
    })

    it('refuses when there is no Stripe subscription id', async () => {
        mockSubFindUnique.mockResolvedValue({ id: 'sub-db-1', userId: 'user-1', stripeSubscriptionId: null, provider: 'stripe' })
        const res = await cancelSubscriptionAsAdmin({ subscriptionId: 'sub-db-1', immediately: false })
        expect(res.ok).toBe(false)
        expect(mockSubCancel).not.toHaveBeenCalled()
        expect(mockSubUpdate).not.toHaveBeenCalled()
    })

    it('returns not-found for an unknown subscription', async () => {
        mockSubFindUnique.mockResolvedValue(null)
        const res = await cancelSubscriptionAsAdmin({ subscriptionId: 'ghost', immediately: false })
        expect(res).toEqual({ ok: false, error: 'Subscription not found.' })
    })
})

describe('applyCredit', () => {
    it('credits the customer balance with a negative amount and audits it', async () => {
        const res = await applyCredit({ userId: 'user-1', amountEur: 5, memo: 'service issue' })
        expect(res).toEqual({ ok: true, balanceTransactionId: 'cbtxn_1' })
        expect(mockBalanceTxn).toHaveBeenCalledWith(
            'cus_1',
            expect.objectContaining({ amount: -500, currency: 'eur', description: 'service issue' })
        )
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('BILLING_APPLY_CREDIT')
    })

    it('refuses when the user has no Stripe customer', async () => {
        mockUserFindUnique.mockResolvedValue({ stripeCustomerId: null, email: 'u@example.gr' })
        const res = await applyCredit({ userId: 'user-1', amountEur: 5, memo: 'x' })
        expect(res.ok).toBe(false)
        expect(mockBalanceTxn).not.toHaveBeenCalled()
    })

    it('rejects a non-positive amount', async () => {
        const res = await applyCredit({ userId: 'user-1', amountEur: 0, memo: 'x' })
        expect(res).toEqual({ ok: false, error: 'Invalid credit details.' })
    })
})
