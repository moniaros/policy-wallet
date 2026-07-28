import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('app/globals.css', 'utf-8')

/**
 * The design system defines its own rule in app/globals.css: kicker (10px) and
 * micro (11px) exist "for decorative uppercase labels and pills ONLY", and
 * caption (12px) is "the smallest FUNCTIONAL size".
 *
 * Rendered pages broke it. Measured in a browser, four sentences sat at 11px on
 * /dashboard and two on /coverage-insights — including the risk-communication
 * qualifier «Οι προτεραιότητες… δεν αποτελούν οριστική αξιολόγηση κινδύνου»,
 * added earlier in this same session. That sentence is the one that stops a
 * priority badge reading as a verdict on someone's risk; setting it at the
 * smallest, most skippable size undercut the fix it was part of.
 *
 * All promoted to text-caption. Re-measured: 0 sentences ≤11px on all three.
 */
describe('the type scale means what it says', () => {
    it('still documents micro/kicker as decorative and caption as functional', () => {
        expect(css).toMatch(/decorative uppercase labels and pills ONLY/)
        expect(css).toMatch(/--text-caption: 0\.75rem;\s*\/\* 12px — smallest FUNCTIONAL size/)
    })

    it('sets the risk-priority qualifier at a functional size on every surface', () => {
        const surfaces = [
            'components/dashboard/home/CoverageGapsWidget.tsx',
            'components/coverage/CoverageInsightsClient.tsx',
            'components/coverage/RecommendationCards.tsx',
            'app/(protected)/opportunities/OpportunitiesClient.tsx',
        ]
        for (const file of surfaces) {
            const src = readFileSync(file, 'utf-8')
            // This guards the TYPE SCALE (caption, not micro), so it must not
            // also pin the colour: the muted colour moved from the ad-hoc
            // text-black/55 pair to the text-muted-foreground token, which is
            // the same intent at a better contrast ratio.
            const MUTED = String.raw`(text-black\/55|text-muted-foreground)`
            expect(src, `${file}: qualifier must not be micro`)
                .not.toMatch(new RegExp(`text-micro leading-snug ${MUTED}`))
            expect(src, `${file}: qualifier at caption`)
                .toMatch(new RegExp(`text-caption leading-snug ${MUTED}`))
        }
    })

    it('keeps functional plan and task copy above the decorative sizes', () => {
        const meter = readFileSync('components/monetization/UsageMeter.tsx', 'utf-8')
        // The hint explains what a plan buys — functional.
        expect(meter).toMatch(/\{hint && <p className="mt-1\.5 text-caption/)
        // The label above it is a short uppercase eyebrow — micro is correct there.
        expect(meter).toMatch(/text-micro font-bold uppercase tracking-wider/)

        const checklist = readFileSync('components/dashboard/GettingStartedChecklist.tsx', 'utf-8')
        expect(checklist).toMatch(/mt-0\.5 text-caption text-black\/60/)
    })
})
