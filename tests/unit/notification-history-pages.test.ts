import { expect, it } from 'vitest'
import { mergeHistoryPages } from '@/lib/notifications/history-pages'

it('keeps the in-app read state when older delivery records arrive', () => {
    const app = { event_id: 'app', event_key: 'renewal:30', has_in_app: true, unread: true }
    const email = { event_id: 'email', event_key: 'renewal:30', has_in_app: false, unread: false }
    expect(mergeHistoryPages([app], [email])).toEqual([app])
    expect(mergeHistoryPages([email], [app])).toEqual([app])
})
it('preserves distinct renewal milestones and unkeyed events', () => {
    const rows = [{ event_id: 'a', event_key: 'renewal:30' }, { event_id: 'b', event_key: 'renewal:7' }, { event_id: 'c' }, { event_id: 'd' }]
    expect(mergeHistoryPages(rows.slice(0, 2), rows.slice(2))).toEqual(rows)
})
