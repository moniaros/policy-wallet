import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: { notificationEvent: { count: vi.fn(), groupBy: vi.fn() } } }))
vi.mock('@/lib/notifications/collaboration-destination', () => ({ collaborationDestination: vi.fn() }))
import { db } from '@/lib/db'
import { collaborationDestination } from '@/lib/notifications/collaboration-destination'
import { countCurrentUnreadNotifications } from '@/lib/notifications/current-unread'
import { formatExtractedAmount } from '@/lib/i18n/amount-format'

beforeEach(() => vi.resetAllMocks())
it('counts unresolved unread subjects once, alongside ordinary notifications', async () => {
    vi.mocked(db.notificationEvent.count).mockResolvedValue(4)
    vi.mocked(db.notificationEvent.groupBy).mockResolvedValue([
        { eventType: 'collaboration_action_overdue', relatedObjectId: 'open' },
        { eventType: 'collaboration_action_overdue', relatedObjectId: 'completed' },
    ] as any)
    vi.mocked(collaborationDestination).mockResolvedValueOnce({ active: true, href: '/thread' }).mockResolvedValueOnce({ active: false, href: '/thread' })
    expect(await countCurrentUnreadNotifications('holder', 'policyholder')).toBe(5)
    expect(db.notificationEvent.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['eventType', 'relatedObjectId'], where: expect.objectContaining({ userId: 'holder', channel: 'in_app', status: 'sent', readAt: null }) }))
})
it.each(['ΝΑΙ', 'true', 'ΟΧΙ', 'No'])('does not present %s as a coverage amount', value => {
    expect(formatExtractedAmount(value, 'el')).toBe('Δεν έχει καταγραφεί ποσό')
    expect(formatExtractedAmount(value, 'en')).toBe('No amount recorded')
})
