import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calendarDaysUntil } from '@/lib/policy-status'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ACTIONS = strip(readFileSync('app/(protected)/insights/actions.ts', 'utf-8'))
const CLIENT = strip(readFileSync('app/(protected)/insights/InsightsClient.tsx', 'utf-8'))

/**
 * The agent's renewal pipeline filtered on `endDate >= now`. endDate is stored at
 * midnight, so a policy expiring TODAY left the list the moment the clock passed
 * 00:00 UTC — 03:00 in Athens. It vanished on the one day the renewal could
 * still be saved, and never came back: the next day it is simply expired.
 */
describe('a policy expiring today is still in the agent renewal timeline', () => {
    // endDate at midnight, "now" mid-morning on the SAME Athens day.
    const endDate = new Date('2026-07-24T00:00:00Z')
    const now = new Date('2026-07-24T09:00:00Z')

    it('the old filter dropped it', () => {
        expect(endDate >= now).toBe(false)
    })

    it('the calendar-day window keeps it, at zero days left', () => {
        const days = calendarDaysUntil(endDate, now)
        expect(days).toBe(0)
        expect(days >= 0 && days <= 90).toBe(true)
    })

    it('drops it the following day, not the same day', () => {
        expect(calendarDaysUntil(endDate, new Date('2026-07-25T09:00:00Z'))).toBe(-1)
    })

    it('is what the action actually computes', () => {
        expect(ACTIONS).toMatch(/daysUntilExpiry: calendarDaysUntil\(endDate, now\)/)
        expect(ACTIONS).toMatch(/item\.daysUntilExpiry >= 0 && item\.daysUntilExpiry <= 90/)
        expect(ACTIONS).not.toMatch(/entry\.endDate >= now/)
        expect(ACTIONS).not.toMatch(/Math\.ceil\(\(endDate\.getTime\(\)/)
    })
})

/**
 * The badge interpolates the raw count. Once policies expiring today are in the
 * list, "0 ημ." is not what an agent should read on the last day of cover.
 */
describe('the renewal badge reads correctly at the boundary', () => {
    it('names today and tomorrow instead of counting them', () => {
        expect(CLIENT).toMatch(/daysUntilExpiry === 0[\s\S]{0,80}expiresTodayBadge/)
        expect(CLIENT).toMatch(/daysUntilExpiry === 1[\s\S]{0,80}expiresTomorrowBadge/)
    })

    it('has both labels in both languages', () => {
        expect(el.insights.practice.expiresTodayBadge).toBe('Σήμερα')
        expect(el.insights.practice.expiresTomorrowBadge).toBe('Αύριο')
        expect(en.insights.practice.expiresTodayBadge).toBe('Today')
        expect(en.insights.practice.expiresTomorrowBadge).toBe('Tomorrow')
    })

    it('still counts the days for everything else', () => {
        expect(CLIENT).toMatch(/\$\{item\.daysUntilExpiry\}\$\{p\.daysAbbr\}/)
    })
})
