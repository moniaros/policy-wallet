import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { selectFreePreviewGapIds, gapSeverityRank, type GapReportItem } from '@/lib/wallet/gap-report'

const item = (id: string, severity: string | null, titleEl = id): GapReportItem => ({
    id,
    slug: id,
    duplicateIds: [],
    severity: severity as any,
    content: { titleEl, known: true } as any,
    aiExplanation: null,
    aiExplanationEl: null,
    aiSuggestion: null,
    aiSuggestionEl: null,
})

/**
 * A free-tier owner sees the first FREE_GAP_PREVIEW_COUNT gaps of the per-policy
 * report; the rest are locked behind a €3 unlock. The boundary used to fall on
 * coverage-area order then alphabetical Greek title — severity played no part —
 * so a CRITICAL gap (an uninsured compulsory line) could be the one hidden while
 * three trivial gaps showed free. Someone could stay blind to a legal exposure
 * unless they paid.
 */
describe('the free gap preview surfaces the most severe gaps', () => {
    it('keeps a critical gap free even when it sorts last by title', () => {
        // Ωμέγα starts with the last letter of the Greek alphabet — under the old
        // alphabetical boundary it was locked. It is the critical one.
        const items = [
            item('a', 'low', 'Αlpha'),
            item('b', 'low', 'Βeta'),
            item('c', 'medium', 'Γamma'),
            item('critical', 'critical', 'Ωμέγα'),
        ]
        const free = selectFreePreviewGapIds(items, 3)
        expect(free.has('critical')).toBe(true)
        // …and the lowest-severity gap is the one dropped from the free set.
        expect(free.size).toBe(3)
        expect([...free].filter((id) => id === 'a' || id === 'b').length).toBeLessThan(2)
    })

    it('orders the free set critical → high → medium → low', () => {
        const items = [
            item('low', 'low'),
            item('crit', 'critical'),
            item('high', 'high'),
            item('med', 'medium'),
        ]
        const free = selectFreePreviewGapIds(items, 2)
        expect(free.has('crit')).toBe(true)
        expect(free.has('high')).toBe(true)
        expect(free.has('low')).toBe(false)
    })

    it('is a stable tiebreak within a severity band (caller order wins)', () => {
        const items = [item('first', 'high'), item('second', 'high'), item('third', 'high')]
        const free = selectFreePreviewGapIds(items, 2)
        expect(free.has('first')).toBe(true)
        expect(free.has('second')).toBe(true)
        expect(free.has('third')).toBe(false)
    })

    it('ranks an unknown severity below every graded one', () => {
        expect(gapSeverityRank('critical')).toBeLessThan(gapSeverityRank('low'))
        expect(gapSeverityRank('low')).toBeLessThan(gapSeverityRank(null))
        expect(gapSeverityRank('nonsense')).toBe(gapSeverityRank(undefined))
        // An ungraded gap must not be shown over a graded one.
        const free = selectFreePreviewGapIds([item('x', null), item('y', 'low')], 1)
        expect(free.has('y')).toBe(true)
        expect(free.has('x')).toBe(false)
    })

    it('frees everything when the count meets or exceeds the gaps', () => {
        const items = [item('a', 'low'), item('b', 'high')]
        expect(selectFreePreviewGapIds(items, 5).size).toBe(2)
    })
})

/**
 * The same defect lived on the aggregate coverage-insights page, which ordered
 * gaps by detectedAt and sliced for free users — showing the two most RECENT
 * gaps, not the two most severe. Guarded at source: the slice must be preceded
 * by a severity sort.
 */
describe('both gap surfaces cut by severity, not arrival order', () => {
    it('the per-policy list locks by the severity selector, not a flat index', () => {
        const src = readFileSync('components/wallet/gap-report/GapReportList.tsx', 'utf-8')
        const uncommented = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        expect(uncommented).toMatch(/selectFreePreviewGapIds\(/)
        expect(uncommented).not.toMatch(/flatIndex\s*>=\s*FREE_GAP_PREVIEW_COUNT/)
    })

    it('the aggregate page sorts by severity before slicing the free preview', () => {
        const src = readFileSync('components/coverage/CoverageInsightsClient.tsx', 'utf-8')
        const uncommented = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        expect(uncommented).toMatch(/gapSeverityRank\(a\.severity\)\s*-\s*gapSeverityRank\(b\.severity\)/)
        // The raw detectedAt-order slice must be gone.
        expect(uncommented).not.toMatch(/visibleGaps\.slice\(0,\s*maxVisibleInsights\)/)
    })
})
