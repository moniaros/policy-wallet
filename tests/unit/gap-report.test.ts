import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({
    captureMessage: (...args: any[]) => captureMessage(...args),
}))

import {
    COVERAGE_AREA_ORDER,
    FREE_GAP_PREVIEW_COUNT,
    computeReportUnlocked,
    dedupeGaps,
    firstSentence,
    groupGapsByCoverageArea,
    normalizeGapSlug,
    resolveGapContent,
    summarizeGaps,
    type GapReportItem,
} from '@/lib/wallet/gap-report'

const GREEK_TEXT = /[Α-Ωα-ωάέήίόύώϊϋΐΰ]/

function makeItem(overrides: Partial<GapReportItem> & { slug: string }): GapReportItem {
    return {
        id: overrides.slug,
        duplicateIds: [],
        content: resolveGapContent(overrides.slug),
        aiExplanation: null,
        aiExplanationEl: null,
        aiSuggestion: null,
        aiSuggestionEl: null,
        ...overrides,
    }
}

beforeEach(() => {
    captureMessage.mockClear()
})

describe('normalizeGapSlug', () => {
    it('unifies the prod duplicate pair to one canonical key', () => {
        expect(normalizeGapSlug('mental_health_exclusion')).toBe('mental-health-exclusion')
        expect(normalizeGapSlug('mental-health-exclusion')).toBe('mental-health-exclusion')
    })

    it('handles casing, whitespace and repeated separators', () => {
        expect(normalizeGapSlug('  High__Deductible ')).toBe('high-deductible')
        expect(normalizeGapSlug('usa--copayment-')).toBe('usa-copayment')
        expect(normalizeGapSlug('Usa Copayment')).toBe('usa-copayment')
    })
})

describe('dedupeGaps', () => {
    it('collapses the prod duplicate pair, keeping the instance with the Greek explanation', () => {
        const deduped = dedupeGaps([
            { id: 'a', aiExplanationEl: null, definition: { slug: 'mental-health-exclusion' } },
            { id: 'b', aiExplanationEl: 'Το συμβόλαιο εξαιρεί...', definition: { slug: 'mental_health_exclusion' } },
        ])
        expect(deduped).toHaveLength(1)
        expect(deduped[0].id).toBe('b')
        expect(deduped[0].duplicateIds).toEqual(['a'])
        expect(deduped[0].normalizedSlug).toBe('mental-health-exclusion')
    })

    it('keeps distinct slugs apart and records no duplicates', () => {
        const deduped = dedupeGaps([
            { id: 'a', aiExplanationEl: 'x', definition: { slug: 'high-deductible' } },
            { id: 'b', aiExplanationEl: 'y', definition: { slug: 'usa-copayment' } },
        ])
        expect(deduped).toHaveLength(2)
        expect(deduped.every((g) => g.duplicateIds.length === 0)).toBe(true)
    })
})

