import { describe, expect, it } from 'vitest'

import { normalizeInsurerKey, resolveInsurerDisplay } from '@/lib/wallet/insurer-registry'

describe('normalizeInsurerKey', () => {
    it('strips diacritics, legal suffixes and dotted acronyms', () => {
        expect(normalizeInsurerKey('ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ Α.Ε.Ε.Γ.Α.')).toBe('εθνικη ασφαλιστικη')
        expect(normalizeInsurerKey('EUROLIFE FFH ΜΟΝΟΠΡΟΣΩΠΗ Α.Ε.Α.Ζ.')).toBe('eurolife ffh')
        expect(normalizeInsurerKey('Υδρόγειος')).toBe('υδρογειοσ')
    })
})

describe('resolveInsurerDisplay', () => {
    it('normalizes the prod-observed Εθνική string', () => {
        expect(resolveInsurerDisplay('ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ').displayName).toBe(
            'Εθνική Ασφαλιστική'
        )
    })

    it('matches aliases regardless of legal boilerplate', () => {
        expect(resolveInsurerDisplay('ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ Α.Ε.Ε.Γ.Α.').displayName).toBe(
            'Εθνική Ασφαλιστική'
        )
        expect(resolveInsurerDisplay('Eurolife FFH Μονοπρόσωπη Α.Ε.Α.Ζ.').displayName).toBe(
            'Eurolife FFH'
        )
        expect(resolveInsurerDisplay('INTERAMERICAN').displayName).toBe('Interamerican')
        expect(resolveInsurerDisplay('Hellas Direct').displayName).toBe('Hellas Direct')
    })

    it('falls back to the cleaned raw string for unknown insurers', () => {
        expect(resolveInsurerDisplay('  Άγνωστη   Ασφαλιστική  ').displayName).toBe(
            'Άγνωστη Ασφαλιστική'
        )
        expect(resolveInsurerDisplay('Some Foreign Insurer Co').displayName).toBe(
            'Some Foreign Insurer Co'
        )
    })

    it('is safe on empty/null input', () => {
        expect(resolveInsurerDisplay(null).displayName).toBe('')
        expect(resolveInsurerDisplay(undefined).displayName).toBe('')
        expect(resolveInsurerDisplay('').logoUrl).toBeNull()
    })

    it('does not misfire the substring pass on short fragments', () => {
        // "nn" is a 2-char alias — must only exact-match, never substring-match.
        expect(resolveInsurerDisplay('Brannigan Insurance').displayName).toBe(
            'Brannigan Insurance'
        )
    })
})
