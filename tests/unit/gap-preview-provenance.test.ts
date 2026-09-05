import { describe, it, expect, vi } from 'vitest'
import { selectFreePreviewGapIds, type GapReportItem } from '@/lib/wallet/gap-report'

// The static map ships every authored slug as `under_review`, so a legal or
// contractual requirement cannot be observed through it yet. Mock the class
// lookup alone — the ranking and the stable tiebreak are what is under test.
vi.mock('@/lib/gaps/provenance', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/gaps/provenance')>()
    const classOf = (slug: string | null | undefined) =>
        slug === 'legal' ? 'legislative' : slug === 'contract' ? 'contractual' : slug === 'market' ? 'market' : 'under_review'
    // F1: the comparator and the ordering helper bind the module-internal class
    // lookup, which a mocked export cannot reach — rebuild them on classOf, with
    // the ORIGINAL catalogue-index tiebreak, so what this file tests is that the
    // free preview ranks by class, never by title, severity or row order.
    const RANK: Record<string, number> = { legislative: 0, contractual: 1, market: 2, under_review: 3 }
    const compare = (a: string | null | undefined, b: string | null | undefined) => {
        const rank = RANK[classOf(a)] - RANK[classOf(b)]
        if (rank !== 0) return rank
        const ia = original.catalogueIndexOf(a), ib = original.catalogueIndexOf(b)
        return ia === ib ? 0 : ia < ib ? -1 : 1
    }
    const order = <T,>(items: readonly T[], slugOf: (item: T) => string | null | undefined) =>
        items.map((item, index) => ({ item, index, slug: slugOf(item) })).sort((a, b) => compare(a.slug, b.slug) || a.index - b.index).map((x) => x.item)
    return { ...original, provenanceOf: classOf, compareFindingSlugs: compare, orderByProvenance: order }
})

const item = (id: string, slug = id, titleEl = id): GapReportItem => ({
    id,
    slug,
    duplicateIds: [],
    severity: null,
    content: { titleEl, known: true } as any,
    aiExplanation: null,
    aiExplanationEl: null,
    aiSuggestion: null,
    aiSuggestionEl: null,
})

/**
 * A free-tier owner sees the first FREE_GAP_PREVIEW_COUNT gaps of the report;
 * the rest are locked. The boundary follows PROVENANCE (B3): a requirement set
 * by law or contract is never the one hidden behind the unlock while findings
 * still under review show free. Severity is not an input (B1).
 */
describe('the free gap preview follows provenance, not severity', () => {
    it('keeps a legal requirement free even when it sorts last by title and carries no severity', () => {
        const items = [item('a', 'x', 'Αlpha'), item('b', 'y', 'Βeta'), item('c', 'market', 'Γamma'), item('legal', 'legal', 'Ωμέγα')]
        const free = selectFreePreviewGapIds(items, 3)
        expect(free.has('legal')).toBe(true)
        expect(free.has('c')).toBe(true)
        expect(free.size).toBe(3)
    })

    it('orders legislative → contractual → market → under review', () => {
        const items = [item('u', 'unknown'), item('m', 'market'), item('c', 'contract'), item('l', 'legal')]
        const free = selectFreePreviewGapIds(items, 2)
        expect(free.has('l')).toBe(true)
        expect(free.has('c')).toBe(true)
        expect(free.has('u')).toBe(false)
    })

    it('is a stable tiebreak within a class (caller order wins), whatever the severity says', () => {
        const items = [
            { ...item('first', 'p'), severity: 'low' as any },
            { ...item('second', 'q'), severity: 'critical' as any },
            { ...item('third', 'r'), severity: 'high' as any },
        ]
        const free = selectFreePreviewGapIds(items, 2)
        expect(free.has('first')).toBe(true)
        expect(free.has('second')).toBe(true)
        expect(free.has('third')).toBe(false)
    })
})
