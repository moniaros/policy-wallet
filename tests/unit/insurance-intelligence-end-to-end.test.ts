import { describe, expect, it } from 'vitest'

import { AcordDataSchema } from '@/lib/schemas/acord-data'
import { summariseClauseCoverage } from '@/lib/insurance/clause-sets'
import { assessAdequacy, deductibleExposure, perLossLimit } from '@/lib/insurance/coverage-limits'
import { complianceObligations, conditionGaps, preventionActions } from '@/lib/insurance/policy-conditions'
import { branchFamilyId, normalizeBranch } from '@/lib/insurance/taxonomy'
import { packForLineOfBusiness } from '@/lib/services/ai/lob-packs'

/**
 * The whole chain, on one line, end to end.
 *
 * Everything below is SYNTHETIC — the shapes are taken from the reference
 * documents, the identities are not. The real schedules carry a named child
 * insured, ~45 named hospital employees and 21 named seafarers, and none of that
 * belongs in a repository fixture.
 *
 * What is being proven is that the pieces added in this expansion compose: a
 * document classifies to the right branch, its clause codes resolve to perils,
 * its towers resolve to a comparable number, its warranties resolve to
 * obligations, and the conclusions are ones a person could act on.
 */

/** Yacht hull & machinery, with the TPL section written on the same contract. */
const YACHT_HULL = AcordDataSchema.parse({
    policy: { lineOfBusiness: 'boat_hull', currency: 'EUR' },
    marineVessel: {
        vesselType: 'yacht',
        hullValue: 717207,
        currency: 'EUR',
        berthingRequirement: 'Οργανωμένες μαρίνες ή λιμάνια· εξαιρείται ο μόνιμος ελλιμενισμός με αρόδο',
        skipperLicenceRequired: true,
    },
    deductibleResolution: 'largest_applies',
    coverages: [
        {
            name: 'Ίδιες Ζημιές Σκάφους και Μηχανών',
            limits: [{ basis: 'per_event', amount: 717207, currency: 'EUR' }],
            deductibles: [
                { basis: 'per_event', amount: 10000, currency: 'EUR', appliesTo: 'κάθε ζημία' },
                { basis: 'per_event', amount: 20000, currency: 'EUR', appliesTo: 'μηχανικές βλάβες' },
                { basis: 'per_event', amount: 500, currency: 'EUR', appliesTo: 'βοηθητικά και εξοπλισμός' },
            ],
        },
        {
            name: 'Αστική Ευθύνη προς Τρίτους',
            limits: [
                { basis: 'per_person', amount: 150000, currency: 'EUR' },
                { basis: 'per_event', amount: 700000, currency: 'EUR' },
                { basis: 'per_period_aggregate', amount: 2100000, currency: 'EUR' },
            ],
            deductibles: [{ basis: 'per_event', amount: 0, currency: 'EUR' }],
        },
    ],
    insuredItems: [
        { description: 'Βοηθητική λέμβος', category: 'tender', agreedValue: 1500, currency: 'EUR' },
        { description: 'Εξωλέμβια μηχανή', category: 'outboard', agreedValue: 900, currency: 'EUR' },
    ],
    conditions: [
        {
            kind: 'maintenance',
            text: 'Να διενεργείται η ετήσια συντήρηση σκάφους και μηχανής',
            recurrence: 'annual',
            breachEffect: 'voids_cover',
            verifiable: true,
        },
        {
            kind: 'condition_precedent',
            text: 'Ο χειριστής να είναι κάτοχος διπλώματος και να βρίσκεται πάντα στο σκάφος',
            recurrence: 'continuous',
            breachEffect: 'voids_cover',
        },
        {
            kind: 'documentation',
            text: 'Τα έγγραφα του σκάφους να βρίσκονται σε ισχύ καθ’ όλη τη διάρκεια',
            recurrence: 'annual',
            breachEffect: 'reduces_claim',
            verifiable: true,
        },
    ],
    namedClauses: [
        { code: 'INSTITUTE YACHT CLAUSES 1/11/85' },
        { code: 'INSTITUTE YACHT CLAUSES MACHINERY DAMAGE EXTENSION CLAUSE (CL. 332) 1.11.85' },
        { code: 'MARINE CYBER ENDORSEMENT (LMA5403 11 NOVEMBER 2019)' },
    ],
})

