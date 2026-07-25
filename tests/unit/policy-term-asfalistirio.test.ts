import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The Greek UI mixed «συμβόλαιο» (contract) and «ασφαλιστήριο» for the same
 * concept — "policy" — 151 vs 59. Owner ratified «ασφαλιστήριο» (the /lexiko
 * dictionary headword, and the word printed on actual Greek policy documents),
 * so the whole UI is standardized on it. «σύμβαση» (a legal contract/agreement,
 * e.g. «ασφαλιστική σύμβαση») is a DIFFERENT word and is intentionally kept.
 */
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

// In-app B2C UI components with hardcoded Greek labels — standardized too.
// (Long-form editorial content — guides, glossary bodies, branch education, SEO,
// marketing narrative — deliberately keeps «συμβόλαιο» as a prose synonym.)
const UI_FILES = [
    'components/coverage/CoverageInsightsClient.tsx',
    'app/onboarding/flow.tsx',
    'lib/monetization/upgrade-copy.el.ts',
    'lib/pricing/public-pricing-content.ts',
    // Gap-engine findings are short customer-facing cards (title + evidence),
    // not long-form editorial — a card must not say «συμβόλαιο» in its title and
    // «ασφαλιστήριο» in its evidence. Its sibling rule files already use «ασφαλιστήριο».
    'lib/services/gap-engine/portfolio-rules.ts',
]

describe('policy term is «ασφαλιστήριο», never «συμβόλαιο»', () => {
    it('no «συμβόλαι…» form remains in the Greek UI', () => {
        expect(EL).not.toMatch(/συμβόλαι/i)
        expect(EL).not.toMatch(/συμβολαί/i)
    })

    it('the in-app B2C UI components use «ασφαλιστήριο» in their labels', () => {
        for (const file of UI_FILES) {
            const src = readFileSync(file, 'utf-8')
            expect.soft(src, file).not.toMatch(/συμβόλαι/i)
            expect.soft(src, file).not.toMatch(/συμβολαί/i)
        }
    })

    it('EN policy-meaning labels say "policy"/"Insurer", not "contract"', () => {
        expect(EN).toContain('downloadContract: "Download policy"')
        expect(EN).not.toContain('contractInsurer: "Contract Insurer"')
        // The legal-concept usage in the proposal disclaimer is intentionally kept.
        expect(EN).toMatch(/not a binding insurance contract/)
    })
})
