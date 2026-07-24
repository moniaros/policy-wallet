import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { startOfAthensDay, calendarDaysUntil } from '@/lib/policy-status'
import { daysLeftLabel } from '@/lib/wallet/days-left-label'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const SERVICE = strip(readFileSync('lib/services/renewal.service.ts', 'utf-8'))
const ACTIONS = strip(readFileSync('app/(protected)/renewals/actions.ts', 'utf-8'))
const CLIENT = strip(readFileSync('app/(protected)/renewals/RenewalsClient.tsx', 'utf-8'))
const INSIGHTS_CLIENT = strip(readFileSync('app/(protected)/insights/InsightsClient.tsx', 'utf-8'))

/**
 * Policy end dates are stored at midnight UTC, which is 03:00 Athens. Every
 * `{ lt: now }` / `{ gte: now }` in the renewal path therefore treated a policy
 * as past from three hours into the very day it still covered someone.
 */
describe('the Athens day boundary, which a Prisma where-clause needs', () => {
    const now = new Date('2026-07-24T09:00:00Z')

    it('is the start of today in Athens, not this instant', () => {
        expect(startOfAthensDay(now).toISOString()).toBe('2026-07-23T21:00:00.000Z')
    })

    it('follows DST rather than assuming a fixed offset', () => {
        // Athens is UTC+2 in January, UTC+3 in July.
        expect(startOfAthensDay(new Date('2026-01-15T09:00:00Z')).toISOString())
            .toBe('2026-01-14T22:00:00.000Z')
    })

    it('leaves a policy expiring today on the near side of the boundary', () => {
        const endsToday = new Date('2026-07-24T00:00:00Z')
        expect(endsToday < startOfAthensDay(now)).toBe(false)
        expect(endsToday < startOfAthensDay(new Date('2026-07-25T09:00:00Z'))).toBe(true)
        expect(calendarDaysUntil(endsToday, now)).toBe(0)
    })

    it('is what would have gone wrong with a bare `now`', () => {
        expect(new Date('2026-07-24T00:00:00Z') < now).toBe(true)
    })
})

/**
 * The cron runs at 05:00 UTC. Keyed off `lt: now`, the overdue sweep therefore
 * fired on the expiry morning: a policy still in force until tonight was
 * reported "overdue" at 08:00 Athens — to the agent, and in the Overdue count
 * on /insights.
 */
describe('the renewal cron uses the day boundary', () => {
    it('scans a policy on its own expiry day', () => {
        expect(SERVICE).toMatch(/endDate: \{\s*gte: startOfToday,/)
        expect(SERVICE).not.toMatch(/endDate: \{\s*gte: now,/)
    })

    it('does not call a policy overdue while it is still in force', () => {
        expect(SERVICE).toMatch(/policyEndDate: \{ lt: startOfToday \}/)
        expect(SERVICE).not.toMatch(/policyEndDate: \{ lt: now \}/)
    })
})

/**
 * `daysBeforeExpiry` is only written when the renewal cron last touched the row.
 * Cron failures are silent, so the agent's renewals table could show a countdown
 * days out of date — and disagree with /insights and the wallet, which compute
 * theirs at read time, about the same policy.
 */
describe('the renewals page computes days left rather than reading a snapshot', () => {
    it('recomputes from the end date', () => {
        expect(ACTIONS).toMatch(/daysBeforeExpiry: calendarDaysUntil\(r\.policyEndDate, now\)/)
        expect(ACTIONS).not.toMatch(/daysBeforeExpiry: r\.daysBeforeExpiry/)
    })

    it('keeps today inside the timeframe filter', () => {
        expect(ACTIONS).toMatch(/policyEndDate: \{ gte: startOfAthensDay\(now\), lte: cutoff \}/)
    })
})

/**
 * The countdown badge interpolated a hardcoded English "d" on a Greek-default
 * UI, and now reaches 0 and 1 — where a bare number is the wrong thing to read
 * on the last day of cover. lint:i18n-changed only inspects CHANGED files, so a
 * literal that had always been there was never put in front of it.
 */
describe('the renewals countdown badge speaks the reader language', () => {
    it('has no hardcoded day suffix left', () => {
        expect(CLIENT).not.toMatch(/\{daysLeft\}d/)
        expect(CLIENT).toMatch(/daysLeftLabel\(daysLeft, dayLabels\)/)
    })

    it('labels the boundary values rather than counting them', () => {
        // Behavioural, not source-shaped: the first version of this test asserted
        // only that the helper was CALLED, and survived a mutation that moved the
        // "today" boundary to -99 — passing the exact bug it was written for.
        const labels = { today: 'Σήμερα', tomorrow: 'Αύριο', suffix: ' ημ.' }
        expect(daysLeftLabel(0, labels)).toBe('Σήμερα')
        expect(daysLeftLabel(1, labels)).toBe('Αύριο')
        expect(daysLeftLabel(2, labels)).toBe('2 ημ.')
        expect(daysLeftLabel(90, labels)).toBe('90 ημ.')
        // A row already past its end date must not read as "-1 ημ.".
        expect(daysLeftLabel(-1, labels)).toBe('Σήμερα')
    })

    it('is the same helper on both surfaces that show this countdown', () => {
        expect(CLIENT).toMatch(/from "@\/lib\/wallet\/days-left-label"/)
        expect(INSIGHTS_CLIENT).toMatch(/from "@\/lib\/wallet\/days-left-label"/)
        expect(INSIGHTS_CLIENT).toMatch(/daysLeftLabel\(item\.daysUntilExpiry, \{/)
    })

    it('names today and tomorrow in both languages', () => {
        expect(CLIENT).toMatch(/expiresToday: "Today"/)
        expect(CLIENT).toMatch(/expiresToday: "Σήμερα"/)
        expect(CLIENT).toMatch(/expiresTomorrow: "Tomorrow"/)
        expect(CLIENT).toMatch(/expiresTomorrow: "Αύριο"/)
        expect(CLIENT).toMatch(/daysLeftSuffix: " ημ\."/)
    })

    it('dates rows through the Athens-pinned formatter', () => {
        expect(CLIENT).toMatch(/formatDateShared\(iso, language === "el" \? "el" : "en"/)
        expect(CLIENT).not.toMatch(/toLocaleDateString/)
    })
})
