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

    it('titles unknown vocabulary with the AI\'s own Greek sentence, so two unknown gaps never read alike', () => {
        // Before: every unmapped slug of the same mechanic got ONE generic
        // heading, so a report full of unknown gaps was a wall of identical cards.
        const a = resolveGapContent('brand-new-ai-vocabulary-a', {
            aiExplanationEl: 'Το συμβόλαιο δεν καλύπτει ζημιές από παγετό. Δείτε τον όρο 7.',
        })
        const b = resolveGapContent('brand-new-ai-vocabulary-b', {
            aiExplanationEl: 'Δεν προβλέπεται κάλυψη ρυμούλκησης εκτός Αττικής.',
        })

        expect(a.known).toBe(false)
        expect(b.known).toBe(false)
        expect(a.titleEl).toMatch(GREEK_TEXT)
        expect(a.titleEl).not.toBe(b.titleEl)
        expect(a.titleEl).toBe('Το συμβόλαιο δεν καλύπτει ζημιές από παγετό.')
        // Still never the raw English slug.
        expect(a.titleEl).not.toMatch(/vocabulary/i)
    })

    it('groups gaps by the policy branch, not by the words in the slug', () => {
        // `fire` on a car is a vehicle cover — a motor policy has no "property" gaps.
        expect(resolveGapContent('fire', { lineOfBusiness: 'motor' }).coverageArea).toBe('vehicle')
        expect(resolveGapContent('fire', { lineOfBusiness: 'home' }).coverageArea).toBe('property')
        // Health keeps the fine-grained areas that make the grouping useful.
        expect(resolveGapContent('high-deductible', { lineOfBusiness: 'health' }).coverageArea).toBe('hospital')
    })
})

// The report that triggered this fix: a real motor policy on 2026-07-14 whose
// six AI gap slugs were ALL unmapped, so all six rendered under the single
// generic heading «Σημείο προσοχής στην κάλυψη» — six cards, one sentence.
describe('prod motor report (Sentry POLICYWALLET-7)', () => {
    const PROD_MOTOR_SLUGS = [
        'theft',
        'fire',
        'glass-breakage',
        'own-damage',
        'own-vehicle-damage',
        'malicious-acts-terrorism',
    ]

    it('maps every slug the motor policy produced', () => {
        for (const slug of PROD_MOTOR_SLUGS) {
            const content = resolveGapContent(slug, { lineOfBusiness: 'motor' })
            expect(content.known, slug).toBe(true)
            expect(content.titleEl, slug).toMatch(GREEK_TEXT)
            expect(content.coverageArea, slug).toBe('vehicle')
        }
        expect(captureMessage).not.toHaveBeenCalled()
    })

    it('renders five distinct findings — no two cards say the same thing', () => {
        const items = dedupeGaps(
            PROD_MOTOR_SLUGS.map((slug) => ({
                id: slug,
                aiExplanationEl: `Ελληνική εξήγηση για ${slug}`,
                definition: { slug },
            }))
        )

        // own-damage ≡ own-vehicle-damage: one finding, two AI spellings.
        expect(items).toHaveLength(5)

        const titles = items.map(
            (item) => resolveGapContent(item.normalizedSlug, { lineOfBusiness: 'motor' }).titleEl
        )
        expect(new Set(titles).size).toBe(titles.length)
    })
})

describe('concept dedupe', () => {
    it('collapses vocabulary aliases from different producers', () => {
        // The AI names the missing cover; the seeded rule prefixes the branch.
        const motorTheft = dedupeGaps([
            { id: 'ai', aiExplanationEl: 'Δεν καλύπτεται η κλοπή.', definition: { slug: 'theft' } },
            { id: 'rule', aiExplanationEl: null, definition: { slug: 'motor-theft' } },
        ])
        expect(motorTheft).toHaveLength(1)
        expect(motorTheft[0].id).toBe('ai') // the one with Greek text wins
        expect(motorTheft[0].duplicateIds).toEqual(['rule'])
        expect(motorTheft[0].concept).toBe('theft')

        // Two slugs that already rendered under one identical Greek title.
        const maternity = dedupeGaps([
            { id: 'a', aiExplanationEl: 'x', definition: { slug: 'maternity-exclusion' } },
            { id: 'b', aiExplanationEl: null, definition: { slug: 'pregnancy-exclusion' } },
        ])
        expect(maternity).toHaveLength(1)
        expect(maternity[0].concept).toBe('maternity-exclusion')
    })

    it('still keeps genuinely different findings apart', () => {
        const deduped = dedupeGaps([
            { id: 'a', aiExplanationEl: 'x', definition: { slug: 'theft' } },
            { id: 'b', aiExplanationEl: 'y', definition: { slug: 'fire' } },
            { id: 'c', aiExplanationEl: 'z', definition: { slug: 'glass-breakage' } },
        ])
        expect(deduped).toHaveLength(3)
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
