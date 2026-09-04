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
    'app/onboarding/ProtectionProfileFlow.tsx',
    'components/onboarding/protection-profile/QuestionScreen.tsx',
    'components/onboarding/protection-profile/SummaryScreen.tsx',
    'components/onboarding/protection-profile/ProtectionMapCard.tsx',
    'components/onboarding/protection-profile/UploadScreen.tsx',
    'components/onboarding/protection-profile/AdvisorScreen.tsx',
    'lib/onboarding/protection-profile/map-rows.ts',
    'lib/monetization/upgrade-copy.el.ts',
    'lib/pricing/public-pricing-content.ts',
    // Gap-engine findings are short customer-facing cards (title + evidence),
    // not long-form editorial — a card must not say «συμβόλαιο» in its title and
    // «ασφαλιστήριο» in its evidence. Its sibling rule files already use «ασφαλιστήριο».
    'lib/services/gap-engine/portfolio-rules.ts',
    // The agent-side copy module: its «Συμβόλαια» sat in the customers page's
    // column header and stat tiles until batch C. In-app product copy, not prose.
    'lib/i18n/role-copy.ts',
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

    /**
     * KNOWN GAP, measured 2026-08-27 — this guard's universe stops at
     * `components/*` (minus landing) plus the two translation files. Customer-
     * facing Greek copy also lives in `lib/**` and `app/(protected)/**`, and
     * none of it is scanned.
     *
     * That is not hypothetical. `lib/services/ai/document-kind.ts` shipped
     * «δεν αναλύθηκε ως συμβόλαιο» in the extraction-refusal message a customer
     * reads, and it was found only because an agent copied its register into a
     * new string and the *translation-file* half of this guard fired on the copy.
     * The original was invisible. Fixed at the same time as this note.
     *
     * NOT widened here, deliberately: a naive scan of `lib/` and `app/` matches
     * **75 files**. Most are legitimate — this file's own rule ratifies
     * «συμβόλαιο» as prose in public marketing narrative, which covers
     * `app/(public)/**`, `lib/guides/`, `lib/glossary/` and the editorial
     * content modules. Turning that into a failing assertion would either be
     * red on day one or need a 60-entry allowlist, and an allowlist that large
     * is a second place for the rule to rot.
     *
     * The in-app subset that a widened guard SHOULD cover, from that scan:
     * `app/(protected)/protection/page.tsx` («Άλλο Συμβόλαιο»),
     * `app/(protected)/renewals/actions.ts`, `lib/i18n/role-copy.ts`
     * («Ενεργά Συμβόλαια»), `lib/subscription-copy.ts`,
     * `lib/wallet/document-insights.ts`, `lib/notifications/registry.ts`,
     * `lib/needs/outcome.ts` and the gap-engine copy modules.
     *
     * Closing it properly means separating "in-app product copy" from "public
     * editorial prose" at the directory level first. That is a real piece of
     * work, and it is recorded rather than half-done.
     */
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
