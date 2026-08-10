import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        notificationEvent: { create: vi.fn(), findFirst: vi.fn() },
        notificationPreference: { findMany: vi.fn() },
        user: { findUnique: vi.fn() },
    },
}))

import { recordConversionEvent } from '@/lib/journey/conversion-events'
import { db } from '@/lib/db'

/**
 * The conversion mirror shares the notification table but is NOT a
 * notification. It used to be written as one — `channel: 'in_app'`, a machine
 * code (`conv_checkout_completed`) as the title, a JSON blob as the body — so
 * the notification centre rendered it to the customer and the unread badge
 * counted it. On production, 12 of one account's 141 phantom unread items were
 * these rows.
 */
describe('recordConversionEvent (server-side conv_* mirror)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(db.notificationEvent.create as any).mockResolvedValue({})
        ;(db.notificationEvent.findFirst as any).mockResolvedValue(null)
        ;(db.notificationPreference.findMany as any).mockResolvedValue([])
        ;(db.user.findUnique as any).mockResolvedValue({
            email: 'user@example.com',
            preferredLanguage: 'en',
        })
    })

    const rowFor = () => (db.notificationEvent.create as any).mock.calls[0][0].data

    it('stores a prefixed event with the trigger details', async () => {
        await recordConversionEvent('user-1', 'checkout_started', {
            plan: 'ph-plus',
            billingPeriod: 'annual',
            source: 'carried_plan',
        })

        const row = rowFor()
        expect(row.eventType).toBe('conv_checkout_started')
        expect(row.userId).toBe('user-1')
        expect(JSON.parse(row.message)).toEqual({
            plan: 'ph-plus',
            billingPeriod: 'annual',
            source: 'carried_plan',
        })
    })

    it('goes out on the analytics channel, never in_app', async () => {
        await recordConversionEvent('user-1', 'checkout_completed', { plan: 'ph-pro' })

        const row = rowFor()
        expect(row.channel).toBe('analytics')
        // The one property that matters: no notification surface can pick it up.
        expect(row.channel).not.toBe('in_app')
    })

    it('never leaves a machine code as the user-visible title', async () => {
        await recordConversionEvent('user-1', 'limit_hit', { kind: 'policy' })

        const row = rowFor()
        expect(row.eventType).toBe('conv_limit_hit')
        expect(row.title).not.toMatch(/^conv_/)
        expect(row.title).toBe('A plan limit was reached')
    })

    it('does not put free text in relatedObjectType', async () => {
        // `relatedObjectType` is a closed vocabulary the UI switches on to build
        // a deep link. It used to receive `details.source` / `details.kind`, so
        // rows carried types like "carried_plan" and "upgrade_modal" that no
        // link builder could resolve.
        await recordConversionEvent('user-1', 'checkout_started', {
            source: 'upgrade_modal',
            kind: 'gap_analysis',
        })

        const row = rowFor()
        expect(row.relatedObjectType).toBeNull()
    })

    it('never throws when the write fails — analytics must not break money paths', async () => {
        ;(db.notificationEvent.create as any).mockRejectedValue(new Error('db down'))

        await expect(
            recordConversionEvent('user-1', 'checkout_completed', { plan: 'ph-pro' })
        ).resolves.toBeUndefined()
    })
})
