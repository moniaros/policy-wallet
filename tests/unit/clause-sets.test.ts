import { describe, expect, it } from 'vitest'

import {
    CLAUSE_SETS,
    interpretClauseSet,
    perilLabel,
    summariseClauseCoverage,
} from '@/lib/insurance/clause-sets'

/**
 * The clause-set table is what lets PolicyWallet say something true about a
 * specialty policy from the one line that actually decides its scope.
 *
 * The corpus case: a road transit of used machinery insured under Institute
 * Cargo Clauses (C). Every visible field on that schedule — insured value,
 * journey, deductible of nil — looks generous. The cover is the narrowest the
 * cargo market writes, and theft on a Greek motorway is not in it.
 */
describe('clause sets — identification', () => {
    it('reads the cargo set as printed on a Greek schedule', () => {
        expect(interpretClauseSet('INSTITUTE CARGO CLAUSES (C) 1.1.09')?.id).toBe('icc_c')
        expect(interpretClauseSet('INSTITUTE CARGO CLAUSES (A) 1.1.09')?.id).toBe('icc_a')
        expect(interpretClauseSet('Institute Cargo Clauses (B)')?.id).toBe('icc_b')
    })

    it('is not fooled by the shared prefix across A, B and C', () => {
        // All three share "institute cargo clauses"; longest-match is what keeps
        // (C) from being reported as (A).
        const c = interpretClauseSet('INSTITUTE CARGO CLAUSES (C) 1.1.09')
        expect(c?.id).toBe('icc_c')
        expect(c?.breadth).toBeLessThan(interpretClauseSet('ICC (A)')!.breadth!)
    })

    it('recognises marine hull and LMA codes', () => {
        expect(interpretClauseSet('INSTITUTE TIME CLAUSES HULLS PORT RISKS (CL. 311) 20/7/87')?.id)
            .toBe('itc_hulls_port_risks')
        expect(interpretClauseSet('MARINE CYBER ENDORSEMENT (LMA5403 11 NOVEMBER 2019)')?.id)
            .toBe('lma5403_marine_cyber')
        expect(interpretClauseSet('TERRITORIAL EXCLUSION: BELARUS, RUSSIA AND UKRAINE (LMA5583A, 26 APRIL 2022)')?.id)
            .toBe('lma5583a_territorial')
    })

    it('recognises the Greek statutory craft-liability basis', () => {
        expect(interpretClauseSet('σύμφωνα με τον Νόμο 4926/2022 ΦΕΚ Α 82-20/4/22')?.id)
            .toBe('greek_recreational_craft_tpl')
    })

    it('returns null for a clause it does not know, rather than guessing', () => {
        expect(interpretClauseSet('PACKAGE SEAL CLAUSE')).toBeNull()
        expect(interpretClauseSet('')).toBeNull()
        expect(interpretClauseSet(null)).toBeNull()
    })
})

describe('clause sets — what ICC (C) leaves out', () => {
    const view = summariseClauseCoverage([
        { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09', effect: 'grants' },
    ])

    it('covers the named major casualties', () => {
        expect(view.covered).toContain('fire_explosion')
        expect(view.covered).toContain('overturning_derailment')
        expect(view.covered).toContain('collision')
        expect(view.covered).toContain('general_average')
    })

    it('reports theft and handling damage as not covered', () => {
        // The single most consequential fact about this policy, and one no field
        // on the schedule states.
        expect(view.notCovered).toContain('theft')
        expect(view.notCovered).toContain('non_delivery')
        expect(view.notCovered).toContain('handling_damage')
        expect(view.notCovered).toContain('water_ingress')
    })

    it('identifies it as the narrowest cargo set cited', () => {
        expect(view.narrowestCargoSet?.id).toBe('icc_c')
    })
})

describe('clause sets — composition across stacked clauses', () => {
    it('lets a later grant beat an earlier exclusion', () => {
        // A cargo policy commonly cites (C) AND a strikes clause. Reading each
        // clause in isolation would report strikes as uncovered when they are
        // precisely what the second clause buys back.
        const view = summariseClauseCoverage([
            { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09', effect: 'grants' },
            { code: 'INSTITUTE STRIKES CLAUSES (CARGO) 1.1.09', effect: 'grants' },
        ])
        expect(view.covered).toContain('strikes_riots')
        expect(view.notCovered).not.toContain('strikes_riots')
        // Theft is still out — nothing bought it back.
        expect(view.notCovered).toContain('theft')
    })

    it('adds machinery damage only when the extension is cited', () => {
        const base = summariseClauseCoverage([{ code: 'INSTITUTE YACHT CLAUSES 1/11/85' }])
        expect(base.notCovered).toContain('machinery_damage')

        const extended = summariseClauseCoverage([
            { code: 'INSTITUTE YACHT CLAUSES 1/11/85' },
            { code: 'INSTITUTE YACHT CLAUSES MACHINERY DAMAGE EXTENSION CLAUSE (CL. 332) 1.11.85' },
        ])
        expect(extended.covered).toContain('machinery_damage')
        expect(extended.notCovered).not.toContain('machinery_damage')
    })

    it('separates the clauses it knows from the ones it does not', () => {
        const view = summariseClauseCoverage([
            { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09' },
            { code: 'SET AND PAIR CLAUSE' },
            { code: 'PACKAGE SEAL CLAUSE' },
        ])
        expect(view.recognised.map((r) => r.id)).toEqual(['icc_c'])
        expect(view.unrecognised).toEqual(['SET AND PAIR CLAUSE', 'PACKAGE SEAL CLAUSE'])
    })

    it('deduplicates a clause cited twice', () => {
        const view = summariseClauseCoverage([
            { code: 'ICC (C)' },
            { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09' },
        ])
        expect(view.recognised).toHaveLength(1)
    })

    it('returns an empty view for a policy with no named clauses', () => {
        const view = summariseClauseCoverage(undefined)
        expect(view.recognised).toEqual([])
        expect(view.covered).toEqual([])
        expect(view.notCovered).toEqual([])
        expect(view.narrowestCargoSet).toBeNull()
    })
})

describe('clause sets — registry integrity', () => {
    it('has unique ids and non-empty bilingual copy', () => {
        const ids = CLAUSE_SETS.map((s) => s.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const set of CLAUSE_SETS) {
            expect(set.label.el.length, set.id).toBeGreaterThan(0)
            expect(set.label.en.length, set.id).toBeGreaterThan(0)
            expect(set.note.el.length, set.id).toBeGreaterThan(0)
            expect(set.note.en.length, set.id).toBeGreaterThan(0)
            expect(set.match.length, set.id).toBeGreaterThan(0)
        }
    })

    it('never both covers and excludes the same peril', () => {
        for (const set of CLAUSE_SETS) {
            for (const peril of set.covers) {
                expect(set.excludes, `${set.id} both covers and excludes ${peril}`).not.toContain(peril)
            }
        }
    })

    it('stores match tokens already lowercased, since matching lowercases the input', () => {
        for (const set of CLAUSE_SETS) {
            for (const token of set.match) {
                expect(token, `${set.id} token "${token}"`).toBe(token.toLowerCase())
            }
        }
    })

    it('labels every peril in both languages', () => {
        const perils = new Set(CLAUSE_SETS.flatMap((s) => [...s.covers, ...s.excludes]))
        for (const peril of perils) {
            expect(perilLabel(peril, 'el').length, peril).toBeGreaterThan(0)
            expect(perilLabel(peril, 'en').length, peril).toBeGreaterThan(0)
        }
    })
})