describe('resolveGapContent', () => {
    it('returns exact Greek titles for every prod-observed slug', () => {
        const prodSlugs = [
            'high-deductible',
            'mental_health_exclusion',
            'mental-health-exclusion',
            'maternity-exclusion',
            'pregnancy_childbirth_exclusion',
            'low-outpatient-limit',
            'usa-copayment',
            'usa_hospitalization_cost',
            'rehab-exclusion',
            'restrictive_hospital_definition',
            'medical_assistance_age_limit',
            'limited_emergency_care',
        ]
        for (const slug of prodSlugs) {
            const content = resolveGapContent(slug)
            expect(content.known, slug).toBe(true)
            expect(content.titleEl, slug).toMatch(GREEK_TEXT)
        }
        expect(captureMessage).not.toHaveBeenCalled()
    })

    it('covers the seeded definitions', () => {
        for (const slug of [
            'motor-theft',
            'motor-legal',
            'health-outpatient',
            'home-earthquake',
            'missing_enfia_components',
            'missing_coordination_centre',
            'missing_leishmaniasis',
            'green_card_expiring',
            'low_deductible_premium_waste',
        ]) {
            expect(resolveGapContent(slug).known, slug).toBe(true)
        }
    })

    // Acceptance test from the brief: inject a fake key → Greek fallback
    // renders (never the raw slug) and a Sentry event fires exactly once.
    it('falls back to a Greek title and reports unknown slugs to Sentry once', () => {
        const content = resolveGapContent('totally-made-up-gap-xyzzy')
        expect(content.known).toBe(false)
        expect(content.titleEl).toMatch(GREEK_TEXT)
        expect(content.titleEl).not.toMatch(/xyzzy/i)
        expect(captureMessage).toHaveBeenCalledTimes(1)
        expect(captureMessage).toHaveBeenCalledWith(
            'gap-report: unknown gap slug',
            expect.objectContaining({ tags: { slug: 'totally-made-up-gap-xyzzy' } })
        )

        // Same slug again → no second capture (per-process dedupe).
        resolveGapContent('totally-made-up-gap-xyzzy')
        expect(captureMessage).toHaveBeenCalledTimes(1)
    })

    it('applies mechanic/area heuristics to unknown slugs', () => {
        expect(resolveGapContent('foo-bar-copayment-thing')).toMatchObject({
            mechanic: 'cost_sharing',
        })
        expect(resolveGapContent('some-maternity-cap-rule')).toMatchObject({
            mechanic: 'limit',
            coverageArea: 'maternity_mental',
        })
        expect(resolveGapContent('weird-usa-thing')).toMatchObject({ coverageArea: 'abroad' })
        expect(resolveGapContent('unknowable-concept')).toMatchObject({
            mechanic: 'other',
            coverageArea: 'general',
        })
    })
})

describe('groupGapsByCoverageArea / summarizeGaps', () => {
    it('groups in the canonical area order and counts by both dimensions', () => {
        const items = [
            makeItem({ slug: 'unknowable-general-thing' }),
            makeItem({ slug: 'high-deductible' }),
            makeItem({ slug: 'mental-health-exclusion' }),
            makeItem({ slug: 'low-outpatient-limit' }),
        ]
        const groups = groupGapsByCoverageArea(items)
        const areas = groups.map((g) => g.area)
        expect(areas).toEqual(
            COVERAGE_AREA_ORDER.filter((a) => areas.includes(a))
        )
        expect(areas[0]).toBe('hospital')

        const summary = summarizeGaps(items)
        expect(summary.total).toBe(4)
        expect(summary.byMechanic.cost_sharing).toBe(1)
        expect(summary.byMechanic.exclusion).toBe(1)
        expect(summary.byArea.maternity_mental).toBe(1)
    })
})

describe('firstSentence', () => {
    it('takes the first sentence and ellipsizes long text', () => {
        expect(firstSentence('Πρώτη πρόταση. Δεύτερη πρόταση.')).toBe('Πρώτη πρόταση.')
        expect(firstSentence(null)).toBe('')
        const long = 'α'.repeat(200)
        expect(firstSentence(long).length).toBeLessThanOrEqual(140)
    })
})

describe('computeReportUnlocked', () => {
    it.each([
        [{ isOwner: true, tier: 'free' as const, reportUnlockedAt: null }, false],
        [{ isOwner: true, tier: 'free' as const, reportUnlockedAt: '2026-07-13T00:00:00Z' }, true],
        [{ isOwner: true, tier: 'plus' as const, reportUnlockedAt: null }, true],
        [{ isOwner: true, tier: 'pro' as const, reportUnlockedAt: null }, true],
        [{ isOwner: false, tier: 'free' as const, reportUnlockedAt: null }, true],
    ])('%o → %s', (input, expected) => {
        expect(computeReportUnlocked(input)).toBe(expected)
    })

    it('previews a fixed number of gaps', () => {
        expect(FREE_GAP_PREVIEW_COUNT).toBe(3)
    })
})
