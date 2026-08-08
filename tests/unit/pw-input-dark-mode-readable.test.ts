import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Text typed into a `.pw-input` must be readable in dark mode.
 *
 * The utility set a background for both schemes but no text colour, leaving it
 * to the caller. The public pages remembered (`text-[#0F172A] dark:text-white`);
 * the auth forms supplied only the light half. Result: every field on sign-in,
 * sign-up and password reset rendered #0F172A on neutral-800 — **1.22:1**, so a
 * visitor in dark mode could not read the email address they were typing, at
 * the one moment the product asks them to type carefully. Measured after the
 * fix: 14.63:1.
 *
 * Two things have to stay true, and this pins both:
 *  1. the utility itself defines the colour for BOTH schemes, so a new caller
 *     inherits a readable field without knowing any of this;
 *  2. nobody re-pins the light colour without its dark partner — `:where()`
 *     keeps the utility at specificity 0, so a caller's own `text-…` wins and
 *     would silently reintroduce exactly this bug.
 */
describe('.pw-input is readable in both colour schemes', () => {
    const css = readFileSync('app/globals.css', 'utf-8')

    it('the utility defines a text colour for light AND dark', () => {
        const base = css.match(/:where\(\.pw-input\)\s*\{[\s\S]*?\}/)?.[0] ?? ''
        const dark = css.match(/:where\(\.dark \.pw-input\)\s*\{[\s\S]*?\}/)?.[0] ?? ''
        expect(base, ':where(.pw-input) must set a text colour').toMatch(/text-\[#0F172A\]|text-neutral-9|text-slate-9/)
        expect(dark, ':where(.dark .pw-input) must set a text colour').toMatch(/text-white|text-neutral-[01]/)
    })

    it('no caller pins the light text colour without a dark partner', () => {
        const collect = (dir: string): string[] =>
            readdirSync(dir).flatMap((name) => {
                const p = join(dir, name)
                if (statSync(p).isDirectory()) return collect(p)
                return p.endsWith('.tsx') ? [p] : []
            })

        const files = [...collect('app'), ...collect('components')]
        expect(files.length).toBeGreaterThan(100)

        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            // Any string that applies pw-input and a light text colour must
            // carry the dark counterpart in the same class string.
            //
            // `[^"\n]` and not `[^"]`: allowing newlines let a match start at
            // some unrelated quote pages earlier and swallow everything up to
            // the class string, so the guard silently matched nothing and
            // passed against the very bug it exists to catch.
            for (const m of src.matchAll(/"([^"\n]*\bpw-input\b[^"\n]*)"/g)) {
                const cls = m[1]
                if (!/text-\[#0F172A\]/.test(cls)) continue
                expect
                    .soft(cls, `${file}: "${cls}" pins the light text colour with no dark: partner — it beats the zero-specificity utility and the field goes unreadable in dark mode`)
                    .toMatch(/dark:text-/)
            }
        }
    })
})
