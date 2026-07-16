import { describe, it, expect } from 'vitest'
import {
    selectNewNotifications,
    notificationTone,
    TOASTABLE_EVENT_TYPES,
    type RecentNotification,
} from '@/lib/notifications/watcher'

const n = (id: string, createdAt: string, eventType = 'policy_analyzed'): RecentNotification => ({
    id, eventType, title: 't', message: 'm', relatedObjectType: 'policy', relatedObjectId: 'p', read: false, createdAt,
})

describe('selectNewNotifications', () => {
    it('seeds the marker on the first run and toasts nothing', () => {
        const items = [n('a', '2026-07-16T10:00:00.000Z'), n('b', '2026-07-16T09:00:00.000Z')]
        const { fresh, newest } = selectNewNotifications(items, null)
        expect(fresh).toEqual([])
        expect(newest).toBe('2026-07-16T10:00:00.000Z')
    })

    it('returns only strictly-newer items, oldest-first', () => {
        const items = [
            n('c', '2026-07-16T12:00:00.000Z'),
            n('b', '2026-07-16T11:00:00.000Z'),
            n('a', '2026-07-16T10:00:00.000Z'),
        ]
        const { fresh, newest } = selectNewNotifications(items, '2026-07-16T10:00:00.000Z')
        expect(fresh.map((f) => f.id)).toEqual(['b', 'c'])
        expect(newest).toBe('2026-07-16T12:00:00.000Z')
    })

    it('finds nothing new when the marker equals the newest item', () => {
        const items = [n('a', '2026-07-16T10:00:00.000Z')]
        expect(selectNewNotifications(items, '2026-07-16T10:00:00.000Z').fresh).toEqual([])
    })

    it('keeps the existing marker when there are no items', () => {
        const { fresh, newest } = selectNewNotifications([], '2026-07-16T10:00:00.000Z')
        expect(fresh).toEqual([])
        expect(newest).toBe('2026-07-16T10:00:00.000Z')
    })
})

describe('notificationTone', () => {
    it('maps a failed analysis to error and successes to success', () => {
        expect(notificationTone('policy_analysis_failed')).toBe('error')
        expect(notificationTone('policy_analyzed')).toBe('success')
        expect(notificationTone('policy_merged')).toBe('success')
    })
})

describe('TOASTABLE_EVENT_TYPES', () => {
    it('includes the analysis outcomes and excludes unrelated events', () => {
        expect(TOASTABLE_EVENT_TYPES.has('policy_analyzed')).toBe(true)
        expect(TOASTABLE_EVENT_TYPES.has('policy_analysis_failed')).toBe(true)
        expect(TOASTABLE_EVENT_TYPES.has('policy_merged')).toBe(true)
        expect(TOASTABLE_EVENT_TYPES.has('login_success')).toBe(false)
    })
})
