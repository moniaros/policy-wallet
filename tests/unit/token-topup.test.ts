import { describe, it, expect, vi, beforeEach } from 'vitest'

const txMock = {
    tokenPurchase: { updateMany: vi.fn() },
    tokenBalance: { upsert: vi.fn() },
}

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn() },
        tokenPurchase: { create: vi.fn() },
        $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn(txMock)),
    },
}))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: vi.fn() } } } }))

import { createTokenCheckoutSession, fulfillTokenPurchaseSession } from '@/lib/billing'
import { TOKEN_PACKAGES } from '@/lib/billing/token-packages'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

describe('createTokenCheckoutSession (one-off Checkout, mode: payment)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(db.user.findUnique as any).mockResolvedValue({ email: 'user@example.com' })
        ;(stripe.checkout.sessions.create as any).mockResolvedValue({
            id: 'cs_test_tokens',
            url: 'https://checkout.stripe.com/pay/cs_test_tokens',
        })
    })

    it('creates a payment-mode session priced from the shared pack table', async () => {
        const result = await createTokenCheckoutSession('user-1', 'small', '/account')

        const args = (stripe.checkout.sessions.create as any).mock.calls[0][0]
        expect(args.mode).toBe('payment')
        expect(args.line_items[0].price_data.unit_amount).toBe(
            Math.round(TOKEN_PACKAGES.small.priceEur * 100)
        )
        expect(args.line_items[0].price_data.recurring).toBeUndefined()
        expect(args.metadata.tokensPurchased).toBe(String(TOKEN_PACKAGES.small.tokens))
        expect(args.metadata.userId).toBe('user-1')
        expect(args.success_url).toContain('/upgrade/success?session_id=')
        expect(args.cancel_url).toContain('/account')
        expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_tokens')
    })

    it('records a pending TokenPurchase keyed by the session id', async () => {
        await createTokenCheckoutSession('user-1', 'medium')

        const row = (db.tokenPurchase.create as any).mock.calls[0][0].data
        expect(row.stripeSessionId).toBe('cs_test_tokens')
        expect(row.status).toBe('pending')
        expect(row.tokensPurchased).toBe(BigInt(TOKEN_PACKAGES.medium.tokens))
    })

    it('rejects unknown packages', async () => {
        await expect(createTokenCheckoutSession('user-1', 'mega' as any)).rejects.toThrow()
    })
})

describe('fulfillTokenPurchaseSession (idempotent crediting)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('credits the balance when a pending row is flipped', async () => {
        txMock.tokenPurchase.updateMany.mockResolvedValue({ count: 1 })

        const credited = await fulfillTokenPurchaseSession('cs_1', 'user-1', 500_000)

        expect(credited).toBe(true)
        expect(txMock.tokenPurchase.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', stripeSessionId: 'cs_1', status: 'pending' },
            data: { status: 'completed' },
        })
        const upsert = txMock.tokenBalance.upsert.mock.calls[0][0]
        expect(upsert.update.purchasedTokens).toEqual({ increment: BigInt(500_000) })
    })

    it('is a no-op when the purchase was already completed (webhook + success page race)', async () => {
        txMock.tokenPurchase.updateMany.mockResolvedValue({ count: 0 })

        const credited = await fulfillTokenPurchaseSession('cs_1', 'user-1', 500_000)

        expect(credited).toBe(false)
        expect(txMock.tokenBalance.upsert).not.toHaveBeenCalled()
    })

    it('rejects missing identifiers without touching the DB', async () => {
        expect(await fulfillTokenPurchaseSession('', 'user-1', 500_000)).toBe(false)
        expect(await fulfillTokenPurchaseSession('cs_1', '', 500_000)).toBe(false)
        expect(await fulfillTokenPurchaseSession('cs_1', 'user-1', 0)).toBe(false)
        expect((db.$transaction as any)).not.toHaveBeenCalled()
    })
})
