import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Two quality defects on the B2C account/security settings page that the general
 * greek-sentence-case guard structurally can't lock — the accent one isn't a
 * casing issue, and the Title-Case one is a 5-word phrase (outside that guard's
 * 2–4 word window). Pinned here directly.
 */
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

describe('account-settings Greek labels are correctly accented and sentence-cased', () => {
    it('the delete-account heading is accented', () => {
        expect(EL).not.toContain('Διαγραφη λογαριασμου') // missing ή and ού
        expect(EL).toContain("nuclearDeletion: 'Διαγραφή λογαριασμού'")
    })

    it('the master sign-out label is sentence case', () => {
        expect(EL).not.toContain('Κύρια Αποσύνδεση')
        expect(EL).toContain('Κύρια αποσύνδεση (όλες οι συσκευές)')
    })
})
