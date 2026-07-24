import { describe, it, expect } from 'vitest'
import { getDsrDeadlineInfo, addOneMonth } from '@/lib/compliance/dsr-deadline'
import { readFileSync } from 'node:fs'

const at = (iso: string) => new Date(`${iso}T00:00:00Z`)

/**
 * GDPR Art. 12(3) gives one CALENDAR month from receipt, and the published
 * privacy policy promises exactly that ("within one month at the latest, as
 * provided by Article 12 GDPR").
 *
 * The operator queue measured 30 days instead. In February that runs the
 * dangerous way: a request received on 1 February is legally due 1 March, but
 * 30 days lands on 3 March — so the queue showed a request that had already
 * breached a statutory deadline as still having two days left. In a 31-day month
 * the same proxy is a day early, which is merely conservative; nobody would have
 * noticed the safe direction, which is why the unsafe one survived.
 */
describe('DSR deadline follows the calendar, not a 30-day approximation', () => {
    it('does not overshoot the legal deadline in February', () => {
        expect(addOneMonth(at('2026-02-01')).toISOString().slice(0, 10)).toBe('2026-03-01')
        expect(addOneMonth(at('2026-02-15')).toISOString().slice(0, 10)).toBe('2026-03-15')
    })

    it('clamps to the last day when the next month is shorter', () => {
        // 31 Jan + one month is the end of February, not 2–3 March.
        expect(addOneMonth(at('2026-01-31')).toISOString().slice(0, 10)).toBe('2026-02-28')
        expect(addOneMonth(at('2024-01-31')).toISOString().slice(0, 10)).toBe('2024-02-29')  // leap
    })

    it('handles ordinary months exactly', () => {
        expect(addOneMonth(at('2026-04-15')).toISOString().slice(0, 10)).toBe('2026-05-15')
        expect(addOneMonth(at('2026-12-31')).toISOString().slice(0, 10)).toBe('2027-01-31')
    })

    it('flags a February request as overdue on the day it actually breaches', () => {
        // Requested 1 Feb, legally due 1 Mar. On 2 Mar it IS overdue — the old
        // 30-day maths still showed a day remaining.
        const info = getDsrDeadlineInfo(at('2026-02-01'), at('2026-03-02'))
        expect(info.overdue).toBe(true)
    })

    it('still marks the final week as urgent', () => {
        const info = getDsrDeadlineInfo(at('2026-04-15'), at('2026-05-10'))
        expect(info.urgent).toBe(true)
        expect(info.overdue).toBe(false)
    })

    it('measures the same window the privacy policy publishes', () => {
        const legal = readFileSync('lib/legal/legal-content.ts', 'utf-8')
        expect(legal).toMatch(/within one month at the latest, as provided by Article 12 GDPR/)
    })
})
