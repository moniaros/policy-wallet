import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const css = readFileSync('app/globals.css', 'utf-8')

/** WCAG relative luminance / contrast ratio. */
const lum = (hex: string) => {
    const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => {
    const [l1, l2] = [lum(a), lum(b)]
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/**
 * An axe sweep over 17 authenticated routes found five distinct serious/critical
 * WCAG violations. These pin the ones that were systemic rather than one-off.
 *
 * The subtle part: pure-white arithmetic said the muted tokens passed (4.76),
 * but the product renders text on tinted card surfaces, where axe measured
 * 4.37–4.48 — under the floor. Both muted tokens therefore need headroom, not
 * a bare pass against #fff.
 */
describe('muted text tokens clear AA with headroom for tinted surfaces', () => {
    const lightToken = (name: string) => {
        // First occurrence is the light-mode block; the dark override follows.
        const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
        return m![1]
    }

    it('--muted-foreground passes on white AND on a 2% tinted card', () => {
        const c = lightToken('muted-foreground')
        expect(ratio(c, '#ffffff')).toBeGreaterThanOrEqual(4.5)
        expect(ratio(c, '#fafafa')).toBeGreaterThanOrEqual(4.5)
    })

    it('--pw-text-muted passes on white AND on a 2% tinted card', () => {
        const c = lightToken('pw-text-muted')
        expect(ratio(c, '#ffffff')).toBeGreaterThanOrEqual(4.5)
        expect(ratio(c, '#fafafa')).toBeGreaterThanOrEqual(4.5)
    })
})

/**
 * The -400 grey ramps measured 2.4–2.6:1 — barely half the AA floor — on small
 * body text (text-micro is 11px, text-kicker 10px).
 */
describe('the failing grey ramps are gone from the UI', () => {
    const sources = globSync('{components,app}/**/*.tsx').map((f) => [f, readFileSync(f, 'utf-8')] as const)

    it('has no light-mode text-neutral-400 or text-slate-400 left', () => {
        // `dark:text-neutral-400` is correct — light grey on a dark background
        // has plenty of contrast. Only the unprefixed light-mode class fails.
        const offenders = sources
            .filter(([, s]) => /(?<!dark:)\btext-(neutral|slate)-400\b/.test(s))
            .map(([f]) => f)
        expect(offenders, `sub-3:1 grey text:\n${offenders.join('\n')}`).toEqual([])
    })

    it('never pairs a -500 text with a -100 chip background (4.34:1)', () => {
        const offenders: string[] = []
        for (const [file, src] of sources) {
            for (const m of src.matchAll(/["'][^"'\n]*["']/g)) {
                const body = m[0]
                if (!/bg-(slate|neutral|gray|stone)-100\b/.test(body)) continue
                if (/(?<!dark:)\btext-(slate|neutral|gray|stone)-500\b/.test(body)) offenders.push(`${file}: ${body.slice(0, 70)}`)
            }
        }
        expect(offenders, `-500 text on a -100 chip:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * Container `opacity` multiplies against every colour inside it, so a perfectly
 * good `text-black/75` became 4.35:1 under an `opacity-70` parent. This is
 * invisible to any class-level audit — the text class alone looks fine.
 *
 * BranchCoverageMap dimmed exactly the tiles a policyholder most needs to read:
 * the branches they hold NO cover in. It now de-emphasises the surface instead.
 */
describe('container opacity does not dim informational text', () => {
    it('BranchCoverageMap marks uncovered branches without dimming their labels', () => {
        const src = readFileSync('components/branches/BranchCoverageMap.tsx', 'utf-8')
        // Match the applied class, not the comment that explains the old bug.
        expect(src).not.toMatch(/"[^"\n]*opacity-70[^"\n]*"/)
        expect(src).toMatch(/entry\.state === "neutral" && "border-dashed/)
    })

    it('the EmptyState preview is not dimmed — it teaches what the feature shows', () => {
        const src = readFileSync('components/ui/EmptyState.tsx', 'utf-8')
        expect(src).not.toMatch(/select-none space-y-2 opacity-80/)
    })

    it('leaves the deliberately blurred paywall teaser alone', () => {
        // Blurred and aria-hidden: unreadable by design, so WCAG-exempt.
        // Un-dimming it would break the locked-content affordance.
        const src = readFileSync('components/monetization/LockedInsightPreview.tsx', 'utf-8')
        expect(src).toMatch(/blur-\[6px\]/)
        expect(src).toMatch(/aria-hidden/)
    })
})
