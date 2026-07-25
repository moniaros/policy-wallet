import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The standalone AI-consent approval page (reached via the advisor's request
 * link) redirects to the dashboard after consent, so it needs an explicit
 * success confirmation — unlike the in-flow consenters, which start the analysis
 * as their feedback. It previously toasted t.common.aiConsentTitle ("Consent to
 * AI analysis" — a heading), leaving the user unsure their consent was recorded.
 * It must confirm the action via a dedicated "recorded" message.
 */
const SRC = readFileSync('app/(protected)/consent/ai/AiConsentApprovalClient.tsx', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

describe('AI-consent approval confirms the consent was recorded', () => {
    it('toasts the recorded-confirmation, not the modal title', () => {
        expect(SRC).toContain('t.common.aiConsentSaved')
        expect(SRC).not.toMatch(/toast\.success\(t\.common\.aiConsentTitle\)/)
    })

    it('both languages define the aiConsentSaved confirmation', () => {
        expect(EN).toMatch(/aiConsentSaved:\s*'[^']+'/)
        expect(EL).toMatch(/aiConsentSaved:\s*'[^']+'/)
    })
})
