import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'

/**
 * Greek quality defects on the settings surface that the general
 * greek-sentence-case guard structurally cannot lock — it scans inline `el: '…'`
 * maps and only 2–4 word phrases, so a missing accent in the dictionary and a
 * Title-Cased five-word label both slipped past it. Pinned here directly.
 */
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

/** Uppercase Greek initials, for the sentence-case check below. */
const GREEK_UPPER = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ'

describe('settings Greek labels are correctly accented and sentence-cased', () => {
    it('the delete-account heading is accented', () => {
        expect(EL).not.toContain('Διαγραφη λογαριασμου') // missing ή and ού
        expect(EL).toContain("nuclearDeletion: 'Διαγραφή λογαριασμού'")
    })

    it('the my-data heading is accented', () => {
        // «Τα δεδομενα μου» shipped to production missing the accent on δεδομένα.
        expect(EL).not.toContain('Τα δεδομενα μου')
        expect(el.settings.myDataTitle).toBe('Τα δεδομένα μου')
    })

    it('the sign-out-everywhere label is sentence case', () => {
        // Was «Κύρια Αποσύνδεση» — Title Case, and "master sign-out" besides,
        // which is console jargon rather than something a customer would say.
        expect(EL).not.toContain('Κύρια Αποσύνδεση')
        expect(el.settings.security.signOutEverywhere).toBe('Αποσύνδεση από παντού')
    })

    it('no settings nav label is Title Case', () => {
        // The rail is the first Greek a customer reads on this surface.
        for (const entry of Object.values(el.settings.nav)) {
            for (const value of [entry.label, entry.description]) {
                const words = value.split(/\s+/).slice(1)
                const offenders = words.filter(
                    (w) => w.length > 2 && GREEK_UPPER.includes(w[0]) && w !== w.toUpperCase()
                )
                expect(offenders, `Title Case in «${value}»`).toEqual([])
            }
        }
    })
})
