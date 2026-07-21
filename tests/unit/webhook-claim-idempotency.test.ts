/**
 * Atomic webhook-event claiming — the fix for the check-then-mark race where
 * concurrent redeliveries of the same Stripe/RevenueCat event both passed
 * `hasProcessedWebhookEvent` and double-processed (double credits, double
 * subscription writes).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const eventCreate = vi.fn()
const eventDeleteMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        processedWebhookEvent: {
            create: (...a: unknown[]) => eventCreate(...a),
            deleteMany: (...a: unknown[]) => eventDeleteMany(...a),
        },
    },
}))

import { claimWebhookEvent, releaseWebhookEventClaim } from '@/lib/services/billing/webhook-idempotency'

beforeEach(() => {
    eventCreate.mockReset()
    eventDeleteMany.mockReset()
})

describe('claimWebhookEvent', () => {
    it('claims a fresh event with a processing marker', async () => {
        eventCreate.mockResolvedValue({})

        const claimed = await claimWebhookEvent({
            provider: 'stripe',
            eventId: 'evt_1',
            sourceRoute: '/api/v1/billing/webhook',
        })

        expect(claimed).toBe(true)
        expect(eventCreate).toHaveBeenCalledWith({
            data: {
                provider: 'stripe',
                eventId: 'evt_1',
                sourceRoute: '/api/v1/billing/webhook',
                status: 'processing',
            },
        })
    })

    it('returns false when another delivery already claimed (P2002)', async () => {
        eventCreate.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('unique violation', {
                code: 'P2002',
                clientVersion: 'test',
            })
        )

        const claimed = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_dup' })

        expect(claimed).toBe(false)
    })

    it('rethrows non-unique-constraint errors (DB down must 5xx, not skip)', async () => {
        eventCreate.mockRejectedValue(new Error('connection refused'))

        await expect(claimWebhookEvent({ provider: 'stripe', eventId: 'evt_x' })).rejects.toThrow(
            'connection refused'
        )
    })
})

describe('releaseWebhookEventClaim', () => {
    it('deletes only unfinished claims so finalized events stay recorded', async () => {
        eventDeleteMany.mockResolvedValue({ count: 1 })

        await releaseWebhookEventClaim('revenuecat', 'evt_9')

        expect(eventDeleteMany).toHaveBeenCalledWith({
            where: { provider: 'revenuecat', eventId: 'evt_9', status: 'processing' },
        })
    })
})
