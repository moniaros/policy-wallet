import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { getStatusLabel } from '@/lib/policy-status'
import { el } from '@/lib/i18n/translations/el'

/**
 * Greek adjectives agree in gender with their subject, and the subject here is
 * «το ασφαλιστήριο» — neuter. The canonical t.policyStatus block says so in a
 * comment and follows it: ΕΝΕΡΓΟ, ΛΗΓΜΕΝΟ, ΕΛΛΙΠΕΣ, ΜΗ ΕΠΑΛΗΘΕΥΜΕΝΟ.
 *
 * Two places disagreed with it:
 *   • t.policyStatus.cancelled was 'ΑΚΥΡΩΜΕΝΗ' — feminine, breaking its own
 *     documented rule, so «το ασφαλιστήριο ΑΚΥΡΩΜΕΝΗ».
 *   • lib/policy-status.ts getStatusLabel had 'Ενεργή' and 'Ακυρωμένη'
 *     (feminine) beside 'Ληγμένο' (neuter) — inconsistent within one map.
 *
 * getStatusLabel is live on BOTH policy detail pages, so one policy's status
 * changed gender between the wallet list and its own page.
 */
describe('policy status wording', () => {
    const STATUSES = ['active', 'expiring_soon', 'expired', 'unknown_duration', 'action_needed', 'cancelled'] as const
    const KEY: Record<string, keyof typeof el.policyStatus> = {
        active: 'active',
        expiring_soon: 'expiringSoon',
        expired: 'expired',
        unknown_duration: 'unknownDuration',
        action_needed: 'actionNeeded',
        cancelled: 'cancelled',
    }

    it('agrees word-for-word with the canonical block', () => {
        for (const status of STATUSES) {
            const fromFn = getStatusLabel(status as any, 'el')
            const canonical = el.policyStatus[KEY[status]]
            expect(fromFn.toLocaleUpperCase('el'), status).toBe(canonical.toLocaleUpperCase('el'))
        }
    })

    it('uses neuter forms — the subject is «το ασφαλιστήριο»', () => {
        for (const status of STATUSES) {
            expect(getStatusLabel(status as any, 'el'), status).not.toMatch(/(μένη|ενή|ική)$/)
        }
        expect(el.policyStatus.cancelled).toBe('ΑΚΥΡΩΜΕΝΟ')
        expect(el.policyStatus.active).toBe('ΕΝΕΡΓΟ')
    })

    it('keeps the POLICY status vocabulary neuter, without policing Greek at large', () => {
        // A blanket search for "Ενεργή" is the wrong instrument: gender agrees
        // with the subject, and plenty of subjects here are feminine. role-copy's
        // consentGranted: "Ενεργή" is CORRECT — «η συναίνεση» is feminine. So
        // check the two sources that describe «το ασφαλιστήριο», and nothing else.
        const statusVocabulary = [
            ...Object.values(el.policyStatus),
            ...STATUSES.map((s) => getStatusLabel(s as any, 'el')),
        ]
        const offenders = statusVocabulary.filter((w) => /(ΜΕΝΗ|μένη|ΕΝΕΡΓΗ|Ενεργή)$/.test(w))
        expect(offenders, `feminine forms on a neuter subject:\n${offenders.join('\n')}`).toEqual([])
    })

    it('is sentence case, not Title Case', () => {
        expect(getStatusLabel('expiring_soon' as any, 'el')).toBe('Λήγει σύντομα')
        expect(getStatusLabel('action_needed' as any, 'el')).toBe('Απαιτείται ενέργεια')
    })
})
