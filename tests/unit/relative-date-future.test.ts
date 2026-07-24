import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelativeDate, formatDateShort } from '@/lib/agent/format'

const NOW = new Date('2026-07-24T12:00:00Z')
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString()
const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

const freeze = () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
}
afterEach(() => vi.useRealTimers())

/**
 * `formatRelativeDate` computed `now - date` and bucketed on `diffMins < 1`, so
 * every FUTURE date fell into the first bucket and rendered "Just now" /
 * «Μόλις τώρα».
 *
 * Two callers pass future dates: the agent action queue's due column
 * (ActionQueueCard) and the client card's next action (ClientCard). A task due
 * next Tuesday therefore read as due this instant — on a work queue, the most
 * urgent label the UI has, applied to the least urgent items. The agent has no
 * way to tell which of their tasks is actually pressing.
 */
describe('future dates are not reported as "just now"', () => {
    it('a task due in three days says so', () => {
        freeze()
        expect(formatRelativeDate(at(3 * DAY), 'en')).toBe('in 3 days')
        expect(formatRelativeDate(at(3 * DAY), 'el')).toMatch(/σε 3 ημέρες/)
    })

    it('tomorrow and yesterday read as words, not counts', () => {
        freeze()
        expect(formatRelativeDate(at(DAY), 'en')).toBe('tomorrow')
        expect(formatRelativeDate(at(-DAY), 'en')).toBe('yesterday')
        expect(formatRelativeDate(at(DAY), 'el')).toBe('αύριο')
        expect(formatRelativeDate(at(-DAY), 'el')).toBe('χθες')
    })

    it('a few hours out is hours out, not "just now"', () => {
        freeze()
        expect(formatRelativeDate(at(5 * HOUR), 'en')).toBe('in 5 hours')
        expect(formatRelativeDate(at(-5 * HOUR), 'en')).toBe('5 hours ago')
    })

    it('minutes either side keep their direction', () => {
        freeze()
        expect(formatRelativeDate(at(20 * MIN), 'en')).toBe('in 20 minutes')
        expect(formatRelativeDate(at(-20 * MIN), 'en')).toBe('20 minutes ago')
    })

    it('still says "just now" for the present instant', () => {
        freeze()
        expect(formatRelativeDate(at(0), 'en')).toBe('Just now')
        expect(formatRelativeDate(at(0), 'el')).toBe('Μόλις τώρα')
    })

    it('does not say "1 minutes" or «πριν 1 λεπτά»', () => {
        freeze()
        expect(formatRelativeDate(at(-MIN), 'en')).toBe('1 minute ago')
        expect(formatRelativeDate(at(-MIN), 'el')).not.toMatch(/1 λεπτά/)
    })

    it('falls back to a calendar date beyond a week, both directions', () => {
        freeze()
        expect(formatRelativeDate(at(30 * DAY), 'en')).toMatch(/2026/)
        expect(formatRelativeDate(at(-30 * DAY), 'en')).toMatch(/2026/)
    })

    it('does not crash on an unparseable date', () => {
        freeze()
        expect(formatRelativeDate('not-a-date', 'en')).toBe('—')
    })
})

/**
 * `formatDateGreek` hardcoded `el-GR` whatever language the agent had chosen, so
 * an English-speaking agent read a client's policy expiry and a document-request
 * due date in Greek month names. It also left the timezone to the runtime — UTC
 * on the server, Athens in the browser — the mismatch class lib/i18n/format.ts
 * exists to end.
 */
describe('short dates follow the reader and the Athens clock', () => {
    it('renders English months for an English reader', () => {
        expect(formatDateShort('2026-06-15T00:00:00Z', 'en')).toMatch(/Jun/)
        expect(formatDateShort('2026-06-15T00:00:00Z', 'el')).toMatch(/Ιουν/)
    })

    it('dates an Athens-midnight instant as that Athens day, not the UTC one', () => {
        // 2026-06-14T21:00Z is 2026-06-15 00:00 in Athens (UTC+3).
        expect(formatDateShort('2026-06-14T21:00:00Z', 'en')).toMatch(/15 Jun/)
    })
})
