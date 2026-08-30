import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

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

/**
 * ENUMERATED AND TRIAGED, not hardcoded.
 *
 * This guard used to name one file — `PolicyHero.tsx`. When the Goal 2
 * restructure deleted that component the guard would have gone green by having
 * nothing left to check: the exact failure mode this repo has been bitten by
 * three times ("a guard that scopes itself to known locations guards those
 * locations, not the invariant").
 *
 * It now finds every file containing a hardcoded dark surface colour and
 * compares that set against a committed snapshot, so a NEW one cannot appear
 * without a human classifying it. Classification matters because containing a
 * dark literal is not the same as being an always-dark surface: most of the
 * files below are themed pages with one dark element (a CTA, a bottom bar),
 * where `pw-secondary-button` elsewhere in the file is perfectly correct. Only
 * files listed in `FULLY_DARK` are subject to the themed-class rule.
 */
const DARK_SURFACE = /bg-\[#(111111|0F172A|1A2420)\]/i

function filesWithDarkSurface(): string[] {
    const out: string[] = []
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.next') continue
                walk(full)
            } else if (entry.name.endsWith('.tsx') && DARK_SURFACE.test(readFileSync(full, 'utf8'))) {
                out.push(full)
            }
        }
    }
    for (const root of ['components', 'app']) walk(root)
    return out.sort()
}

/**
 * Files that contain a dark surface literal, triaged as MIXED — a themed page
 * or shell with one dark element. Not subject to the rule below; listed so that
 * a thirteenth file forces someone to look rather than slipping in unexamined.
 */
const MIXED_SURFACE_FILES = [
    'app/(protected)/wallet/[id]/loading.tsx',
    'app/auth/auth-code-error/page.tsx',
    'app/auth/forgot-password/page.tsx',
    'app/auth/handover/page.tsx',
    'app/auth/reset-password/page.tsx',
    'app/auth/signin/page.tsx',
    'app/auth/signup/SignupForm.tsx',
    'app/auth/signup/confirmation/page.tsx',
    'app/auth/verify-email/page.tsx',
    'components/landing/WorldClassLanding.tsx',
    'components/shell/AppShell.tsx',
]

/**
 * Components whose ROOT surface is dark in both themes, so everything inside
 * them needs on-dark variants.
 *
 * Empty since Goal 2: the policy page's head is a themed `.pw-card`, so the
 * hazard is absent by construction rather than merely unguarded. The rule stays
 * armed for the next one.
 */
const FULLY_DARK: string[] = []

const ALWAYS_DARK = FULLY_DARK

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

    it('no untriaged dark surface has appeared', () => {
        const found = filesWithDarkSurface()
        const known = [...MIXED_SURFACE_FILES, ...FULLY_DARK].sort()
        expect(
            found,
            'a file gained a hardcoded dark surface colour. Classify it: add it to ' +
                'FULLY_DARK if the whole component is dark in both themes (the rule then ' +
                'applies to it), or to MIXED_SURFACE_FILES if it is a themed surface with ' +
                'one dark element.'
        ).toEqual(known)
    })

    /**
     * THE PROBE. Without it, an empty `ALWAYS_DARK` (which is the state today)
     * would make every assertion above vacuous and this file would pass whether
     * or not the detector still works.
     */
    it('the detector still recognises a violation', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/always-dark-themed-class.tsx.txt', 'utf8')
        expect(DARK_SURFACE.test(probe), 'probe must look like an always-dark surface').toBe(true)
        const code = probe.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
        const caught = THEMED.filter(({ pattern }) => pattern.test(code)).map((t) => t.name)
        expect(caught, 'every themed-class rule must fire on the probe').toEqual(THEMED.map((t) => t.name))
    })

    it('the on-dark alternatives exist', () => {
        const css = readFileSync('app/globals.css', 'utf8')
        expect(css, 'pw-secondary-button-inverse must exist').toContain('.pw-secondary-button-inverse')
        const status = readFileSync('lib/policy-status.ts', 'utf8')
        expect(status, 'getStatusColorOnDark must exist').toContain('export function getStatusColorOnDark')
    })
})
