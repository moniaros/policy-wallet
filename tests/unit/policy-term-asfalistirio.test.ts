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
// (Until 2026-09-12 the long-form editorial content — guides, glossary bodies,
// SEO, marketing narrative — kept «συμβόλαιο» as a ratified prose synonym. The
// public copy pass of that date aligned it with the app; see the public-roots
// test below for the two exemptions that survive and why.)
const UI_FILES = [
    // CoverageInsightsClient retired 2026-09-07 («Καλύψεις & κενά» story); its
    // successors on /protection carry no inline Greek and are scanned by the
    // directory walk below.
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
    // The risk catalogue's mitigations and explanations render on the area detail.
    'lib/services/gap-engine/risk-catalog.ts',
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
        // ALL in-app component trees. components/landing is left to the
        // public-roots test below, which scans it with the two named
        // exemptions. Cycle B of the enterprise loop found stragglers in
        // onboarding/notifications/monetization/agent, so the scan covers the
        // whole tree rather than an allowlist that goes stale.
        const { readdirSync: rd } = require('node:fs') as typeof import('node:fs')
        const dirs = rd('components', { withFileTypes: true })
            .filter((d) => d.isDirectory() && d.name !== 'landing')
            .map((d) => `components/${d.name}`)
        const files = dirs.flatMap(collect)
        expect(files.length).toBeGreaterThan(50) // the scan must actually see the tree
        // Branch education (lib/insurance/content) was carved out as "editorial prose"
        // to avoid a 75-file scan — until 2026-09-07, when the production smoke of
        // «Καλύψεις & κενά» read «Καταλάβετε τι πραγματικά καλύπτει το συμβόλαιο του
        // αυτοκινήτου σας» on a category row two lines under «Χωρίς ασφαλιστήριο».
        // A tagline, an empty-state headline and a CTA label are product copy wherever
        // they are authored. All 231 uses were the policy sense; swept, and in the
        // universe from now on. (.ts here, not .tsx: these are content modules.)
        const contentDir = "lib/insurance/content"
        const contentFiles = rd(contentDir).filter((n) => n.endsWith(".ts")).map((n) => `${contentDir}/${n}`)
        expect(contentFiles.length).toBeGreaterThan(30) // the scan must actually see the modules
        files.push(...contentFiles)
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            expect.soft(src, file).not.toMatch(/συμβόλαι|συμβολαί/i)
        }
    })

    /**
     * The public site — every root the marketing copy lives in, enumerated from
     * the filesystem — says «ασφαλιστήριο» too, since the copy pass of
     * 2026-09-12 (the site had drifted to 186 «συμβόλαιο» against 163
     * «ασφαλιστήριο», with no rule deciding which went where).
     *
     * Two forms survive on purpose, matched per LINE so an exemption cannot
     * blanket a file:
     *   - «ομαδικό συμβόλαιο» — the term of art in Greek benefits language
     *     (an HR department says it far more than «ομαδικό ασφαλιστήριο»), a
     *     documented keyword target, and the slug of its own guide;
     *   - «ασφαλιστήριο συμβόλαιο» — the glossary entry that TEACHES the full
     *     term, plus a `keywords:` array, which is search vocabulary not prose.
     *
     * Comments are stripped before matching. The first probe run of a sibling
     * guard in this repo passed because the probe's own comment named the
     * banned word while describing what it was failing to do — a guard that
     * greps prose grades prose. Probe: tests/fixtures/guard-probes/public-symvolaio.tsx.txt.
     */
    it('the public site says «ασφαλιστήριο» — «συμβόλαιο» survives only as the group term and the glossary definition', () => {
        const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs')
        const { join } = require('node:path') as typeof import('node:path')
        const PUBLIC_ROOTS = [
            'app/(public)', 'components/landing', 'lib/marketing', 'lib/landing', 'lib/seo',
            'lib/product', 'lib/guides', 'lib/glossary', 'lib/needs', 'lib/trust', 'lib/pricing',
        ]
        const collect = (dir: string): string[] =>
            readdirSync(dir).flatMap((name) => {
                const p = join(dir, name)
                if (statSync(p).isDirectory()) return collect(p)
                return /\.tsx?$/.test(name) ? [p] : []
            })
        const files = PUBLIC_ROOTS.flatMap(collect)
        expect(files.length).toBeGreaterThan(100) // the scan must actually see the site

        const EXEMPT = /ομαδικ|ασφαλιστήριο συμβόλαιο|\bkeywords\s*:/i
        const offenders: string[] = []
        for (const file of files) {
            const code = readFileSync(file, 'utf-8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/^[ \t]*\/\/.*$/gm, '')
            code.split('\n').forEach((line, i) => {
                if (/συμβόλαι|συμβολαί/i.test(line) && !EXEMPT.test(line)) {
                    offenders.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`)
                }
            })
        }
        expect(
            offenders,
            `public copy still says «συμβόλαιο» for the policy document — write «ασφαλιστήριο», or name the exemption:\n${offenders.join('\n')}`
        ).toEqual([])
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
     * NOT widened here at the time: a naive scan of `lib/` and `app/` matched
     * **75 files**, most of them the public editorial prose this file then
     * ratified «συμβόλαιο» for. Turning that into a failing assertion would
     * have been red on day one or needed a 60-entry allowlist.
     *
     * UPDATE 2026-09-12: the PUBLIC half of that gap is closed — the copy pass
     * aligned the prose and the test above now scans those roots with a
     * two-form, per-line exemption rather than an allowlist. What remains open
     * is the in-app half below.
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
