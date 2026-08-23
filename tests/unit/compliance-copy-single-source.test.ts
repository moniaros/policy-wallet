import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * Insurance advice is regulated in Greece (IDD, Law 4583/2018), so the
 * "this is not personalised advice — speak to a licensed intermediary" line is
 * compliance wording, not microcopy — and it has exactly ONE source.
 *
 * History: the wording once existed twice — in the translation files and as an
 * inline literal in the ProtectionScoreCard carrying an `i18n-hardcoded-ignore`.
 * Hand-synced regulated copy agrees right up until legal review edits one of
 * the two. The card (and the portfolio protection score with it) was removed
 * from the product in Aug 2026 (PW-MOBILE-TRANSFORM-01, halt H-001); the
 * single-source key SURVIVES because the wallet's per-policy indicator still
 * renders it, and it remains the one place legal review has to edit.
 */
describe('the not-advice compliance copy has one source', () => {
    it('the wallet reads the disclaimer from translations, not a literal', () => {
        const wallet = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
        expect(wallet).toMatch(/notAdvice: t\.dashboard\.home\.scoreMethodologyNotAdvice/)
        expect(wallet).not.toMatch(/δεν αποτελεί εξατομικευμένη ασφαλιστική συμβουλή/)
        expect(wallet).not.toMatch(/not personalised insurance advice/)
    })

    it('the disclaimer still says the two things that make it compliant', () => {
        // It is not advice, AND it points to a licensed intermediary.
        expect(el.dashboard.home.scoreMethodologyNotAdvice).toMatch(/δεν αποτελεί εξατομικευμένη ασφαλιστική συμβουλή/)
        expect(el.dashboard.home.scoreMethodologyNotAdvice).toMatch(/αδειοδοτημένο ασφαλιστικό διαμεσολαβητή/)
        expect(en.dashboard.home.scoreMethodologyNotAdvice).toMatch(/not personalised insurance advice/i)
        expect(en.dashboard.home.scoreMethodologyNotAdvice).toMatch(/licensed insurance intermediary/i)
    })
})
