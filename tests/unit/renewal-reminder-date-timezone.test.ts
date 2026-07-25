import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Renewal reminders tell a policyholder WHEN their policy expires — the single
 * most consequential fact in the message. Policy end dates are stored at Athens
 * midnight, so a bare `endDate.toLocaleDateString(...)` renders against the
 * RUNTIME zone (UTC on Vercel) and shows the PREVIOUS day. The automated
 * reminder (renewal.service.ts) documented and fixed exactly this by routing
 * through `formatDate` (which pins `timeZone: APP_TIME_ZONE`); the manual batch
 * reminder in renewals/actions.ts regressed the same bug — the two reminders for
 * the very same policy disagreed by a day, and both could disagree with the
 * wallet.
 *
 * Both customer-facing `policy_expiring` composers must format the expiry date
 * through the Athens-zone helper, never bare toLocaleDateString on the endDate.
 */
const RENEWAL_REMINDER_SOURCES = [
    'app/(protected)/renewals/actions.ts',
    'lib/services/renewal.service.ts',
]

describe('renewal reminders format the expiry date in the Athens zone', () => {
    it('no renewal-reminder composer formats a policy endDate with bare toLocaleDateString', () => {
        const offenders: string[] = []
        for (const path of RENEWAL_REMINDER_SOURCES) {
            const src = readFileSync(path, 'utf-8')
            // The off-by-one anti-pattern: `.endDate.toLocaleDateString(` — a raw
            // Date method with no timeZone, applied to the policy expiry date.
            if (/\.endDate\s*\.toLocaleDateString\s*\(/.test(src)) {
                offenders.push(path)
            }
        }
        expect(
            offenders,
            `renewal reminder(s) format the policy endDate with a timezone-unsafe ` +
            `toLocaleDateString (off-by-one at Athens midnight). Use ` +
            `formatDate(endDate, lang) from @/lib/i18n/format:\n${offenders.join('\n')}`,
        ).toEqual([])
    })

    it('each renewal-reminder composer routes dates through the Athens-zone formatDate helper', () => {
        for (const path of RENEWAL_REMINDER_SOURCES) {
            const src = readFileSync(path, 'utf-8')
            expect(
                /\bformatDate\s*\(/.test(src),
                `${path} should format its reminder date via formatDate (Athens zone), ` +
                `consistent with the wallet and the sibling reminder path`,
            ).toBe(true)
        }
    })
})
