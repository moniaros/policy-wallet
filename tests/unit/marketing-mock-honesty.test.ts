import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { globSync } from '../helpers/glob'

/**
 * The product mocks on the public site may show what PolicyWallet DOES. They
 * may not show quantified results a reader would take as evidence.
 *
 * That line is not arbitrary — it is the one `PolicyWalletWidget` already draws
 * on the record: "A stranger cannot check any of those numbers, and a two-digit
 * grade is what every fintech dashboard leads with — so it read as decoration,
 * not evidence." `GapAnalysisWidget` passes under the same rule while showing
 * plenty of specifics, because "Home — missing earthquake cover" is the feature
 * being demonstrated rather than a result being claimed.
 *
 * Under it:
 *   allowed — statuses, gap labels, days-until-renewal, policy types
 *   banned  — 0–100 scores, percentage grades, portfolio counts, and invented
 *             people to attach them to
 *
 * The agent mocks broke every one of those before this file existed: four Greek
 * surnames carrying scores of 94/68/82/41 under filled progress bars, headlined
 * by "47 Πελάτες · 8 Ανανεώσεις · 12 Ευκαιρίες". The placeholder convention
 * that replaced them — «Πελάτης Α» / «Client A» — is the one BrandedReportWidget
 * already used for insurers, for the identical reason.
 */

/**
 * Comments are stripped before scanning — the fixes below are documented in
 * comments that necessarily quote the values they removed, and a guard that
 * fires on its own rationale is a guard nobody keeps. Blanking rather than
 * deleting preserves line numbers so a failure still points at the right line.
 */
const strip = (src: string) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/^(\s*)\/\/.*$/gm, '$1')

const MOCK_FILES = [
    'components/landing/AgentWidgets.tsx',
    'components/landing/AudienceTabs.tsx',
    'components/landing/PolicyWalletWidget.tsx',
    // The REAL app screens the hero, the audience tabs and «Γιατί τώρα» show
    // since 2026-09-03: real components on fixture data, stamped as samples.
    'components/landing/real-screens/RealScreens.tsx',
]

/**
 * Invented Greek surnames. Real people's names in a product shot are a claim
 * about a customer we do not have; a reader cannot tell them from a real book.
 */
/**
 * NOTE the lookahead instead of `\b`. JavaScript's `\b` is defined on ASCII
 * word characters, so a boundary never exists after a Greek letter and the
 * first version of this pattern matched nothing at all — it reported clean on
 * two names that were live on /solutions/agents. A browser pass caught them;
 * this regex had not.
 */
/**
 * AND note ΐδης/ΐδου (dialytika-tonos iota, U+0390) beside ίδης/ίδου. The
 * suffix list started with the plain-tonos forms only, so «Νικολαΐδης» — one
 * of the four REAL offenders this file was written about — did not match:
 * re-running the matcher against the pre-fix source (15e95fa3~1) during the
 * Phase 6 guard audit reported it clean. The probe block at the bottom keeps
 * that exact line red.
 */
const SURNAME =
    /[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώϊϋΐΰ]+(ίδης|ΐδης|ίδου|ΐδου|όπουλος|οπούλου|άκης|άκη|ίου|ιάδης|ιάδου|ίδη|οπούλου)(?![α-ωάέήίόύώϊϋΐΰ])/

/** The three evidence shapes the main tests scan for, hoisted so the probes
 *  below exercise the very expressions the guard runs — not copies. */
const SCORE_FIELD = /\bscore:\s*\d+/
const SCORE_PERCENT = /\$\{[^}]*score[^}]*\}%/
const PORTFOLIO_SIZE = /\b47\b|\b12 (ευκαιρ|opportunit)/i

describe('public product mocks invent no evidence', () => {
    it('has the mock files it is guarding', () => {
        for (const file of MOCK_FILES) {
            expect(readFileSync(file, 'utf-8').length).toBeGreaterThan(500)
        }
    })

    it('names no invented individual', () => {
        const offenders: string[] = []
        for (const file of MOCK_FILES) {
            strip(readFileSync(file, 'utf-8'))
                .split('\n')
                .forEach((line, i) => {
                    const hit = line.match(SURNAME)
                    if (hit) offenders.push(`${file}:${i + 1} → ${hit[0]}`)
                })
        }
        expect(offenders, `invented people in a product mock:\n${offenders.join('\n')}`).toEqual([])
    })

    it('shows no 0-100 score, grade, or percentage a reader cannot check', () => {
        const offenders: string[] = []
        for (const file of MOCK_FILES) {
            const src = strip(readFileSync(file, 'utf-8'))
            src.split('\n').forEach((line, i) => {
                // A score field, or a percentage bound to one.
                if (SCORE_FIELD.test(line)) offenders.push(`${file}:${i + 1} → ${line.trim().slice(0, 70)}`)
                if (SCORE_PERCENT.test(line)) offenders.push(`${file}:${i + 1} → percentage from a score`)
            })
        }
        expect(offenders, `unverifiable score in a product mock:\n${offenders.join('\n')}`).toEqual([])
    })

    it('claims no portfolio size', () => {
        // The specific invented book — 47 clients, 12 opportunities — in any
        // form: a tile value, a subtitle, or the aria-label describing it.
        const offenders: string[] = []
        for (const file of MOCK_FILES) {
            const src = strip(readFileSync(file, 'utf-8'))
            src.split('\n').forEach((line, i) => {
                if (PORTFOLIO_SIZE.test(line)) {
                    offenders.push(`${file}:${i + 1} → ${line.trim().slice(0, 70)}`)
                }
            })
        }
        expect(offenders, `invented portfolio size:\n${offenders.join('\n')}`).toEqual([])
    })

    it('keeps the lettered placeholder convention in both languages', () => {
        const agent = readFileSync('components/landing/AgentWidgets.tsx', 'utf-8')
        expect(agent).toMatch(/Πελάτης Α/)
        expect(agent).toMatch(/Client A/)
        // The insurer convention this borrowed from must still be there too.
        expect(agent).toMatch(/Ασφαλιστική Α/)
    })

    it('still describes every mock to assistive tech as an example', () => {
        // Removing fabricated data must not quietly remove the framing that
        // tells a screen-reader user this is an illustration, not their data.
        for (const file of MOCK_FILES) {
            const src = readFileSync(file, 'utf-8')
            expect(src, `${file} lost its example framing`).toMatch(/Παράδειγμα|role="img"/)
        }
    })
})

