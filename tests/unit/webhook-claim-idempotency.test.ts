/**
 * Atomic webhook-event claiming — the fix for the check-then-mark race where
 * concurrent redeliveries of the same Stripe/RevenueCat event both passed the
 * old existence check and double-processed (double credits, double
 * subscription writes). A claim stuck in 'processing' past its TTL (holder
 * killed mid-handler) is taken over instead of shadowing the event forever.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const eventCreate = vi.fn()
const eventUpdateMany = vi.fn()
const eventDeleteMany = vi.fn()
const eventUpsert = vi.fn()

vi.mock('@/lib/db', async () => {
    const { Prisma } = await import('@prisma/client')
    return {
        db: {
            processedWebhookEvent: {
                create: (...a: unknown[]) => eventCreate(...a),
                updateMany: (...a: unknown[]) => eventUpdateMany(...a),
                deleteMany: (...a: unknown[]) => eventDeleteMany(...a),
                upsert: (...a: unknown[]) => eventUpsert(...a),
            },
        },
        isUniqueConstraintViolation: (error: unknown) =>
            (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
            (error instanceof Error && (error as Error & { code?: string }).code === 'P2002'),
    }
})

import {
    claimWebhookEvent,
    processWebhookEventOnce,
    releaseWebhookEventClaim,
} from '@/lib/services/billing/webhook-idempotency'

const p2002 = () =>
    new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: 'test',
    })

beforeEach(() => {
    vi.clearAllMocks()
    eventUpdateMany.mockResolvedValue({ count: 0 })
    eventDeleteMany.mockResolvedValue({ count: 1 })
    eventUpsert.mockResolvedValue({})
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
        expect(eventUpdateMany).not.toHaveBeenCalled()
    })

    it('returns false when another delivery holds a LIVE claim', async () => {
        eventCreate.mockRejectedValue(p2002())
        eventUpdateMany.mockResolvedValue({ count: 0 })

        const claimed = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_dup' })

        expect(claimed).toBe(false)
        // Takeover attempted only against expired 'processing' claims.
        const where = eventUpdateMany.mock.calls[0]![0].where
        expect(where.status).toBe('processing')
        expect(where.processedAt.lt).toBeInstanceOf(Date)
    })

    it('takes over an EXPIRED processing claim (holder died mid-handler)', async () => {
        eventCreate.mockRejectedValue(p2002())
        eventUpdateMany.mockResolvedValue({ count: 1 })

        const claimed = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_stuck' })

        expect(claimed).toBe(true)
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
        await releaseWebhookEventClaim('revenuecat', 'evt_9')

        expect(eventDeleteMany).toHaveBeenCalledWith({
            where: { provider: 'revenuecat', eventId: 'evt_9', status: 'processing' },
        })
    })
})

describe('processWebhookEventOnce', () => {
    it('runs the handler and finalizes the claim with its result', async () => {
        eventCreate.mockResolvedValue({})
        const handler = vi.fn(async () => ({ eventType: 'checkout.session.completed' }))

        const outcome = await processWebhookEventOnce(
            { provider: 'stripe', eventId: 'evt_ok', sourceRoute: '/api/v1/billing/webhook' },
            handler
        )

        expect(outcome).toBe('processed')
        expect(handler).toHaveBeenCalledTimes(1)
        expect(eventUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({
                    status: 'processed',
                    result: { eventType: 'checkout.session.completed' },
                }),
            })
        )
        expect(eventDeleteMany).not.toHaveBeenCalled()
    })

    it('skips the handler entirely on a duplicate delivery', async () => {
        eventCreate.mockRejectedValue(p2002())
        const handler = vi.fn()

        const outcome = await processWebhookEventOnce(
            { provider: 'stripe', eventId: 'evt_dup', sourceRoute: '/x' },
            handler
        )

        expect(outcome).toBe('duplicate')
        expect(handler).not.toHaveBeenCalled()
        expect(eventUpsert).not.toHaveBeenCalled()
    })

    it('releases the claim and rethrows when the handler fails, so the retry reprocesses', async () => {
        eventCreate.mockResolvedValue({})
        const handler = vi.fn(async () => {
            throw new Error('stripe retrieve timed out')
        })

        await expect(
            processWebhookEventOnce({ provider: 'stripe', eventId: 'evt_boom', sourceRoute: '/x' }, handler)
        ).rejects.toThrow('stripe retrieve timed out')

        expect(eventDeleteMany).toHaveBeenCalledWith({
            where: { provider: 'stripe', eventId: 'evt_boom', status: 'processing' },
        })
        expect(eventUpsert).not.toHaveBeenCalled()
    })
})
