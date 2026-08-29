import { describe, expect, it } from 'vitest'
import {
    CITABLE_ARRAYS,
    arrayCitationKey,
    parseArrayCitationKey,
} from '@/lib/services/ai/citation-keys'
import {
    getAnchor,
    measureAnchorCoverage,
    rollUpAnchorCoverage,
} from '@/lib/insurance/anchor-coverage'

/**
 * C3-0, SHIPPING HALF — the key convention and the coverage measurement.
 *
 * The other half of C3-0 (widening the extraction PROMPT and the SANITIZER) is
 * held on `feat/growth-extraction-citations` and is NOT covered here. It is the
 * money path: EXTRACTION_CITATIONS=1 is live in production, and the only
 * evidence it is safe comes from the mock provider — which is how the July 2026
 * Gemini incident stayed invisible to CI while extraction was dead in prod.
 *
 * CONSEQUENCE THESE TESTS MUST NOT OBSCURE: with the sanitizer unwidened, member
 * citations are dropped before they are stored, so `getAnchor` finds none in
 * production and any capability requiring evidence returns `cannot_determine`
 * with `no_evidence_anchor`. That is the documented backfill state, not a
 * regression introduced by the split — and it is why the capabilities are
 * foundation only until the held branch lands.
 */

const SNIPPET = 'Ο ασφαλισμένος υποχρεούται να δηλώσει κάθε επίταση του κινδύνου εντός 14 ημερών.'

describe('the key convention is a shared contract, not a local string', () => {
    it('producers and readers build the same key', () => {
        expect(arrayCitationKey('conditions', 3)).toBe('conditions[3]')
        expect(parseArrayCitationKey('conditions[3]')).toEqual({ array: 'conditions', index: 3 })
    })

    it('rejects everything that is not a well-formed member key', () => {
        for (const bad of [
            'conditions[]', 'conditions[-1]', 'conditions[a]', 'conditions[3', 'conditions.3',
            'unknownArray[0]', 'conditions[9999]', '[0]', 'conditions[0][1]',
        ]) {
            expect(parseArrayCitationKey(bad), `${bad} must not parse`).toBeNull()
        }
    })

    it('every citable array round-trips through build and parse', () => {
        expect(CITABLE_ARRAYS.length).toBeGreaterThanOrEqual(2)
        for (const a of CITABLE_ARRAYS) {
            expect(parseArrayCitationKey(arrayCitationKey(a, 0))).toEqual({ array: a, index: 0 })
        }
    })
})

describe('an anchor without a quote is not an anchor', () => {
    const withPageOnly = { conditions: [{}], extraction: { sources: { 'conditions[0]': { page: 4 } } } }
    const withQuote = {
        conditions: [{}],
        extraction: { sources: { 'conditions[0]': { page: 4, snippet: SNIPPET } } },
    }

    it('a page number alone yields no anchor', () => {
        // The reader cannot check a page number against their own document the
        // way they can check a sentence. DocumentAnchor requires the snippet.
        expect(getAnchor(withPageOnly, 'conditions', 0, 'pol_1')).toBeNull()
    })

    it('a quote yields one, carrying the key and the policy', () => {
        const a = getAnchor(withQuote, 'conditions', 0, 'pol_1')
        expect(a).toEqual({ page: 4, snippet: SNIPPET, fieldKey: 'conditions[0]', policyId: 'pol_1' })
    })
})

describe('coverage is measured, so "it grows as policies are re-analysed" is checkable', () => {
    const legacy = { conditions: [{}, {}, {}] } // extracted before the contract widened
    const partial = {
        conditions: [{}, {}, {}],
        extraction: { sources: { 'conditions[1]': { snippet: SNIPPET } } },
    }

    it('a pre-citation policy reads as zero anchored, and says WHY', () => {
        const c = measureAnchorCoverage('pol_legacy', legacy)
        expect(c.members).toBe(3)
        expect(c.anchored).toBe(0)
        // The distinction that makes the metric actionable: this policy predates
        // the contract, it is not a policy the model declined to cite.
        expect(c.predatesCitations).toBe(true)
    })

    it('a partially cited policy reports which members are missing', () => {
        const c = measureAnchorCoverage('pol_partial', partial)
        expect(c.anchored).toBe(1)
        expect(c.predatesCitations).toBe(false)
        expect(c.arrays.find((a) => a.array === 'conditions')!.unanchored).toEqual([0, 2])
    })

    it('the roll-up produces a rate, and null rather than 0/0', () => {
        const roll = rollUpAnchorCoverage([
            measureAnchorCoverage('a', legacy),
            measureAnchorCoverage('b', partial),
        ])
        expect(roll.policies).toBe(2)
        expect(roll.policiesPredatingCitations).toBe(1)
        expect(roll.members).toBe(6)
        expect(roll.anchored).toBe(1)
        expect(roll.rate).toBeCloseTo(1 / 6)
        // An empty corpus must not report 0% coverage — that is a different
        // claim from "nothing to measure", and the all-clear rule applies.
        expect(rollUpAnchorCoverage([]).rate).toBeNull()
    })
})
