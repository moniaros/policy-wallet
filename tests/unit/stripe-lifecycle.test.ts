/**
 * Stripe lifecycle sync (lib/services/billing/stripe-lifecycle.ts) — the v1
 * webhook previously handled ONLY checkout.session.completed: no dunning,
 * and Stripe-side cancellations (incl. the billing portal) never synced.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const subFindUnique = vi.fn()
const subUpdate = vi.fn()
const subUpdateMany = vi.fn()
const stripeSubRetrieve = vi.fn()
const persistStripeCustomerId = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        subscription: {
            findUnique: (...a: unknown[]) => subFindUnique(...a),
            update: (...a: unknown[]) => subUpdate(...a),
            updateMany: (...a: unknown[]) => subUpdateMany(...a),
        },
    },
}))
vi.mock('@/lib/stripe', () => ({
    stripe: { subscriptions: { retrieve: (...a: unknown[]) => stripeSubRetrieve(...a) } },
}))
vi.mock('@/lib/billing', () => ({
    extractStripeCustomerId: (customer: unknown) =>
        typeof customer === 'string'
            ? customer || null
            : ((customer as { id?: string } | null)?.id ?? null),
    extractSubscriptionPeriod: (sub: unknown) => {
        const s = sub as { current_period_start?: number; current_period_end?: number }
        return {
            start: typeof s.current_period_start === 'number' ? new Date(s.current_period_start * 1000) : null,
            end: typeof s.current_period_end === 'number' ? new Date(s.current_period_end * 1000) : null,
        }
    },
    persistStripeCustomerId: (...a: unknown[]) => persistStripeCustomerId(...a),
}))

import {
    handleStripeLifecycleEvent,
    isStripeLifecycleEvent,
} from '@/lib/services/billing/stripe-lifecycle'

const nowSec = Math.floor(Date.now() / 1000)

function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}): Stripe.Event {
    return {
        type,
        data: {
            object: {
                id: 'sub_1',
                customer: 'cus_1',
                status: 'active',
                cancel_at_period_end: false,
                current_period_start: nowSec,
                current_period_end: nowSec + 30 * 24 * 60 * 60,
                ...overrides,
            },
        },
    } as unknown as Stripe.Event
}

function invoiceEvent(type: string, subscription: unknown): Stripe.Event {
    return { type, data: { object: { id: 'in_1', subscription } } } as unknown as Stripe.Event
}

beforeEach(() => {
    vi.clearAllMocks()
    subFindUnique.mockResolvedValue({ id: 'local-1', userId: 'user-1' })
    subUpdate.mockResolvedValue({})
    subUpdateMany.mockResolvedValue({ count: 1 })
})

describe('isStripeLifecycleEvent', () => {
    it('claims exactly the four lifecycle events', () => {
        expect(isStripeLifecycleEvent('customer.subscription.updated')).toBe(true)
        expect(isStripeLifecycleEvent('customer.subscription.deleted')).toBe(true)
        expect(isStripeLifecycleEvent('invoice.paid')).toBe(true)
        expect(isStripeLifecycleEvent('invoice.payment_failed')).toBe(true)
        expect(isStripeLifecycleEvent('checkout.session.completed')).toBe(false)
    })
})

describe('customer.subscription.updated', () => {
    it('syncs status, period, autoRenew and the customer id', async () => {
        const handled = await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.updated', {
                status: 'trialing',
                cancel_at_period_end: true,
            })
        )

        expect(handled).toBe(true)
        const data = subUpdate.mock.calls[0][0].data
        expect(data.status).toBe('active') // trialing keeps access
        expect(data.autoRenew).toBe(false) // cancel scheduled at period end
        expect(data.currentPeriodEnd).toBeInstanceOf(Date)
        expect(persistStripeCustomerId).toHaveBeenCalledWith('user-1', 'cus_1')
    })

    it('maps canceled → expired and past_due → past_due', async () => {
        await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.updated', { status: 'canceled' })
        )
        expect(subUpdate.mock.calls[0][0].data.status).toBe('expired')

        await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.updated', { status: 'past_due' })
        )
        expect(subUpdate.mock.calls[1][0].data.status).toBe('past_due')
    })

    it('ignores subscriptions we do not know', async () => {
        subFindUnique.mockResolvedValue(null)
        const handled = await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.updated')
        )
        expect(handled).toBe(false)
        expect(subUpdate).not.toHaveBeenCalled()
    })
})

describe('customer.subscription.deleted', () => {
    it('expires the local row and stops renewals', async () => {
        const handled = await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.deleted')
        )
        expect(handled).toBe(true)
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { stripeSubscriptionId: 'sub_1' },
            data: { status: 'expired', autoRenew: false },
        })
    })
})

describe('invoice.paid', () => {
    it('pulls the authoritative period from Stripe and syncs it', async () => {
        stripeSubRetrieve.mockResolvedValue({
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: nowSec,
            current_period_end: nowSec + 30 * 24 * 60 * 60,
        })

        const handled = await handleStripeLifecycleEvent(invoiceEvent('invoice.paid', 'sub_1'))

        expect(handled).toBe(true)
        expect(stripeSubRetrieve).toHaveBeenCalledWith('sub_1')
        expect(subUpdate.mock.calls[0][0].data.status).toBe('active')
    })

    it('restores access even when the retrieve fails (degraded path)', async () => {
        stripeSubRetrieve.mockRejectedValue(new Error('network'))

        const handled = await handleStripeLifecycleEvent(invoiceEvent('invoice.paid', 'sub_1'))

        expect(handled).toBe(true)
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { stripeSubscriptionId: 'sub_1' },
            data: { status: 'active' },
        })
    })

    it('is a no-op for one-off (non-subscription) invoices', async () => {
        const handled = await handleStripeLifecycleEvent(invoiceEvent('invoice.paid', null))
        expect(handled).toBe(false)
    })
})

describe('invoice.payment_failed', () => {
    it('pauses access via past_due (dunning) until invoice.paid restores it', async () => {
        const handled = await handleStripeLifecycleEvent(
            invoiceEvent('invoice.payment_failed', 'sub_1')
        )
        expect(handled).toBe(true)
        expect(subUpdateMany).toHaveBeenCalledWith({
            where: { stripeSubscriptionId: 'sub_1' },
            data: { status: 'past_due' },
        })
    })
})

describe('unhandled events', () => {
    it('returns false without touching the DB', async () => {
        const handled = await handleStripeLifecycleEvent(
            subscriptionEvent('customer.subscription.created')
        )
        expect(handled).toBe(false)
        expect(subUpdate).not.toHaveBeenCalled()
        expect(subUpdateMany).not.toHaveBeenCalled()
    })
})
