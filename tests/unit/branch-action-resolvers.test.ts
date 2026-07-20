import { describe, expect, it } from 'vitest'

import { ACTION_RESOLVERS, resolveBranchAction } from '@/lib/insurance/content/action-resolvers'
import { RICH_BRANCH_CONTENT } from '@/lib/insurance/content'
import type { BranchAction } from '@/lib/insurance/content/types'

/** Minimal stand-in for an authored action — only `id` is read by the resolver. */
function action(id: string): BranchAction {
    return { id, label: { el: '', en: '' }, href: null, ctaType: 'askAi' }
}

function resolve(id: string, acord: unknown) {
    return resolveBranchAction(action(id), acord)
}

describe('resolveBranchAction — answered/ask matrix', () => {
    it('motor_check_roadside answers on a positive flag and carries the hotline', () => {
        const result = resolve('motor_check_roadside', {
            vehicle: { hasRoadsideAssistance: true, roadsideAssistancePhone: '210 123 4567' },
        })
        expect(result.status).toBe('answered')
        expect(result.value?.el).toBeTruthy()
        expect(result.phone).toBe('210 123 4567')
    })

    it('motor_check_roadside does NOT infer cover from a quoted hotline alone', () => {
        // Greek motor policies routinely print the insurer's 24h accident-care
        // («φροντίδα ατυχήματος») line, which is not roadside assistance.
        // Answering off the phone would tell a driver they are covered and let
        // them discover otherwise at the roadside.
        const result = resolve('motor_check_roadside', { vehicle: { roadsideAssistancePhone: '1158' } })
        expect(result.status).toBe('ask')
        expect(result.phone).toBeUndefined()
    })

    it('motor_check_glass answers on the canonical and the legacy alias', () => {
        expect(resolve('motor_check_glass', { vehicle: { glassBreakage: true } }).status).toBe('answered')
        expect(resolve('motor_check_glass', { motor: { glassBreakage: true } }).status).toBe('answered')
    })

    it('home_check_earthquake answers on canonical, legacy alias, and attaches assistance phone', () => {
        expect(resolve('home_check_earthquake', { property: { earthquakeCoverageIncluded: true } }).status).toBe(
            'answered'
        )
        expect(resolve('home_check_earthquake', { home: { catastropheCoverage: { earthquake: true } } }).status).toBe(
            'answered'
        )
        expect(
            resolve('home_check_earthquake', {
                property: { earthquakeCoverageIncluded: true, technicalAssistancePhone: '11880' },
            }).phone
        ).toBe('11880')
    })

    it('home_check_value formats the insured value as currency', () => {
        const result = resolve('home_check_value', { property: { insuredValue: 180000 } })
        expect(result.status).toBe('answered')
        expect(result.value?.el).toContain('180')
        expect(result.value?.en).toContain('180')
    })

    it('health_check_oop answers on an out-of-pocket max and carries the coordination centre', () => {
        const result = resolve('health_check_oop', {
            health: { outOfPocketMax: 1500, coordinationCentre: { name: 'X', phone: '210 999 0000' } },
        })
        expect(result.status).toBe('answered')
        expect(result.phone).toBe('210 999 0000')
    })

    it('pet resolvers answer on direct vet payment and an annual limit', () => {
        expect(resolve('pet_check_vet', { pet: { directVetPayment: true } }).status).toBe('answered')
        expect(resolve('pet_check_waits', { pet: { annualLimit: 1200 } }).status).toBe('answered')
        expect(resolve('pet_check_waits', { pet: { annualLimitTotal: 1200 } }).status).toBe('answered')
    })

    it('life resolvers answer on death benefit, maturity date and named beneficiaries', () => {
        expect(resolve('life_check_sum', { lifeAndInvestment: { deathBenefit: 100000 } }).status).toBe('answered')

        const maturity = resolve('life_check_duration', { lifeAndInvestment: { maturityDate: '2040-06-30' } })
        expect(maturity.status).toBe('answered')
        expect(maturity.value?.en).toContain('2040')

        const beneficiaries = resolve('life_check_beneficiaries', {
            lifeAndInvestment: { beneficiaries: ['Μαρία Π.'] },
        })
        expect(beneficiaries.status).toBe('answered')
        expect(beneficiaries.value?.el).toContain('Μαρία')

        expect(resolve('life_check_beneficiaries', { beneficiaries: [{ name: 'Nikos K.' }] }).status).toBe('answered')
    })

    it('unmapped action ids always stay ask-AI', () => {
        expect(resolve('motor_trip_prep', { vehicle: { hasRoadsideAssistance: true } }).status).toBe('ask')
        expect(resolve('this_id_does_not_exist', { vehicle: { hasRoadsideAssistance: true } }).status).toBe('ask')
    })
})

