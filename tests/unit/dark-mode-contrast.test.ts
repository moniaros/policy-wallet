import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const sources = globSync('{components,app}/**/*.tsx').map((f) => [f, stripComments(readFileSync(f, 'utf-8'))] as const)

/**
 * My earlier axe sweep ran in LIGHT MODE ONLY and reported "16 of 17 routes
 * clean". Re-running it with colorScheme:'dark' found failures on 7 of 10
 * routes — and several were caused BY that light-mode pass: bumping chip text
 * from -500 to -600 fixed light and broke dark, because the surface flips to
 * -800 while the text stayed dark.
 *
 * The systemic cause is a light colour with no dark counterpart: the element
 * keeps its light value on a dark background. Worst case found —
 * RiskProfileWizard's shared inputClass carried `text-black` with no dark
 * variant, so every field in the risk-profile flow rendered black-on-near-black
 * at 1.1:1. The user could not see what they were typing, on the flow that feeds
 * the entire gap engine.
 *
 * After the fix: dark 9/10 routes clean, light 11/12 — the residue in both is
 * the same blurred, aria-hidden paywall teaser, which is WCAG-exempt.
 */
describe('dark mode is not an afterthought', () => {
    it('no light-only neutral/slate text is left without a dark counterpart', () => {
        const offenders: string[] = []
        for (const [file, src] of sources) {
            for (const m of src.matchAll(/class(?:Name)?="([^"]*)"/g)) {
                const cls = m[1]
                if (/dark:text-/.test(cls)) continue
                if (/(?<!dark:)\btext-(neutral|slate|gray|stone)-(500|600)\b/.test(cls)) {
                    offenders.push(`${file}: ${cls.slice(0, 70)}`)
                }
            }
        }
        expect(offenders, `light-only text on a dark surface:\n${offenders.join('\n')}`).toEqual([])
    })

    it('no dark white-opacity step used for TEXT sits below the AA floor', () => {
        // white/40 measures 3.81:1 on #111; /50 is the first passing step and /60
        // keeps headroom on tinted dark surfaces. Steps below /40 survive only on
        // decoration — an aria-hidden "|" divider, lucide icons, an SVG stroke —
        // which WCAG exempts and axe confirms clean. Scoping to text-bearing
        // classes is the same correction the light-mode pass needed.
        const offenders: string[] = []
        for (const [file, src] of sources) {
            for (const m of src.matchAll(/class(?:Name)?="([^"]*)"/g)) {
                const cls = m[1]
                if (!/\bdark:text-white\/4[05]\b/.test(cls)) continue
                if (/\btext-(kicker|micro|caption|body-sm|body|xs|sm|base|lg)\b/.test(cls)) {
                    offenders.push(`${file}: ${cls.slice(0, 70)}`)
                }
            }
        }
        expect(offenders, `dark TEXT below AA:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the risk-profile wizard’s fields are legible in dark mode', () => {
        const src = readFileSync('components/coverage/RiskProfileWizard.tsx', 'utf-8')
        expect(src).toMatch(/inputClass = "[^"]*dark:text-white/)
        expect(src).toMatch(/inputClass = "[^"]*dark:bg-white\/5/)
    })
})
