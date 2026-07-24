import { describe, it, expect } from 'vitest'
import { resolvePolicyLifecycle, isPolicyCoverageActive } from '@/lib/policy-status'

const policy = (endISO: string) => ({
    status: 'active',
    policyNumber: 'P-1',
    insurerName: 'ΕΘΝΙΚΗ',
    endDate: new Date(endISO),
    acordData: {},
})

/**
 * lib/i18n/format.ts already settled that "dates are meaningful in Athens time",
 * but applied it only to DISPLAY. The lifecycle verdict was raw UTC millisecond
 * arithmetic, so between 21:00 UTC and midnight — the Athens offset — a policy
 * whose cover ended yesterday on the customer's own calendar still resolved to
 * daysUntilExpiry = 0, i.e. "expiring soon" rather than "expired".
 *
 * That window recurs every night. isPolicyCoverageActive shares the resolution,
 * so during it gap detection and the protection score also counted a lapsed
 * policy as protection. Expiry is a calendar fact, not an instant.
 */
describe('expiry is judged on the Athens calendar', () => {
    const coverEnds = '2026-07-24T00:00:00Z'

    it('is still in force during the final day, Athens time', () => {
        // 15:00 in Athens on the 24th — the last day of cover.
        const l = resolvePolicyLifecycle(policy(coverEnds), new Date('2026-07-24T12:00:00Z'))
        expect(l.daysUntilExpiry).toBe(0)
        expect(l.status).toBe('expiring_soon')
    })

    it('is expired once Athens has ticked over, even though UTC has not', () => {
        // 00:30 on the 25th in Athens; still the 24th in UTC. This is the case
        // the old millisecond arithmetic got wrong.
        const l = resolvePolicyLifecycle(policy(coverEnds), new Date('2026-07-24T21:30:00Z'))
        expect(l.daysUntilExpiry).toBe(-1)
        expect(l.status).toBe('expired')
    })

    it('stops counting a lapsed policy as coverage in that same window', () => {
        // This is what made the bug matter beyond a badge: gap detection and the
        // protection score both ask this question.
        expect(isPolicyCoverageActive(policy(coverEnds) as any, new Date('2026-07-24T12:00:00Z'))).toBe(true)
        expect(isPolicyCoverageActive(policy(coverEnds) as any, new Date('2026-07-24T21:30:00Z'))).toBe(false)
    })

    it('holds across the winter offset too', () => {
        // Athens is UTC+2 in January; 22:30 UTC is 00:30 next day locally.
        const l = resolvePolicyLifecycle(policy('2026-01-15T00:00:00Z'), new Date('2026-01-15T22:30:00Z'))
        expect(l.status).toBe('expired')
    })

    it('counts a whole-day gap as a whole day, not a fraction', () => {
        const l = resolvePolicyLifecycle(policy('2026-08-24T00:00:00Z'), new Date('2026-07-24T12:00:00Z'))
        expect(l.daysUntilExpiry).toBe(31)
    })
})

/**
 * Four call sites had each rolled their own UTC millisecond version of "days
 * until this date", which is exactly how they drifted apart — fixing the
 * lifecycle alone would have left the agent's policy page showing "Expired"
 * beside a days-left of 0, the two answers coming from two different clocks.
 */
describe('one clock answers "how many days until this date"', () => {
    it('is the only implementation left', async () => {
        const { readFileSync, globSync } = await import('node:fs')
        const offenders: string[] = []
        for (const file of globSync('lib/**/*.ts')) {
            if (file.endsWith('policy-status.ts')) continue          // the implementation
            const src = readFileSync(file, 'utf-8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
            // day arithmetic applied to an END DATE is a calendar question
            if (/(endDate|expiry|expiresAt)[^\n]{0,60}(1000 \* 60 \* 60 \* 24|86_?400_?000)/i.test(src)) {
                offenders.push(file)
            }
        }
        expect(offenders, `hand-rolled expiry day maths:\n${offenders.join('\n')}`).toEqual([])
    })

    it('leaves elapsed-duration maths alone', async () => {
        const { readFileSync } = await import('node:fs')
        // "how long since they last replied" is a duration, not a calendar
        // deadline, and legitimately stays in absolute milliseconds.
        const fmt = readFileSync('lib/agent/format.ts', 'utf-8')
        expect(fmt).toMatch(/diffDays = Math\.floor\(diffMs \/ 86_400_000\)/)
    })
})
