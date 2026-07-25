import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The canonical GapCard is "neutral by design — severity values are unvalidated"
 * (see components/wallet/gap-report/GapCard.tsx). AnalysisCard's own gap list
 * contradicted that: it rendered EVERY gap in alarming red (red bg/border, a
 * red-500 AlertTriangle, red title/text), ignoring the gap's severity — so a
 * low-severity finding looked as critical as an uninsured compulsory line,
 * over-alarming and losing the priority signal. The gap card must be neutral
 * (the recommendation keeps its amber highlight). The file legitimately uses red
 * elsewhere (failed-analysis states), so this checks only the gap-render region.
 */
const SRC = readFileSync('app/(protected)/wallet/[id]/AnalysisCard.tsx', 'utf-8')

function gapRenderRegion(): string {
    const start = SRC.indexOf('uniqueGaps.map((gap)')
    expect(start, 'gap render (uniqueGaps.map) not found').toBeGreaterThan(-1)
    // The gap card markup (container → icon → title → explanation → actions)
    // fits comfortably within this window.
    return SRC.slice(start, start + 2600)
}

describe('AnalysisCard renders gaps neutrally, not as uniform red alarms', () => {
    it('the gap card uses no alarming red palette', () => {
        const region = gapRenderRegion()
        expect(region, 'gap card still uses a red background').not.toMatch(/bg-red-(50|500)/)
        expect(region, 'gap title/text is still red').not.toMatch(/text-red-(700|900|100|300)/)
        expect(region, 'gap card border is still red').not.toMatch(/border-red-/)
    })

    it('the gap container is the neutral GapCard-style surface', () => {
        expect(SRC).toContain('bg-white dark:bg-white/5 p-5 rounded-xl border border-black/10 dark:border-white/15')
    })
})
