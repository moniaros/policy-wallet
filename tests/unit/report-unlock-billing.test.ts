import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateManyPurchase = vi.fn()
const updateManyPolicy = vi.fn()
const createPurchase = vi.fn()
const createSession = vi.fn()
const recordConversionEvent = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn().mockResolvedValue({ email: 'user@example.com' }) },
        reportUnlockPurchase: { create: (...args: any[]) => createPurchase(...args) },
        $transaction: async (fn: any) =>
            fn({
                reportUnlockPurchase: { updateMany: (...args: any[]) => updateManyPurchase(...args) },
                policy: { updateMany: (...args: any[]) => updateManyPolicy(...args) },
            }),
    },
}))
vi.mock('@/lib/stripe', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: (...args: any[]) => createSession(...args),
            },
        },
    },
}))
vi.mock('@/lib/journey/conversion-events', () => ({
    recordConversionEvent: (...args: any[]) => recordConversionEvent(...args),
}))

import {
    REPORT_UNLOCK_PRICE_EUR,
    createReportUnlockCheckoutSession,
    fulfillReportUnlockSession,
} from '@/lib/billing'

beforeEach(() => {
    updateManyPurchase.mockReset()
    updateManyPolicy.mockReset()
    createPurchase.mockReset()
    createSession.mockReset()
    recordConversionEvent.mockReset()
})

describe('createReportUnlockCheckoutSession', () => {
    it('creates a €3 one-off payment session and a pending purchase row', async () => {
        createSession.mockResolvedValue({ id: 'cs_123', url: 'https://stripe.test/cs_123' })

        const result = await createReportUnlockCheckoutSession('user-1', 'policy-1', '/wallet/policy-1#analysis')

        expect(result).toEqual({ id: 'cs_123', url: 'https://stripe.test/cs_123', amountEur: 3 })
        const payload = createSession.mock.calls[0][0]
        expect(payload.mode).toBe('payment')
        expect(payload.line_items[0].price_data.unit_amount).toBe(REPORT_UNLOCK_PRICE_EUR * 100)
        expect(payload.metadata).toEqual({ userId: 'user-1', policyId: 'policy-1', type: 'report_unlock' })

        expect(createPurchase).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-1',
                policyId: 'policy-1',
                amountEur: 3,
                stripeSessionId: 'cs_123',
                status: 'pending',
            }),
        })
    })

    it('rejects absolute return URLs (open-redirect guard)', async () => {
        createSession.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/x' })
        await createReportUnlockCheckoutSession('user-1', 'policy-1', 'https://evil.example')
        const payload = createSession.mock.calls[0][0]
        expect(payload.success_url).toContain(encodeURIComponent('/wallet/policy-1'))
        expect(payload.success_url).not.toContain('evil.example')
    })
})

describe('fulfillReportUnlockSession', () => {
    it('flips the pending row, stamps only the owner policy, and records conversion', async () => {
        updateManyPurchase.mockResolvedValue({ count: 1 })
        updateManyPolicy.mockResolvedValue({ count: 1 })

        const result = await fulfillReportUnlockSession('cs_123', 'user-1', 'policy-1')

        expect(result).toBe(true)
        expect(updateManyPurchase).toHaveBeenCalledWith({
            where: { userId: 'user-1', policyId: 'policy-1', stripeSessionId: 'cs_123', status: 'pending' },
            data: { status: 'completed' },
        })
        expect(updateManyPolicy).toHaveBeenCalledWith({
            where: { id: 'policy-1', ownerUserId: 'user-1', reportUnlockedAt: null },
            data: { reportUnlockedAt: expect.any(Date) },
        })
        expect(recordConversionEvent).toHaveBeenCalledWith('user-1', 'checkout_completed', {
            source: 'report_unlock',
            policyId: 'policy-1',
        })
    })

    it('is idempotent — an already-completed session is a no-op', async () => {
        updateManyPurchase.mockResolvedValue({ count: 0 })

        const result = await fulfillReportUnlockSession('cs_123', 'user-1', 'policy-1')

        expect(result).toBe(false)
        expect(updateManyPolicy).not.toHaveBeenCalled()
        expect(recordConversionEvent).not.toHaveBeenCalled()
    })

    it('refuses on missing identifiers', async () => {
        expect(await fulfillReportUnlockSession('', 'u', 'p')).toBe(false)
        expect(await fulfillReportUnlockSession('s', '', 'p')).toBe(false)
        expect(await fulfillReportUnlockSession('s', 'u', '')).toBe(false)
        expect(updateManyPurchase).not.toHaveBeenCalled()
    })
})
