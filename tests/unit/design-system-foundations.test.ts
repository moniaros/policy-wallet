import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Guardrail for the shared design-system foundations.
 *
 * These four defects were each fixed wholesale once (1,083 arbitrary type sizes,
 * 92 ad hoc page widths, 68 hand-picked card paddings, 9 mobile-hostile grids).
 * Without a gate they creep straight back one component at a time, because the
 * raw Tailwind utility is always the path of least resistance. This fails the
 * build on the first regression instead of the hundredth.
 */

const SRC = ['app', 'components']

/**
 * Returns whole matching LINES (not just the matched token) — the filters below
 * need the surrounding class string to tell a responsive grid from a broken one.
 */
function grep(pattern: string): string[] {
    try {
        const out = execFileSync(
            'grep',
            ['-rnE', pattern, ...SRC, '--include=*.tsx'],
            { encoding: 'utf8' }
        )
        return out.trim().split('\n').filter(Boolean)
    } catch {
        return [] // grep exits 1 when there are no matches
    }
}

describe('design-system foundations', () => {
    it('uses the type ladder, not arbitrary pixel sizes', () => {
        const hits = grep(String.raw`text-\[[0-9]+px\]`)
        expect(
            hits,
            `Use a ladder step (text-kicker|micro|caption|body-sm|body|body-lg|lead|title|h3|h2|h1|display) ` +
            `instead of a raw pixel size. Offenders:\n${hits.slice(0, 10).join('\n')}`
        ).toEqual([])
    })

    it('uses the density steps, not hand-picked card padding', () => {
        const hits = grep(String.raw`pw-card p-[0-9]`)
        expect(
            hits,
            `Use pw-pad-tight | pw-pad | pw-pad-roomy so cards tighten on small screens. ` +
            `Offenders:\n${hits.slice(0, 10).join('\n')}`
        ).toEqual([])
    })

    it('does not render 3+ column grids at mobile width', () => {
        // A decorative aria-hidden bar meter is legitimately 3-up at any width;
        // anything with text needs a responsive prefix.
        const hits = grep(String.raw`grid-cols-[3-9]`)
            .filter((l) => !/(sm|md|lg|xl):grid-cols/.test(l))
            .filter((l) => !/gap-1\.5/.test(l)) // password-strength meter
        expect(
            hits,
            `Three columns at 375px leaves ~105px per cell. Add a responsive prefix ` +
            `(grid-cols-2 sm:grid-cols-3). Offenders:\n${hits.join('\n')}`
        ).toEqual([])
    })

    it('defines every ladder step and container token exactly once', () => {
        const css = readFileSync('app/globals.css', 'utf8')
        const steps = ['kicker','micro','caption','body-sm','body','body-lg','lead','title','h3','h2','h1','display']
        for (const s of steps) {
            const decls = css.match(new RegExp(`^\\s*--text-${s}:`, 'gm')) ?? []
            expect(decls.length, `--text-${s} should be declared once, found ${decls.length}`).toBe(1)
        }
        for (const c of ['reading','form','page','page-wide']) {
            const decls = css.match(new RegExp(`^\\s*--container-${c}:`, 'gm')) ?? []
            expect(decls.length, `--container-${c} should be declared once, found ${decls.length}`).toBe(1)
        }
    })

    it('keeps functional type at 12px or above', () => {
        const css = readFileSync('app/globals.css', 'utf8')
        // caption is the documented floor for text a user must read.
        expect(css).toMatch(/--text-caption:\s*0\.75rem/)
        // kicker/micro sit below it and are decorative-only by contract.
        expect(css).toMatch(/--text-kicker:\s*0\.625rem/)
        expect(css).toMatch(/--text-micro:\s*0\.6875rem/)
    })
})
