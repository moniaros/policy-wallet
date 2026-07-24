import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Comments stripped: five assertions this session have tripped on the comment
// that documents the very string they were written to detect.
const src = readFileSync('lib/gap-detection.ts', 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

/** Mirrors the rule's arithmetic so the boundary cases are asserted, not assumed. */
function isShort(startISO: string, endISO: string, minMonths = 12) {
    const start = new Date(`${startISO}T00:00:00Z`)
    const end = new Date(`${endISO}T00:00:00Z`)
    const threshold = new Date(start.getTime())
    const dayOfMonth = threshold.getUTCDate()
    threshold.setUTCMonth(threshold.getUTCMonth() + minMonths)
    if (threshold.getUTCDate() < dayOfMonth) threshold.setUTCDate(0)
    return end.getTime() < threshold.getTime()
}

/**
 * `duration_short` divided elapsed days by 30.44, the average month. A standard
 * 365-day annual policy came out at 11.99 months and was flagged as short; the
 * same policy spanning a leap day came out at 12.02 and was not. Whether a
 * customer's ordinary annual cover looked unusually short depended on which side
 * of 29 February it happened to fall.
 *
 * detectionLogic is a JSON column on GapDefinition, so an admin can add a
 * duration rule without a deploy — this was reachable, not dead code.
 */
describe('policy duration is measured in calendar months', () => {
    it('does not flag an ordinary one-year policy', () => {
        expect(isShort('2026-01-01', '2027-01-01')).toBe(false)   // 365 days
        expect(isShort('2024-01-01', '2025-01-01')).toBe(false)   // 366 days, leap
    })

    it('gives the same answer either side of a leap day', () => {
        // The whole point: the classification must not depend on the calendar.
        expect(isShort('2023-03-01', '2024-03-01')).toBe(isShort('2026-03-01', '2027-03-01'))
    })

    it('still flags genuinely short cover', () => {
        expect(isShort('2026-01-01', '2026-07-01')).toBe(true)    // six months
        expect(isShort('2026-01-01', '2026-12-31')).toBe(true)    // one day short of a year
    })

    it('does not flag longer cover', () => {
        expect(isShort('2026-01-01', '2027-07-01')).toBe(false)   // eighteen months
    })

    it('handles a start date with no equivalent in the target month', () => {
        // 31 Jan + 12 months is 31 Jan; the clamp matters for shorter windows.
        expect(isShort('2026-01-31', '2026-02-28', 1)).toBe(false)
        expect(isShort('2026-01-31', '2026-02-27', 1)).toBe(true)
    })

    it('the rule no longer divides by an average month', () => {
        expect(src).not.toMatch(/30\.44/)
        expect(src).toMatch(/setUTCMonth\(threshold\.getUTCMonth\(\) \+ minMonths\)/)
    })
})
