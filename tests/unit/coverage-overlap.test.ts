import { describe, expect, it } from 'vitest'
import { detectOverlap, type OverlapPolicyInput } from '@/lib/wallet/coverage-overlap'
import {
    canonicalCoverageKey,
    normaliseCoverageName,
    COVERAGE_KEY_LABELS,
    SYNONYM_MAP_VERSION,
} from '@/lib/insurance/coverage-synonyms'

/**
 * C1 — cross-policy overlap.
 *
 * FALSIFIABILITY. `lib/wallet/coverage-overlap.ts` and
 * `lib/insurance/coverage-synonyms.ts` did not exist before this item, and
 * nothing in `lib/wallet/` (27 files) did cross-policy work — so every
 * assertion here fails on pre-change code by construction. The interesting
 * criteria are not "does it find an overlap" but the two ways it could
 * manufacture a false one, which have their own blocks below.
 */

const group: OverlapPolicyInput = {
    policyId: 'pol_group',
    coverages: [
        { name: 'Νοσοκομειακή περίθαλψη', status: 'included' },
        { name: 'Εξωνοσοκομειακή περίθαλψη', status: 'included' },
        { name: 'Επίδομα νοσηλείας', status: 'included' },
        { name: 'Κάλυψη εξωτερικού συνεργάτη Β2', status: 'included' }, // unmappable
    ],
}
const personal: OverlapPolicyInput = {
    policyId: 'pol_personal',
    coverages: [
        { name: 'Νοσηλεία σε νοσοκομείο', status: 'included' },
        { name: 'Οδοντιατρική περίθαλψη', status: 'included' },
        { name: 'Ειδικό πρόγραμμα ΧΥΖ-2', status: 'included' }, // unmappable
    ],
}

describe('the ομαδικό/ατομικό case this exists for', () => {
    const r = detectOverlap(group, personal)

    it('produces a report at all', () => {
        expect(r.status).toBe('determined')
    })

    it('finds the benefit both policies hold under different wordings', () => {
        // «Νοσοκομειακή περίθαλψη» vs «Νοσηλεία σε νοσοκομείο» — the motivating pair.
        expect(r.status === 'determined' && r.value.bothPolicies).toEqual(['hospital_care'])
    })

    it('reports what only one side holds', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        expect(r.value.onlyA.sort()).toEqual(['hospital_cash_benefit', 'outpatient_care'])
        expect(r.value.onlyB).toEqual(['dental'])
    })

    it('surfaces both unmappable terms rather than dropping them', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        expect(r.value.unmapped.map((u) => u.raw).sort()).toEqual([
            'Ειδικό πρόγραμμα ΧΥΖ-2',
            'Κάλυψη εξωτερικού συνεργάτη Β2',
        ])
        // and each one says which policy it came from, so the reader can look
        expect(new Set(r.value.unmapped.map((u) => u.policyId))).toEqual(
            new Set(['pol_group', 'pol_personal'])
        )
    })

    it('states its assumptions to the reader, including the unmapped count', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        expect(r.assumptions.join(' ')).toMatch(/όχι στους όρους τους/)
        expect(r.assumptions.join(' ')).toMatch(/2 καλύψεις δεν αναγνωρίστηκαν/)
    })

    it('pins the vocabulary version that produced the finding', () => {
        expect(r.status === 'determined' && r.value.synonymMapVersion).toBe(SYNONYM_MAP_VERSION)
    })

    it('labels every reported key in both locales — no raw key reaches a reader', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        for (const k of [...r.value.bothPolicies, ...r.value.onlyA, ...r.value.onlyB]) {
            expect(r.value.labels[k], `${k} unlabelled`).toEqual(COVERAGE_KEY_LABELS[k])
        }
    })
})

describe('the two ways this could manufacture a false duplicate', () => {
    it('a benefit DECLINED on one policy is not an overlap', () => {
        // The single easiest false "you are paying twice" to ship.
        const declined = detectOverlap(group, {
            policyId: 'pol_x',
            coverages: [
                { name: 'Νοσοκομειακή περίθαλψη', status: 'optional_not_taken' },
                { name: 'Οδοντιατρική περίθαλψη', status: 'excluded' },
            ],
        })
        expect(declined.status === 'determined' && declined.value.bothPolicies).toEqual([])
    })

    it('a cash benefit is not hospital care, though both say «νοσηλ»', () => {
        // «Επίδομα νοσηλείας» pays the insured per night; «νοσηλεία» indemnifies
        // the bill. Holding both is ordinary. A substring match merges them.
        expect(canonicalCoverageKey('Επίδομα νοσηλείας')).toBe('hospital_cash_benefit')
        expect(canonicalCoverageKey('Νοσηλεία σε νοσοκομείο')).toBe('hospital_care')
        const r = detectOverlap(
            { policyId: 'a', coverages: [{ name: 'Επίδομα νοσηλείας' }] },
            { policyId: 'b', coverages: [{ name: 'Δαπάνες νοσηλείας' }] }
        )
        expect(r.status === 'determined' && r.value.bothPolicies).toEqual([])
    })
})

describe('an absent coverage list is not an absence of overlap', () => {
    it('returns cannot_determine, naming what was missing', () => {
        const r = detectOverlap(group, { policyId: 'pol_empty', coverages: [] })
        expect(r.status).toBe('cannot_determine')
        if (r.status !== 'cannot_determine') throw new Error('expected cannot_determine')
        expect(r.reason).toBe('field_not_extracted')
        expect(r.missing).toEqual(['pol_empty.coverages'])
    })

    it('and never reports an empty overlap for it', () => {
        // "we could not compare" must not render like "they share nothing".
        const r = detectOverlap({ policyId: 'a', coverages: null }, { policyId: 'b', coverages: null })
        expect(r.status).toBe('cannot_determine')
    })
})

describe('the map is accent- and case-insensitive, and honest about not knowing', () => {
    it('matches regardless of accents or case', () => {
        expect(canonicalCoverageKey('ΝΟΣΟΚΟΜΕΙΑΚΗ ΠΕΡΙΘΑΛΨΗ')).toBe('hospital_care')
        expect(canonicalCoverageKey('νοσοκομειακη περιθαλψη')).toBe('hospital_care')
        expect(normaliseCoverageName('Εξω-νοσοκομειακή  Περίθαλψη!')).toBe('εξω νοσοκομειακη περιθαλψη')
    })

    it('returns null for a wording it was never taught', () => {
        expect(canonicalCoverageKey('Κάλυψη ΧΨΩ')).toBeNull()
        expect(canonicalCoverageKey('')).toBeNull()
    })

    it('covers only health — widening is a reviewed item, not a loop decision', () => {
        for (const motorOrHome of ['Ίδιες ζημιές', 'Κλοπή οχήματος', 'Σεισμός', 'Αστική ευθύνη']) {
            expect(canonicalCoverageKey(motorOrHome), `${motorOrHome} must stay unmapped`).toBeNull()
        }
    })
})
