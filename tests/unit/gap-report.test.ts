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
    pickCanonicalGapDefinition,
    resolveGapConcept,
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

    it('maps the liability/business/disability slugs (Sentry POLICYWALLET-7)', () => {
        const slugs = [
            'employer-liability-gap', 'employers-liability', 'professional-liability',
            'professional-liability-gap', 'product-liability', 'cyber-liability',
            'cyber-risk-gap', 'fire-explosion-liability-gap', 'vehicle-vessel-aircraft-liability-gap',
            'communicable-disease-liability', 'communicable-disease-gap', 'elevator-maintenance-risk',
            'low-liability-limits', 'family-exclusion-gap', 'waiting-period-disability', 'missing-policy-details',
        ]
        for (const slug of slugs) {
            const content = resolveGapContent(slug)
            expect(content.known, slug).toBe(true)
            expect(content.titleEl, slug).toMatch(GREEK_TEXT)
        }
        expect(captureMessage).not.toHaveBeenCalled()
    })

    it('collapses alias slug pairs onto one concept (dedupe key)', () => {
        expect(resolveGapContent('employers-liability').concept).toBe(resolveGapContent('employer-liability-gap').concept)
        expect(resolveGapContent('professional-liability').concept).toBe(resolveGapContent('professional-liability-gap').concept)
        expect(resolveGapContent('cyber-liability').concept).toBe(resolveGapContent('cyber-risk-gap').concept)
        expect(resolveGapContent('communicable-disease-gap').concept).toBe(resolveGapContent('communicable-disease-liability').concept)
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

    // Regression: these three existed ONLY in the production database — never
    // in the seed, never in the map — so nothing in the repo could catch them.
    // All three had live gap instances, so real users read a generic fallback
    // heading instead of the finding (Sentry POLICYWALLET-7, 68 events).
    it('covers the gap definitions that exist only in the production DB', () => {
        for (const slug of ['no-glass-breakage', 'own-damage-gap', 'preventive-care-gap']) {
            const content = resolveGapContent(slug)
            expect(content.known, slug).toBe(true)
            expect(content.titleEl, slug).toMatch(GREEK_TEXT)
        }
        expect(captureMessage).not.toHaveBeenCalled()
    })

    // The user-visible half of that defect: each of the two motor slugs has a
    // twin definition that ALSO fires, so without a shared concept the report
    // renders two cards for one finding.
    it('collapses the DB-only motor slugs onto their existing concept', () => {
        expect(resolveGapConcept('no-glass-breakage')).toBe(resolveGapConcept('glass_breakage'))
        expect(resolveGapConcept('own-damage-gap')).toBe(resolveGapConcept('own_damage'))
        expect(resolveGapConcept('own-damage-gap')).toBe(resolveGapConcept('own_vehicle_damage'))
        // preventive-care-gap is genuinely new — it must NOT be folded into an
        // unrelated concept just to silence the warning.
        expect(resolveGapConcept('preventive-care-gap')).toBe('preventive-care')
    })

    // The anti-mint half of the auto-created-definition fix: an AI vocabulary
    // variant must attach to the EXISTING definition for its concept instead of
    // minting a new row that joins every future prompt for the LoB.
    describe('pickCanonicalGapDefinition', () => {
        const def = (slug: string, isActive = true, created = '2026-07-14') =>
            ({ slug, isActive, createdAt: new Date(created) })

        it('matches the exact slug back to itself', () => {
            const glass = def('glass_breakage')
            expect(pickCanonicalGapDefinition('glass_breakage', [glass, def('theft')])).toBe(glass)
        })

        it('matches a vocabulary variant across snake/kebab and aliases (the no-glass-breakage case)', () => {
            const glass = def('glass_breakage')
            expect(pickCanonicalGapDefinition('no-glass-breakage', [glass, def('theft')])).toBe(glass)
            const own = def('own_vehicle_damage')
            expect(pickCanonicalGapDefinition('own-damage-gap', [own])).toBe(own)
        })

        it('prefers the active twin over an admin-deactivated duplicate', () => {
            const inactive = def('own_damage', false, '2026-07-14')
            const active = def('own_vehicle_damage', true, '2026-07-20')
            expect(pickCanonicalGapDefinition('own-damage-gap', [inactive, active])).toBe(active)
        })

        it('tie-breaks equal-activity matches on the earliest createdAt (the original row)', () => {
            const original = def('glass_breakage', true, '2026-07-14')
            const variant = def('windscreen', true, '2026-07-30')
            expect(pickCanonicalGapDefinition('no-glass-breakage', [variant, original])).toBe(original)
        })

        it('returns null for a genuinely novel concept — it must NOT force-match', () => {
            expect(
                pickCanonicalGapDefinition('totally-new-finding-xyzzy', [def('glass_breakage'), def('theft')])
            ).toBeNull()
        })
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

    it('never titles an unknown gap with the model\'s prose', () => {
        // REVERSED, 2026-08-23. This used to assert the opposite: an unmapped
        // slug took the AI's first Greek sentence as its heading, so that a
        // report full of unknown gaps was not a wall of identical cards.
        //
        // That trade reached further than the card. `recommendation-generator`
        // builds a recommendation title from resolveGapContent and PERSISTS it
        // into recommendation_instances.title, which the dashboard renders as an
        // attention-item heading. Production carries three such rows — one
        // quoting a customer's vehicle model, cut at exactly 80 characters,
        // which is the firstSentence(…, 80) signature.
        //
        // A repeated generic heading is honest. The model's words presented as
        // OUR heading are not. The prose still shows as the body.
        const a = resolveGapContent('brand-new-ai-vocabulary-a', {
            aiExplanationEl: 'Το συμβόλαιο δεν καλύπτει ζημιές από παγετό. Δείτε τον όρο 7.',
        })
        const b = resolveGapContent('brand-new-ai-vocabulary-b', {
            aiExplanationEl: 'Δεν προβλέπεται κάλυψη ρυμούλκησης εκτός Αττικής.',
        })

        expect(a.known).toBe(false)
        expect(b.known).toBe(false)
        expect(a.titleEl).toMatch(GREEK_TEXT)
        // The heading is authored, not quoted.
        expect(a.titleEl).not.toContain('παγετό')
        expect(b.titleEl).not.toContain('ρυμούλκησης')
        expect(a.titleEl).not.toMatch(/vocabulary/i)
        // No trailing full stop: a heading, not a sentence lifted from prose.
        expect(a.titleEl.trim()).not.toMatch(/\.$/)
    })

    it('reports every unknown slug, because repetition is the signal to author it', () => {
        captureMessage.mockClear()
        resolveGapContent('unheard-of-slug-alpha', { aiExplanationEl: 'Κάτι.' })
        resolveGapContent('unheard-of-slug-beta', { aiExplanationEl: 'Κάτι άλλο.' })
        expect(captureMessage).toHaveBeenCalledTimes(2)
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

/**
 * Every slug the clarity pipeline has ACTUALLY emitted in production is authored.
 *
 * The universe here is not invented: it is the full set of `slug` tag values on
 * Sentry POLICYWALLET-7 over its lifetime (first seen 2026-07-14, 114 events,
 * 13 distinct slugs as of 2026-08-23). Enumerating from what the model really
 * produced is the point — a list of slugs someone imagined it might produce
 * would guard nothing.
 *
 * Why an unauthored slug matters, precisely: `resolveGapContent` titles an
 * unknown gap with `firstSentence(aiExplanationEl, 80)`. The authored generic
 * ("Σημείο προσοχής στην κάλυψη") is only reached when there is no AI text at
 * all — so in practice an unauthored slug puts the MODEL's prose in a heading in
 * the customer's wallet. That is the defect, not the missing map entry.
 *
 * Growing this list is the correct response to a new POLICYWALLET-7 tag value.
 */
describe('the slugs production actually emits are all authored', () => {
    const OBSERVED_IN_PRODUCTION = [
        // Motor
        'own-damage-gap',
        'no-own-damage-cover',
        'no-collision-coverage',
        'no-glass-breakage',
        'no-glass-breakage-cover',
        'no-glass-coverage',
        'no-roadside-assistance',
        'missing-accident-declaration-phone',
        // Health
        'no-annual-checkup',
        'preventive-care-gap',
        'no-direct-billing',
        'maternity-coverage',
        'missing-hospital-class',
    ]

    it.each(OBSERVED_IN_PRODUCTION)('%s resolves to authored content', (slug) => {
        expect(resolveGapContent(slug).known).toBe(true)
    })

    it('none of them can be titled with model prose', () => {
        // The failure mode stated as a test: pass AI text alongside each slug and
        // require the heading to stay the authored one.
        const aiText = 'ΑΥΤΟ ΕΙΝΑΙ ΚΕΙΜΕΝΟ ΤΟΥ ΜΟΝΤΕΛΟΥ ΠΟΥ ΔΕΝ ΠΡΕΠΕΙ ΝΑ ΓΙΝΕΙ ΤΙΤΛΟΣ.'
        for (const slug of OBSERVED_IN_PRODUCTION) {
            const content = resolveGapContent(slug, {
                aiExplanationEl: aiText,
                aiExplanation: 'This is model text that must not become a title.',
            })
            expect(content.titleEl, slug).not.toContain('ΜΟΝΤΕΛΟΥ')
            expect(content.titleEn, slug).not.toContain('model text')
        }
    })

    it('reports nothing to Sentry for any of them', () => {
        captureMessage.mockClear()
        OBSERVED_IN_PRODUCTION.forEach((s) => resolveGapContent(s))
        expect(captureMessage).not.toHaveBeenCalled()
    })

    it('the spelling variants still collapse to one finding', () => {
        // Authoring three spellings must not turn one gap into three cards.
        expect(new Set(['no-glass-breakage', 'no-glass-breakage-cover', 'no-glass-coverage']
            .map((s) => resolveGapContent(s).concept)).size).toBe(1)
        expect(new Set(['own-damage-gap', 'no-own-damage-cover', 'no-collision-coverage']
            .map((s) => resolveGapContent(s).concept)).size).toBe(1)
        expect(new Set(['no-annual-checkup', 'preventive-care-gap']
            .map((s) => resolveGapContent(s).concept)).size).toBe(1)
    })

    it('a "missing" finding says NOT RECORDED, never not covered', () => {
        // CLAUDE.md: the `missing` class fires on SILENCE — the document does not
        // state a value. Wording it as absent cover would be a claim the evidence
        // does not support.
        for (const slug of ['missing-hospital-class', 'missing-accident-declaration-phone']) {
            const { titleEl, titleEn } = resolveGapContent(slug)
            expect(titleEl, slug).toContain('Δεν καταγράφεται')
            expect(titleEl, slug).not.toMatch(/έλλειψη|δεν καλύπτεται/i)
            expect(titleEn, slug).toMatch(/not recorded/i)
            expect(titleEn, slug).not.toMatch(/missing cover|not covered/i)
        }
    })
})
