import { describe, expect, it } from 'vitest'
import {
    CITATION_FIELDS,
    CITABLE_ARRAYS,
    arrayCitationKey,
    parseArrayCitationKey,
    isCitableKey,
    sanitizeExtractionSources,
    CITATIONS_PROMPT_SECTION,
} from '@/lib/services/ai/extraction-citations'
import {
    getAnchor,
    measureAnchorCoverage,
    rollUpAnchorCoverage,
} from '@/lib/insurance/anchor-coverage'

/**
 * C3-0 — the citation contract reaches the arrays a capability actually queries.
 *
 * Before this, `sanitizeExtractionSources` tested membership with
 * `new Set(CITATION_FIELDS).has(field)` — exact equality against nine top-level
 * scalars. There was no key that could mean "the third condition", so a
 * capability requiring evidence before taking a stance would have returned
 * `cannot_determine` for every query it ever answered: shipped, correct and
 * useless.
 *
 * The PROBE block reimplements the old predicate and asserts it drops the new
 * keys, which is what makes this a change rather than a decoration.
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

    it('accepts the scalar set unchanged, so nothing regressed', () => {
        for (const f of CITATION_FIELDS) expect(isCitableKey(f)).toBe(true)
    })

    it('every citable array is reachable through the predicate', () => {
        expect(CITABLE_ARRAYS.length).toBeGreaterThanOrEqual(2)
        for (const a of CITABLE_ARRAYS) expect(isCitableKey(arrayCitationKey(a, 0))).toBe(true)
    })
})

describe('the sanitizer keeps member citations and still drops junk', () => {
    it('keeps a well-formed member citation', () => {
        const out = sanitizeExtractionSources({ 'conditions[0]': { page: 7, snippet: SNIPPET } })
        expect(out).not.toBeNull()
        expect(out!['conditions[0]'].snippet).toBe(SNIPPET)
        expect(out!['conditions[0]'].page).toBe(7)
    })

    it('drops a member key for an array nobody declared citable', () => {
        expect(sanitizeExtractionSources({ 'beneficiaries[0]': { snippet: SNIPPET } })).toBeNull()
    })

    it('drops an entry with neither page nor snippet, as before', () => {
        expect(sanitizeExtractionSources({ 'conditions[0]': {} })).toBeNull()
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

describe('the model is told about the keys, or it will never emit them', () => {
    it('the prompt names every citable array and shows the key shape', () => {
        for (const a of CITABLE_ARRAYS) expect(CITATIONS_PROMPT_SECTION).toContain(a)
        expect(CITATIONS_PROMPT_SECTION).toMatch(/name\[index\]/)
        expect(CITATIONS_PROMPT_SECTION).toMatch(/conditions\[0\]/)
    })

    it('and is still told never to invent a snippet', () => {
        expect(CITATIONS_PROMPT_SECTION).toMatch(/Never invent a snippet/)
    })
})

describe('PROBE — the old predicate is shown to drop exactly what this adds', () => {
    /** `sanitizeExtractionSources`'s membership test before C3-0, verbatim. */
    const oldPredicate = (field: string) => new Set<string>(CITATION_FIELDS).has(field)

    it('the old exact-membership test rejects every member key', () => {
        for (const a of CITABLE_ARRAYS) {
            const key = arrayCitationKey(a, 0)
            expect(oldPredicate(key), `${key} would have been dropped`).toBe(false)
            expect(isCitableKey(key), `${key} must now be kept`).toBe(true)
        }
    })

    it('so a condition citation could not have been stored at all', () => {
        // The concrete consequence: C3 had no evidence to read, for any policy,
        // however well the model cited. This is the finding C3-0 exists to fix.
        const dropped = Object.keys({ 'conditions[0]': { snippet: SNIPPET } }).filter(
            (k) => !oldPredicate(k)
        )
        expect(dropped).toEqual(['conditions[0]'])
    })

    it('and the scalar behaviour is untouched by the widening', () => {
        for (const f of CITATION_FIELDS) expect(oldPredicate(f)).toBe(isCitableKey(f))
    })
})
