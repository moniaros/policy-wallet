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
const SURNAME =
    /[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώϊϋΐΰ]+(ίδης|ίδου|όπουλος|οπούλου|άκης|άκη|ίου|ιάδης|ιάδου|ίδη|οπούλου)(?![α-ωάέήίόύώϊϋΐΰ])/

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
                if (/\bscore:\s*\d+/.test(line)) offenders.push(`${file}:${i + 1} → ${line.trim().slice(0, 70)}`)
                if (/\$\{[^}]*score[^}]*\}%/.test(line)) offenders.push(`${file}:${i + 1} → percentage from a score`)
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
                if (/\b47\b|\b12 (ευκαιρ|opportunit)/i.test(line)) {
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
                if (/\bscore:\s*\d+/.test(line)) offenders.push(`${file}:${i + 1}`)
            })
        }
        expect(offenders, `score on a public page:\n${offenders.join('\n')}`).toEqual([])
    })
})
