import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const card = readFileSync('components/coverage/ProtectionScoreCard.tsx', 'utf-8')

/**
 * Insurance advice is regulated in Greece (IDD, Law 4583/2018), so the
 * "this is not personalised advice — speak to a licensed intermediary" line is
 * compliance wording, not microcopy.
 *
 * It existed twice: once in the translation files feeding the /dashboard tile,
 * and once as an inline literal in ProtectionScoreCard carrying an
 * `i18n-hardcoded-ignore`. The comment above that block said the two surfaces
 * must agree — which they did, by hand. Hand-synced regulated copy agrees right
 * up until legal review edits one of the two.
 */
describe('score-methodology compliance copy has one source', () => {
    it('the card reads the disclaimer from translations, not a literal', () => {
        expect(card).toMatch(/methodNotAdvice: methodology\.scoreMethodologyNotAdvice/)
        expect(card).not.toMatch(/δεν αποτελεί εξατομικευμένη ασφαλιστική συμβουλή/)
        expect(card).not.toMatch(/not personalised insurance advice/)
    })

    it('reads every methodology string from the same place', () => {
        for (const key of ['Title', 'Body', 'Limits', 'NotAdvice']) {
            expect(card, `method${key}`).toMatch(new RegExp(`method${key}: methodology\\.scoreMethodology${key}`))
        }
    })

    it('the disclaimer still says the two things that make it compliant', () => {
        // It is not advice, AND it points to a licensed intermediary.
        expect(el.dashboard.home.scoreMethodologyNotAdvice).toMatch(/δεν αποτελεί εξατομικευμένη ασφαλιστική συμβουλή/)
        expect(el.dashboard.home.scoreMethodologyNotAdvice).toMatch(/αδειοδοτημένο ασφαλιστικό διαμεσολαβητή/)
        expect(en.dashboard.home.scoreMethodologyNotAdvice).toMatch(/not personalised insurance advice/i)
        expect(en.dashboard.home.scoreMethodologyNotAdvice).toMatch(/licensed insurance intermediary/i)
    })

    it('states what the score does NOT assess, so it is not read as a value judgement', () => {
        expect(el.dashboard.home.scoreMethodologyLimits).toMatch(/ασφάλιστρα/)   // premiums
        expect(el.dashboard.home.scoreMethodologyLimits).toMatch(/εταιρείες/)     // insurers
        expect(en.dashboard.home.scoreMethodologyLimits).toMatch(/premiums/i)
        expect(en.dashboard.home.scoreMethodologyLimits).toMatch(/insurers/i)
    })
})