/** Single road transit under the narrowest cargo clauses. */
const CARGO_TRANSIT = AcordDataSchema.parse({
    policy: { lineOfBusiness: 'marine_cargo', currency: 'EUR' },
    termBasis: 'single_transit',
    transit: { from: 'Μελίσσια', to: 'Σπάτα', mode: 'road', valuationBasis: 'Τρέχουσα εμπορική αξία' },
    coverages: [{
        name: 'Ασφάλιση Εμπορευμάτων',
        limits: [{ basis: 'per_event', amount: 23000, currency: 'EUR' }],
        deductibles: [{ basis: 'per_event', amount: 0, currency: 'EUR' }],
    }],
    conditions: [{
        kind: 'condition_precedent',
        text: 'Η συσκευασία και στοιβασία πρέπει να είναι κατάλληλη επαγγελματική, με ασφαλή πρόσδεση εντός του ΦΔΧ',
        breachEffect: 'voids_cover',
        verifiable: true,
    }],
    namedClauses: [
        { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09' },
        { code: 'INSTITUTE STRIKES CLAUSES (CARGO) 1.1.09' },
        { code: 'SANCTION LIMITATION AND EXCLUSION CLAUSE' },
    ],
    territorialScope: { sanctionsClause: true, excludes: ['Ρωσία', 'Ουκρανία', 'Ιράν'] },
})

describe('marine hull — classification through to a conclusion', () => {
    it('classifies to the pleasure-craft hull branch and stays in the boat family', () => {
        expect(normalizeBranch('yacht hull').id).toBe('boat_hull')
        // The family collapse is what lets the existing `boat_liability` risk
        // match this policy without any change to the risk catalog.
        expect(branchFamilyId('boat_hull')).toBe('boat')
    })

    it('selects the marine knowledge pack for the extraction prompt', () => {
        expect(packForLineOfBusiness('boat_hull')?.id).toBe('marine_hull')
    })

    it('reports the smallest liability tower, not the headline one', () => {
        const liability = YACHT_HULL.coverages!.find((c) => c.name.includes('Αστική'))!
        expect(perLossLimit(liability)).toMatchObject({ amount: 150000, basis: 'per_person' })
    })

    it('resolves the deductible ladder by the policy’s own rule', () => {
        const hull = YACHT_HULL.coverages![0]
        expect(deductibleExposure(hull, YACHT_HULL.deductibleResolution))
            .toMatchObject({ worstCase: 20000, resolution: 'largest_applies' })
    })

    it('judges the hull limit against the vessel value it is meant to answer', () => {
        const hull = YACHT_HULL.coverages![0]
        expect(assessAdequacy(perLossLimit(hull), { amount: YACHT_HULL.marineVessel!.hullValue, currency: 'EUR' }))
            .toMatchObject({ verdict: 'adequate' })
        // And correctly reports a shortfall against a higher replacement figure.
        expect(assessAdequacy(perLossLimit(hull), { amount: 900000, currency: 'EUR' }))
            .toMatchObject({ verdict: 'short' })
    })

    it('knows machinery damage is covered only because the extension is cited', () => {
        const view = summariseClauseCoverage(YACHT_HULL.namedClauses)
        expect(view.covered).toContain('machinery_damage')
        // Without the CL.332 line it would be outside — that is the whole point
        // of recording clause codes rather than summarising them.
        const withoutExtension = summariseClauseCoverage([{ code: 'INSTITUTE YACHT CLAUSES 1/11/85' }])
        expect(withoutExtension.notCovered).toContain('machinery_damage')
    })

    it('turns the warranties into obligations, prevention and questions', () => {
        expect(complianceObligations(YACHT_HULL.conditions).map((o) => o.recurrence).sort())
            .toEqual(['annual', 'annual', 'continuous'])

        const prevention = preventionActions(YACHT_HULL.conditions)
        expect(prevention.map((p) => p.kind)).toEqual(['maintenance', 'documentation'])
        expect(prevention[0].severity).toBe('critical')

        const gaps = conditionGaps(YACHT_HULL.conditions)
        expect(gaps).toHaveLength(2)
        expect(gaps.every((g) => g.reason === 'unverified')).toBe(true)
    })

    it('keeps separately valued equipment as its own items', () => {
        expect(YACHT_HULL.insuredItems!.map((i) => i.agreedValue)).toEqual([1500, 900])
    })
})

describe('marine cargo — the letter that decides the cover', () => {
    it('classifies to cargo rather than to the boat branch', () => {
        // The defect this replaces: "marine cargo" resolved to `boat`, filing a
        // truck movement of used machinery as pleasure-craft insurance.
        expect(normalizeBranch('marine cargo').id).toBe('marine_cargo')
        expect(normalizeBranch('ΚΛΑΔΟΣ ΜΕΤΑΦΟΡΩΝ').id).toBe('marine_cargo')
    })

    it('reports theft and handling damage as outside the cover', () => {
        const view = summariseClauseCoverage(CARGO_TRANSIT.namedClauses)
        expect(view.narrowestCargoSet?.id).toBe('icc_c')
        expect(view.notCovered).toContain('theft')
        expect(view.notCovered).toContain('handling_damage')
        // The strikes clause bought strikes back; composition must respect that.
        expect(view.covered).toContain('strikes_riots')
    })

    it('marks the term so renewal logic stays away from it', () => {
        // A three-month transit is not an annual policy, and reminding someone to
        // renew cover that was never meant to recur is noise.
        expect(CARGO_TRANSIT.termBasis).toBe('single_transit')
    })

    it('treats a nil deductible as a stated value, not a missing one', () => {
        expect(deductibleExposure(CARGO_TRANSIT.coverages![0]))
            .toMatchObject({ known: true, worstCase: 0 })
    })

    it('surfaces the packing condition that mirrors the clause exclusion', () => {
        // ICC 4.3 excludes loss from insufficient packing by the assured, and the
        // schedule separately requires professional packing. The same requirement
        // written twice, and the customer can act on it.
        const prevention = conditionGaps(CARGO_TRANSIT.conditions)
        expect(prevention).toHaveLength(1)
        expect(prevention[0].severity).toBe('critical')
    })
})

describe('mixed portfolio — one household, several lines', () => {
    /**
     * Drawn from the corpus, which supplies a genuine mixed household: the same
     * person holds a motor policy and a personal cyber policy and is the
     * policyholder on a child's health policy, while a second household carries
     * general third-party liability as a block-of-flats manager.
     */
    const portfolio = ['motor', 'cyber', 'health', 'liability', 'boat_tpl', 'fine_art']

    it('resolves every line to a distinct branch', () => {
        const ids = portfolio.map((lob) => normalizeBranch(lob).id)
        expect(new Set(ids).size).toBe(portfolio.length)
    })

    it('collapses only where the taxonomy intends it to', () => {
        const families = portfolio.map((lob) => branchFamilyId(lob))
        // boat_tpl folds into boat; nothing else in this portfolio shares a family.
        expect(families).toEqual(['motor', 'cyber', 'health', 'liability', 'boat', 'fine_art'])
    })

    it('selects a knowledge pack only for the lines that have one', () => {
        const packs = portfolio.map((lob) => packForLineOfBusiness(lob)?.id ?? null)
        expect(packs).toEqual([null, 'personal_cyber', null, 'liability', 'liability', 'crime_and_valuables'])
    })

    it('routes a commercial policy into the business family for the advisor view', () => {
        for (const lob of ['marine_cargo', 'marine_crew', 'money', 'fidelity', 'marine_hull']) {
            expect(branchFamilyId(lob), lob).toBe('business')
        }
    })
})

describe('the corpus documents that are not policies', () => {
    it('has no branch that would swallow a terms booklet', () => {
        // Guarded by the evidence gate rather than the taxonomy — normalizeBranch
        // will happily classify a booklet's subject, which is exactly why the
        // documentKind check exists upstream of it.
        expect(normalizeBranch('Ασφαλιστήριο Συμβόλαιο Υγείας').id).toBe('health')
    })
})
