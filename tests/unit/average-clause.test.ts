import { describe, expect, it } from 'vitest'
import { detectAverageClause, type AverageClauseInput } from '@/lib/insurance/average-clause'

/**
 * C2a — the average clause as a FACT the document states.
 *
 * The contract deliberately differs from the build spec, and the difference is
 * the point of the item. The spec returns `{ present: boolean; … }`, which
 * allows `{ present: false }` as a DETERMINED result — "we looked, there is no
 * average clause". This capability cannot support that sentence: in Greek home
 * policies the clause routinely lives in the Γενικοί Όροι booklet, a separate
 * document the customer often never uploads.
 *
 * Telling a reader their sum insured carries no proportional penalty, when we
 * merely did not find one, is the most expensive false reassurance in this
 * track — υπασφάλιση understates what someone is owed at the moment they claim,
 * and a reader told there is no average clause stops asking. So the value type
 * carries no boolean: a type that cannot express the unsafe answer cannot
 * accidentally return it.
 */

const ANCHORED = (text: string, snippet = text): AverageClauseInput => ({
    policyId: 'pol_1',
    conditions: [{ text, breachEffect: 'reduces_claim' }],
    acordData: {
        conditions: [{ text }],
        extraction: { sources: { 'conditions[0]': { page: 12, snippet } } },
    },
})

describe('a clause that is there, and quotable', () => {
    const CLAUSE =
        'Σε περίπτωση υπασφάλισης εφαρμόζεται ο αναλογικός κανόνας και η αποζημίωση μειώνεται αναλόγως.'
    const r = detectAverageClause(ANCHORED(CLAUSE))

    it('is a determined finding', () => {
        expect(r.status).toBe('determined')
    })

    it('quotes the clause and carries the anchor', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        expect(r.value.clauseText).toBe(CLAUSE)
        expect(r.value.location.snippet).toBe(CLAUSE)
        expect(r.value.location.page).toBe(12)
        expect(r.value.location.fieldKey).toBe('conditions[0]')
    })

    it('names the term that matched, so the finding is traceable', () => {
        // This clause contains BOTH «υπασφάλισης» and «αναλογικός κανόνας». The
        // matcher reports the first term in authored order, which makes the
        // result deterministic rather than dependent on where in the sentence a
        // term happens to fall.
        expect(r.status === 'determined' && r.value.matchedTerm).toBe('αναλογικος κανονας')
    })

    it('and the reported term is the authored order, not the sentence order', () => {
        const reversed = detectAverageClause(
            ANCHORED('Ο αναλογικός κανόνας εφαρμόζεται σε κάθε υπασφάλιση.')
        )
        expect(reversed.status === 'determined' && reversed.value.matchedTerm).toBe(
            'αναλογικος κανονας'
        )
    })

    it('carries the breach effect the extraction recorded, never inferred', () => {
        expect(r.status === 'determined' && r.value.breachEffect).toBe('reduces_claim')
    })

    it('directs the reader to their insurer and computes nothing', () => {
        if (r.status !== 'determined') throw new Error('expected determined')
        const said = r.assumptions.join(' ')
        expect(said).toMatch(/ελέγξτε το με τον ασφαλιστή ή τον σύμβουλό σας/)
        // C2b is gated; nothing here may hint a shortfall figure is coming.
        expect(said).not.toMatch(/€|ευρώ|θα υπολογίσουμε|εκτίμηση/)
    })
})

describe('NOT FINDING ONE IS NEVER "there is none"', () => {
    it('a policy with clean conditions returns cannot_determine, not a negative finding', () => {
        const r = detectAverageClause({
            policyId: 'pol_2',
            conditions: [{ text: 'Ο συναγερμός πρέπει να είναι ενεργός όταν το ακίνητο είναι κενό.' }],
            acordData: { conditions: [{}] },
        })
        expect(r.status).toBe('cannot_determine')
        if (r.status !== 'cannot_determine') throw new Error('expected cannot_determine')
        expect(r.reason).toBe('field_not_extracted')
    })

    it('a policy with nothing extracted at all also returns cannot_determine', () => {
        const r = detectAverageClause({ policyId: 'pol_3', conditions: [], exclusions: [] })
        expect(r.status).toBe('cannot_determine')
    })

    it('the value type cannot express a negative finding at all', () => {
        // Structural, not behavioural: there is no `present` field to set false.
        const r = detectAverageClause(ANCHORED('Εφαρμόζεται ο αναλογικός κανόνας.'))
        if (r.status !== 'determined') throw new Error('expected determined')
        expect(Object.keys(r.value).sort()).toEqual([
            'breachEffect', 'clauseText', 'location', 'matchedTerm',
        ])
        expect('present' in r.value).toBe(false)
    })
})

describe('a clause we cannot quote is not a stance', () => {
    it('matching wording with no citation returns no_evidence_anchor', () => {
        const r = detectAverageClause({
            policyId: 'pol_4',
            conditions: [{ text: 'Εφαρμόζεται ο αναλογικός κανόνας σε περίπτωση υπασφάλισης.' }],
            acordData: { conditions: [{}] }, // no extraction.sources
        })
        expect(r.status).toBe('cannot_determine')
        if (r.status !== 'cannot_determine') throw new Error('expected cannot_determine')
        expect(r.reason).toBe('no_evidence_anchor')
        expect(r.missing).toEqual(['pol_4.extraction.sources'])
    })

    it('a page number without a snippet is not a citation', () => {
        const r = detectAverageClause({
            policyId: 'pol_5',
            conditions: [{ text: 'Εφαρμόζεται ο αναλογικός κανόνας.' }],
            acordData: {
                conditions: [{}],
                extraction: { sources: { 'conditions[0]': { page: 3 } } },
            },
        })
        expect(r.status === 'cannot_determine' && r.reason).toBe('no_evidence_anchor')
    })
})

describe('the matcher does not fire on ordinary uses of «αναλογία»', () => {
    it.each([
        'Τα ασφάλιστρα κατανέμονται αναλογικά ανά δόση.',
        'Η αναλογία συμμετοχής του ασφαλισμένου ορίζεται στο 20%.',
        'Σε περίπτωση συνασφάλισης, κάθε ασφαλιστής ευθύνεται κατά την αναλογία του.',
    ])('does not report an average clause for: %s', (text) => {
        // «αναλογία» alone appears in premium apportionment, co-insurance shares
        // and instalments. Matching it would report an average clause on policies
        // that have none — a false positive on the most consequential finding here.
        expect(detectAverageClause(ANCHORED(text)).status).toBe('cannot_determine')
    })

    it('but does fire on the real collocations', () => {
        for (const t of [
            'Ισχύει ο αναλογικός κανόνας.',
            'Σε υπασφάλιση, η αποζημίωση μειώνεται.',
            'Εφαρμόζεται αναλογική μείωση της αποζημίωσης.',
        ]) {
            expect(detectAverageClause(ANCHORED(t)).status, t).toBe('determined')
        }
    })
})

describe('exclusions are searched too, with the same anchor rule', () => {
    it('finds a clause in exclusions[] when it is cited', () => {
        const r = detectAverageClause({
            policyId: 'pol_6',
            exclusions: ['Δεν καλύπτεται το μέρος της ζημιάς που αναλογεί σε υπασφάλιση.'],
            acordData: {
                exclusions: ['x'],
                extraction: { sources: { 'exclusions[0]': { snippet: 'υπασφάλιση' } } },
            },
        })
        expect(r.status).toBe('determined')
        expect(r.status === 'determined' && r.value.location.fieldKey).toBe('exclusions[0]')
    })
})
