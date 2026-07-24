import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mapPolicyCardStatus } from '@/lib/wallet/map-policy-card-status'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * `mapStatus` existed as two byte-identical copies, one in /agent and one in
 * /account, both dividing milliseconds. End dates are stored at midnight UTC —
 * 03:00 Athens — so between 21:00 UTC and midnight a policy still in force on
 * the holder's own calendar came out at -1 and rendered "action needed", while
 * the wallet and the policy page called it active at the same moment.
 */
describe('the card status is judged on the Athens calendar', () => {
    const endsToday = new Date('2026-07-24T00:00:00Z')

    it('is not "action needed" during its final day of cover', () => {
        // 15:00 Athens on the last day.
        expect(mapPolicyCardStatus('active', endsToday, new Date('2026-07-24T12:00:00Z'))).toBe('expiring_soon')
    })

    it('was the exact case the millisecond version got wrong', () => {
        // 00:30 Athens on the 25th — still the 24th in UTC. The old maths gave a
        // negative here for a policy that had genuinely lapsed, and ALSO gave one
        // at 21:30 UTC on the 23rd for a policy that had not.
        expect(mapPolicyCardStatus('active', endsToday, new Date('2026-07-24T21:30:00Z'))).toBe('action_needed')
        const endsTomorrow = new Date('2026-07-25T00:00:00Z')
        expect(mapPolicyCardStatus('active', endsTomorrow, new Date('2026-07-24T21:30:00Z'))).toBe('expiring_soon')
    })

    it('cancelled beats every date', () => {
        expect(mapPolicyCardStatus('cancelled', new Date('2030-01-01T00:00:00Z'))).toBe('action_needed')
    })

    it('keeps the 30-day expiring window', () => {
        const now = new Date('2026-07-24T09:00:00Z')
        expect(mapPolicyCardStatus('active', new Date('2026-08-22T00:00:00Z'), now)).toBe('expiring_soon')
        expect(mapPolicyCardStatus('active', new Date('2026-08-23T00:00:00Z'), now)).toBe('active')
    })

    it('is one implementation, imported by both routes', () => {
        for (const f of ['app/(protected)/agent/page.tsx', 'app/(protected)/account/page.tsx']) {
            const src = strip(readFileSync(f, 'utf-8'))
            expect(src, f).toMatch(/from '@\/lib\/wallet\/map-policy-card-status'/)
            expect(src, `${f} still declares its own copy`).not.toMatch(/function mapStatus\(/)
        }
    })
})

/**
 * A Green Card is the document a driver hands over at a border. `Math.floor` on
 * a fractional negative made one valid until tonight come out at -1, so the
 * policy page told them it had expired while it had not.
 */
describe('the Green Card status counts calendar days', () => {
    it('uses the shared helper', () => {
        const src = strip(readFileSync('components/wallet/coverage-details/MotorCoverageDetails.tsx', 'utf-8'))
        expect(src).toMatch(/calendarDaysUntil\(expiry, new Date\(\)\)/)
        expect(src).not.toMatch(/1000 \* 60 \* 60 \* 24/)
    })
})
