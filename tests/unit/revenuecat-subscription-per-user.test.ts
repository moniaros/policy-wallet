import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `Subscription.revenueCatIdentifier` is @unique. The webhook used to upsert on
 * the PRODUCT id — identical for every buyer of a plan — so the second
 * purchaser of `pw_pro_monthly` overwrote the first one's row (spec-v2 audit
 * 2026-09-23, Phase 0.1). The row must be keyed on the SUBSCRIBER.
 */
const { subscriptionUpsert } = vi.hoisted(() => ({ subscriptionUpsert: vi.fn() }))

vi.mock('@/lib/db', () => ({
    db: { subscription: { upsert: subscriptionUpsert, updateMany: vi.fn() } },
}))
vi.mock('@/lib/env', () => ({ env: { REVENUECAT_WEBHOOK_AUTH_VALUE: 'secret' } }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/services/billing/webhook-idempotency', () => ({
    processWebhookEventOnce: vi.fn(async (_meta: unknown, work: () => Promise<unknown>) => {
        await work()
        return 'processed'
    }),
}))

import { POST } from '@/app/api/v1/billing/revenuecat-webhook/route'

function purchase(appUserId: string) {
    return new Request('http://localhost/api/v1/billing/revenuecat-webhook', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify({
            event: {
                id: `evt-${appUserId}`,
                app_user_id: appUserId,
                type: 'INITIAL_PURCHASE',
                product_id: 'pw_pro_monthly',
                expiration_at_ms: Date.now() + 30 * 86_400_000,
            },
        }),
    })
}

beforeEach(() => subscriptionUpsert.mockReset())

describe('RevenueCat webhook keys subscriptions per subscriber', () => {
    it('two users buying the same product get two rows, keyed on their own id', async () => {
        await POST(purchase('user-a') as never, { params: Promise.resolve({}) } as never)
        await POST(purchase('user-b') as never, { params: Promise.resolve({}) } as never)

        expect(subscriptionUpsert).toHaveBeenCalledTimes(2)
        const keys = subscriptionUpsert.mock.calls.map((call) => call[0].where.revenueCatIdentifier)
        expect(keys).toEqual(['user-a', 'user-b'])
        for (const [args] of subscriptionUpsert.mock.calls) {
            expect(args.create.revenueCatIdentifier).toBe(args.create.userId)
            expect(args.where.revenueCatIdentifier).not.toBe('pw_pro_monthly')
            expect(args.create.planId).toBe('ph-pro')
        }
    })
})
