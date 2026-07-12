import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: { notificationEvent: { create: vi.fn() } },
}))

import { recordConversionEvent } from '@/lib/journey/conversion-events'
import { db } from '@/lib/db'

describe('recordConversionEvent (server-side conv_* mirror)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(db.notificationEvent.create as any).mockResolvedValue({})
    })

    it('stores a prefixed event with the trigger source and plan', async () => {
        await recordConversionEvent('user-1', 'checkout_started', {
            plan: 'ph-plus',
            billingPeriod: 'annual',
            source: 'carried_plan',
        })

        const row = (db.notificationEvent.create as any).mock.calls[0][0].data
        expect(row.eventType).toBe('conv_checkout_started')
        expect(row.userId).toBe('user-1')
        expect(row.relatedObjectType).toBe('carried_plan')
        expect(row.relatedObjectId).toBe('ph-plus')
        expect(JSON.parse(row.message)).toEqual({
            plan: 'ph-plus',
            billingPeriod: 'annual',
            source: 'carried_plan',
        })
    })

    it('uses the limit kind when no source is set', async () => {
        await recordConversionEvent('user-1', 'limit_hit', { kind: 'policy' })

        const row = (db.notificationEvent.create as any).mock.calls[0][0].data
        expect(row.eventType).toBe('conv_limit_hit')
        expect(row.relatedObjectType).toBe('policy')
    })

    it('never throws when the write fails — analytics must not break money paths', async () => {
        ;(db.notificationEvent.create as any).mockRejectedValue(new Error('db down'))

        await expect(
            recordConversionEvent('user-1', 'checkout_completed', { plan: 'ph-pro' })
        ).resolves.toBeUndefined()
    })
})
