import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The needs-analysis questionnaires include health/life templates that collect
 * GDPR special-category data (pre-existing conditions, medication, "heart
 * disease, cancer, diabetes", smoking). The client fills these in and submits.
 * On a regulated insurance platform, the form must tell them who receives this
 * and how it's handled — the same transparency the app applies to AI-health
 * consent and document provenance. Without it, a customer submits medical
 * history with no notice at all.
 *
 * Pins: the form renders a privacy/purpose note linking to /privacy, and both
 * languages carry substantive content (health data + shared with the advisor).
 */
const FORM = readFileSync('components/tasks/QuestionnaireForm.tsx', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

function noteValue(src: string): string | null {
    const m = src.match(/questionnairePrivacyNote:\s*'([^']*)'/)
    return m ? m[1] : null
}

describe('questionnaire form carries a data-handling note before submission', () => {
    it('the form renders the privacy note and links to /privacy', () => {
        expect(
            /tasks\.questionnairePrivacyNote/.test(FORM),
            'QuestionnaireForm must render t.tasks.questionnairePrivacyNote',
        ).toBe(true)
        expect(
            /href="\/privacy"/.test(FORM),
            'the note must link to the /privacy policy',
        ).toBe(true)
    })

    it('English note states health data is shared with the advisor', () => {
        const en = noteValue(EN)
        expect(en, 'en.ts questionnairePrivacyNote missing').toBeTruthy()
        expect(en!.toLowerCase()).toContain('health')
        expect(en!.toLowerCase()).toContain('advisor')
    })

    it('Greek note states health data is shared with the advisor', () => {
        const el = noteValue(EL)
        expect(el, 'el.ts questionnairePrivacyNote missing').toBeTruthy()
        expect(el).toMatch(/υγεία/)      // health
        expect(el).toMatch(/σύμβουλο/)   // advisor
    })
})