describe('D7 honesty law — defaulted booleans never render as an answered "no"', () => {
    // These fields are z.boolean().default(false): after parsing, "not
    // extracted" and "extracted as absent" are indistinguishable. A false MUST
    // degrade to ask-AI, never to «Οδική βοήθεια: Όχι».
    const defaultedBooleanCases: Array<[string, unknown]> = [
        ['motor_check_roadside', { vehicle: { hasRoadsideAssistance: false } }],
        ['home_check_earthquake', { property: { earthquakeCoverageIncluded: false } }],
        ['home_check_earthquake', { property: { fireCoverageIncluded: false, floodCoverageIncluded: false } }],
        ['pet_check_vet', { pet: { directVetPayment: false } }],
        ['motor_check_glass', { vehicle: { glassBreakage: false } }],
    ]

    it.each(defaultedBooleanCases)('%s with a falsy flag resolves to ask, with no value', (id, acord) => {
        const result = resolve(id as string, acord)
        expect(result.status).toBe('ask')
        expect(result.value).toBeUndefined()
        expect(result.phone).toBeUndefined()
    })

    it('never answers off a truthy-but-not-true value', () => {
        // A string "false"/"yes" from a sloppy extractor must not be coerced.
        expect(resolve('motor_check_glass', { vehicle: { glassBreakage: 'false' } }).status).toBe('ask')
        expect(resolve('pet_check_vet', { pet: { directVetPayment: 1 } }).status).toBe('ask')
    })

    it('never answers off a zero or negative amount', () => {
        expect(resolve('home_check_value', { property: { insuredValue: 0 } }).status).toBe('ask')
        expect(resolve('life_check_sum', { lifeAndInvestment: { deathBenefit: -1 } }).status).toBe('ask')
        expect(resolve('health_check_oop', { health: { outOfPocketMax: 0 } }).status).toBe('ask')
    })

    it('never answers off a blank string', () => {
        expect(resolve('motor_check_roadside', { vehicle: { roadsideAssistancePhone: '   ' } }).status).toBe('ask')
        expect(resolve('life_check_duration', { lifeAndInvestment: { maturityDate: '' } }).status).toBe('ask')
        expect(resolve('life_check_beneficiaries', { beneficiaries: [{ name: '  ' }] }).status).toBe('ask')
    })
})

describe('malformed input degrades to ask without throwing', () => {
    const junk: unknown[] = [
        undefined,
        null,
        {},
        [],
        'not an object',
        42,
        { vehicle: null },
        { vehicle: 'nope' },
        { lifeAndInvestment: { beneficiaries: 'Maria' } },
        { pet: { annualLimit: Number.NaN } },
        { lifeAndInvestment: { maturityDate: 'definitely-not-a-date' } },
        { beneficiaries: [null, undefined] },
    ]

    it.each(junk.map((value, i) => [i, value] as const))('case %i resolves every mapped id to ask', (_i, value) => {
        for (const id of Object.keys(ACTION_RESOLVERS)) {
            const result = resolveBranchAction(action(id), value)
            expect(result.status).toBe('ask')
        }
    })
})

describe('resolver keys stay in sync with the authored bundles', () => {
    const authoredActionIds = new Set(
        Object.values(RICH_BRANCH_CONTENT).flatMap((content) =>
            content.recommendedActions.map((recommended) => recommended.id)
        )
    )

    it('every ACTION_RESOLVERS key is a real BranchAction.id in some bundle', () => {
        const orphans = Object.keys(ACTION_RESOLVERS).filter((id) => !authoredActionIds.has(id))
        expect(orphans).toEqual([])
    })

    it('covers the branches that have a typed acordData section', () => {
        // travel / cyber / business (and the future liability, legal_expenses)
        // have NO typed section — every action there is `ask` by construction.
        for (const branch of ['travel', 'cyber', 'business']) {
            for (const recommended of RICH_BRANCH_CONTENT[branch].recommendedActions) {
                expect(ACTION_RESOLVERS[recommended.id]).toBeUndefined()
            }
        }
    })
})
