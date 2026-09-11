import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { startOfAthensDay } from '@/lib/policy-status'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))

/**
 * Policy end dates are stored at midnight UTC — 03:00 Athens. Any query that
 * bounds them with the current INSTANT therefore excludes a policy on the very
 * day it still covers someone, for the first three hours of that day (two in
 * winter), which is precisely when the nightly crons run.
 *
 * Token and invite expiries are genuinely instants and are deliberately left
 * alone; this is only about coverage dates.
 */
describe('every policy-expiry window opens at the start of the Athens day', () => {
    const CASES: Array<[string, RegExp]> = [
        // The two templates window on the RESOLVED end date through one helper
        // (PW-BRIDGE-01 C-01/C-02); the Athens-day lower bound is the argument.
        ['lib/services/renewal.service.ts', /expiryWindowWhere\(startOfToday, cutoff\)/],
        ['lib/services/weekly-digest.service.ts', /expiryWindowWhere\(startOfAthensDay\(now\), thirtyDaysOut\)/],
        ['lib/services/churn-prevention.service.ts', /expiryWindowWhere\(startOfAthensDay\(now\), thirtyDaysOut\)/],
        ['lib/services/perk-reminder.service.ts', /expiryWindowWhere\(startOfAthensDay\(new Date\(\)\)\)/],
        ['app/(protected)/renewals/actions.ts', /policyEndDate: \{ gte: startOfAthensDay\(now\), lte: weekFromNow \}/],
        ['app/(protected)/renewals/actions.ts', /policyEndDate: \{ gte: startOfAthensDay\(now\), lte: monthFromNow \}/],
    ]

    it.each(CASES)('%s bounds on the Athens day', (file, pattern) => {
        expect(read(file)).toMatch(pattern)
    })

    it('the shared window helper bounds both arms identically and falls back to the raw column only while the resolved one is NULL', async () => {
        const { expiryWindowWhere } = await import('@/lib/policy-status')
        const from = new Date('2026-07-19T21:00:00.000Z')
        const to = new Date('2026-08-19T05:00:00.000Z')
        const where = expiryWindowWhere(from, to)
        expect(where).toEqual({
            OR: [
                { coverageEndDate: { gte: from, lte: to } },
                { coverageEndDate: null, endDate: { gte: from, lte: to } },
            ],
        })
    })

    it('leaves no policy-date window bounded by a bare instant', () => {
        const offenders: string[] = []
        const files = [...globSync('lib/services/**/*.ts'), ...globSync('app/**/actions.ts')]
        for (const file of files) {
            const src = read(file)
            // endDate / policyEndDate compared against `now` or `new Date()`.
            const re = /(endDate|policyEndDate)\s*:\s*\{[^}]*\b(gt|gte|lt|lte)\s*:\s*(now|new Date\(\))\b/g
            if (re.test(src)) offenders.push(file)
        }
        expect(offenders, `policy dates bounded by an instant:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * The churn win-back email counted "policies expiring in the next 30 days" with
 * no LOWER bound at all. `status: "active"` is not one — the stored status is
 * never updated to "expired" (the reason isPremiumBearing exists) — so the count
 * included policies that lapsed years ago. A false statement, in an outbound
 * email, to a user the product is trying to win back.
 */
describe('the churn email does not count lapsed policies as expiring soon', () => {
    const now = new Date('2026-07-24T09:00:00Z')

    it('a policy that ended last year is outside the window', () => {
        const lapsed = new Date('2025-05-25T00:00:00Z')
        expect(lapsed >= startOfAthensDay(now)).toBe(false)
    })

    it('a policy ending today is inside it', () => {
        expect(new Date('2026-07-24T00:00:00Z') >= startOfAthensDay(now)).toBe(true)
    })

    it('the window has a lower bound at all', () => {
        expect(read('lib/services/churn-prevention.service.ts'))
            .not.toMatch(/endDate: \{ lte: thirtyDaysOut \}/)
    })
})
