import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * ALWAYS-DARK SURFACES MUST NOT USE THEMED PAGE-SURFACE CLASSES.
 *
 * This exact defect shipped to production twice, in one component, and was
 * reported twice from a live screenshot:
 *
 *   1. The status chip took its colours from getStatusColor(), which returns
 *      light/dark PAIRS.
 *   2. The three action buttons used .pw-secondary-button, whose colour is
 *      `var(--pw-text-primary-light)` and only flips via `.dark .pw-...`.
 *
 * PolicyHero is #111111 in BOTH themes. A themed page-surface class dropped on
 * it inherits the LIGHT half whenever the app is in light mode — dark text on a
 * near-black card. In dark mode it looks fine, which is why the automated
 * theme sweeps never caught either one.
 *
 * The rule: a surface that is dark regardless of theme needs on-dark variants
 * for everything it contains. This test makes a third instance a build failure
 * rather than a screenshot.
 */

/** Components whose root surface is dark in both themes. */
const ALWAYS_DARK = ['components/wallet/policy-detail/PolicyHero.tsx']

/** Classes and helpers that resolve differently per theme. */
const THEMED = [
    // Page-surface button classes: dark text by default, light only under `.dark`.
    { pattern: /className=["'`][^"'`]*\bpw-(primary|secondary)-button(?!-inverse)\b/, name: 'pw-*-button (use the -inverse variant)' },
    // Returns light/dark pairs — right for a themed card, wrong for a dark hero.
    { pattern: /\bgetStatusColor\s*\(/, name: 'getStatusColor (use getStatusColorOnDark)' },
    // Page-surface tokens.
    { pattern: /className=["'`][^"'`]*\b(bg-background|bg-card|text-foreground|text-muted-foreground|bg-muted)\b/, name: 'themed surface token' },
]

describe('always-dark surfaces', () => {
    for (const file of ALWAYS_DARK) {
        const src = readFileSync(file, 'utf8')

        it(`${file} really is dark in both themes`, () => {
            // If this ever stops being true the whole rule below is moot, so
            // assert the premise rather than leaving it implied.
            expect(src, 'expected a hardcoded dark surface').toMatch(/bg-\[#(111111|0F172A|1A2420)\]/i)
        })

        for (const { pattern, name } of THEMED) {
            it(`${file} does not use ${name}`, () => {
                // Strip comments — this file documents the defect in prose, and
                // the prose legitimately names the classes it warns against.
                const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
                const hit = code.match(pattern)
                expect(
                    hit?.[0] ?? null,
                    `${file} is dark in BOTH themes, so ${name} resolves to its LIGHT value in light mode — dark text on a near-black surface. This shipped twice.`
                ).toBeNull()
            })
        }
    }

    it('the on-dark alternatives exist', () => {
        const css = readFileSync('app/globals.css', 'utf8')
        expect(css, 'pw-secondary-button-inverse must exist').toContain('.pw-secondary-button-inverse')
        const status = readFileSync('lib/policy-status.ts', 'utf8')
        expect(status, 'getStatusColorOnDark must exist').toContain('export function getStatusColorOnDark')
    })
})