/**
 * The whole public surface, not just the three files above: no other marketing
 * page may reintroduce a protection score. Kept separate so the failure message
 * points at the right rule.
 */
describe('no public page shows a protection score', () => {
    it('renders no two-digit grade out of 100', () => {
        const files = [
            ...globSync('app/(public)/**/*.tsx'),
            ...globSync('components/landing/**/*.tsx'),
            ...globSync('components/public/**/*.tsx'),
        ]
        const offenders: string[] = []
        for (const file of files) {
            const src = strip(readFileSync(file, 'utf-8'))
            src.split('\n').forEach((line, i) => {
                if (SCORE_FIELD.test(line)) offenders.push(`${file}:${i + 1}`)
            })
        }
        expect(offenders, `score on a public page:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * PROBES — the matchers proven red against the exact source this guard was
 * written to keep out: components/landing/AgentWidgets.tsx as it stood before
 * 15e95fa3 removed the invented book. Quoted verbatim (client rows, KPI tiles),
 * not paraphrased — a paraphrase proves the paraphrase.
 *
 * The dialytika case is the reason this block exists: «Νικολαΐδης Γ.» is one
 * of the four names the file's own docstring records, and the original suffix
 * list (ίδης only) reported it CLEAN. A matcher can only be trusted against
 * the offender it failed on.
 */
describe('the matchers are proven against the pre-fix source (15e95fa3~1)', () => {
    const PRE_FIX_LINES = [
        '{ name: t("Νικολαΐδης Γ.", "Nikolaidis G."), policies: t("Αυτοκίνητο + Σπίτι", "Car + Home"), score: 94, badge: t("Ενεργό", "Active"), type: "ok" as const },',
        '{ name: t("Παπαδοπούλου Μ.", "Papadopoulou M."), policies: t("Υγεία", "Health"), score: 68, badge: t("Λήγει σε 8 μέρες", "Runs out in 8 days"), type: "warn" as const },',
        '{ name: t("Καλογεράκης Π.", "Kalogerakis P."), policies: t("Αυτοκίνητο", "Car"), score: 82, badge: t("Ενεργό", "Active"), type: "ok" as const },',
        '{ name: t("Δημητρίου Α.", "Dimitriou A."), policies: t("Κατοικία", "Home"), score: 41, badge: t("Κενό κάλυψης", "Cover gap"), type: "critical" as const },',
    ]

    it('flags every invented person — including the dialytika surname the first list missed', () => {
        for (const line of PRE_FIX_LINES) {
            expect(SURNAME.test(line), line.slice(0, 40)).toBe(true)
        }
        // The one that slipped: plain-tonos ίδης never matches ΐδης.
        expect(SURNAME.test('Νικολαΐδης Γ.')).toBe(true)
        expect(/ίδης/.test('Νικολαΐδης'), 'if this ever matches, Unicode changed under us').toBe(false)
    })

    it('flags the scores and the invented portfolio size', () => {
        for (const line of PRE_FIX_LINES) {
            expect(SCORE_FIELD.test(line), line.slice(0, 40)).toBe(true)
        }
        expect(PORTFOLIO_SIZE.test('{ label: t("Πελάτες", "Clients"), value: "47" },')).toBe(true)
        expect(SCORE_PERCENT.test('style={{ width: `${c.score}%` }}')).toBe(true)
    })

    it('does not flag the placeholder convention that replaced them', () => {
        for (const clean of [
            't("Πελάτης Α", "Client A")',
            't("Ασφαλιστική Α", "Insurer A")',
            '{ label: t("Ανανεώσεις", "Renewals") },',
        ]) {
            expect(SURNAME.test(clean), clean).toBe(false)
            expect(SCORE_FIELD.test(clean), clean).toBe(false)
            expect(PORTFOLIO_SIZE.test(clean), clean).toBe(false)
        }
    })
})
