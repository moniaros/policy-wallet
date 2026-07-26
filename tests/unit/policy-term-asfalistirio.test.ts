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

    it('no B2C component tree carries «συμβόλαιο» in inline strings (the t()-helper blind spot)', () => {
        // The rendered-page walk caught /coverage-insights saying «Προσθέστε το
        // πρώτο σας συμβόλαιο» one section above «Προσθέστε ένα ασφαλιστήριο» —
        // inline t("el","en") calls that lint:i18n-changed and the el.ts scan
        // both miss. Scan the B2C component DIRECTORIES so the class stays closed.
        const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs')
        const { join } = require('node:path') as typeof import('node:path')
        const collect = (dir: string): string[] =>
            readdirSync(dir).flatMap((name) => {
                const p = join(dir, name)
                if (statSync(p).isDirectory()) return collect(p)
                return p.endsWith('.tsx') ? [p] : []
            })
        // ALL in-app component trees. Only components/landing is exempt — it
        // renders public marketing narrative, where «συμβόλαιο» stays a ratified
        // prose synonym. Cycle B of the enterprise loop found stragglers in
        // onboarding/notifications/monetization/agent, so the scan covers the
        // whole tree rather than an allowlist that goes stale.
        const { readdirSync: rd } = require('node:fs') as typeof import('node:fs')
        const dirs = rd('components', { withFileTypes: true })
            .filter((d) => d.isDirectory() && d.name !== 'landing')
            .map((d) => `components/${d.name}`)
        const files = dirs.flatMap(collect)
        expect(files.length).toBeGreaterThan(50) // the scan must actually see the tree
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            expect.soft(src, file).not.toMatch(/συμβόλαι|συμβολαί/i)
        }
    })

    it('policy-number labels lowercase «ασφαλιστηρίου» after the «Αρ.» abbreviation', () => {
        // «Αρ.» is an abbreviation, not a sentence end, so the next word stays
        // lowercase — and the greek-sentence-case guard misses this (it treats «.»
        // as a restart). policyNumberLabel was the lone «Αρ. Ασφαλιστηρίου» outlier.
        expect(EL).not.toMatch(/Αρ\. Ασφαλιστηρίου/)
        expect(EL).not.toMatch(/Αριθμός Ασφαλιστηρίου/)
    })

    it('EN policy-meaning labels say "policy"/"Insurer", not "contract"', () => {
        expect(EN).toContain('downloadContract: "Download policy"')
        expect(EN).not.toContain('contractInsurer: "Contract Insurer"')
        // The legal-concept usage in the proposal disclaimer is intentionally kept.
        expect(EN).toMatch(/not a binding insurance contract/)
    })
})
