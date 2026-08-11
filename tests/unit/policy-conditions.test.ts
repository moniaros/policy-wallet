import { describe, expect, it } from 'vitest'

import {
    complianceObligations,
    conditionGaps,
    conditionSeverity,
    isPreventable,
    preventionActions,
} from '@/lib/insurance/policy-conditions'

/**
 * Conditions of cover, and the three findings they produce.
 *
 * The fixture is the Brownwater and cash-in-safe wordings from the reference
 * corpus, because they are where the shape is clearest: nine ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ
 * whose breach removes cover, alongside security requirements that are
 * simultaneously the prevention advice and the term of the contract.
 */
const CONDITIONS = [
    {
        kind: 'maintenance' as const,
        text: 'WARRANTED THAT ANNUAL SERVICING WILL BE CARRIED OUT IN ACCORDANCE WITH MAKER’S INSTRUCTIONS',
        recurrence: 'annual' as const,
        breachEffect: 'voids_cover' as const,
        verifiable: true,
    },
    {
        kind: 'security_requirement' as const,
        text: 'Ύπαρξη συστήματος συναγερμού συνδεδεμένου με Κέντρο Λήψης Σημάτων',
        recurrence: 'continuous' as const,
        breachEffect: 'voids_cover' as const,
        verifiable: true,
    },
    {
        kind: 'documentation' as const,
        text: 'Τηρείται αναλυτικό μητρώο καταχωρήσεων των επιταγών',
        recurrence: 'continuous' as const,
        breachEffect: 'reduces_claim' as const,
        verifiable: true,
    },
    {
        kind: 'condition_precedent' as const,
        text: 'Να υπάρχει σε ισχύ ασφαλιστήριο Περιουσίας για την παραπάνω διεύθυνση κινδύνου',
        breachEffect: 'voids_cover' as const,
        dependsOnOtherPolicy: 'home',
    },
    {
        kind: 'other' as const,
        text: 'Κάτι που δεν ξεκαθαρίζει τι συνεπάγεται',
    },
]

describe('condition severity — read from what the policy says', () => {
    it('treats voiding cover as critical', () => {
        expect(conditionSeverity({ kind: 'warranty', text: 'x', breachEffect: 'voids_cover' })).toBe('critical')
    })

    it('grades suspension and claim reduction below it', () => {
        expect(conditionSeverity({ kind: 'warranty', text: 'x', breachEffect: 'suspends_cover' })).toBe('high')
        expect(conditionSeverity({ kind: 'documentation', text: 'x', breachEffect: 'reduces_claim' })).toBe('medium')
    })

    it('errs toward caution when the effect is unstated', () => {
        // "We could not tell what breaching this does" is a reason to look, not
        // a reason to relax — and an unqualified warranty is severe by default.
        expect(conditionSeverity({ kind: 'warranty', text: 'x' })).toBe('high')
        expect(conditionSeverity({ kind: 'other', text: 'x' })).toBe('medium')
    })
})

describe('prevention actions — the policy’s own requirements, read back', () => {
    const actions = preventionActions(CONDITIONS)

    it('surfaces the controls the customer can act on', () => {
        expect(actions.map((a) => a.kind)).toEqual(['maintenance', 'security_requirement', 'documentation'])
    })

    it('leaves out conditions that are not actionable by the customer', () => {
        // A cross-policy dependency is real but it is not a control; it belongs
        // in the gap list, not on a "things to do" surface.
        expect(actions.some((a) => a.kind === 'condition_precedent')).toBe(false)
        expect(isPreventable({ kind: 'condition_precedent', text: 'x' })).toBe(false)
    })

    it('orders by what breaching them costs', () => {
        expect(actions[0].severity).toBe('critical')
        expect(actions[actions.length - 1].severity).toBe('medium')
    })

    it('carries whether the customer could confirm it themselves', () => {
        expect(actions[0].verifiable).toBe(true)
        expect(preventionActions([{ kind: 'maintenance', text: 'x' }])[0].verifiable).toBe(false)
    })

    it('returns nothing for a policy with no conditions', () => {
        expect(preventionActions(undefined)).toEqual([])
        expect(preventionActions([])).toEqual([])
    })
})

describe('condition gaps — what is worth reporting', () => {
    const gaps = conditionGaps(CONDITIONS)

    it('reports the cross-policy dependency, which is invisible from inside the policy', () => {
        const dependency = gaps.find((g) => g.reason === 'depends_on_other_policy')
        expect(dependency).toBeDefined()
        expect(dependency?.dependsOnLine).toBe('home')
    })

    it('reports conditions that void or suspend cover as unverified questions', () => {
        const unverified = gaps.filter((g) => g.reason === 'unverified')
        expect(unverified.length).toBe(2)
        expect(unverified.every((g) => g.severity === 'critical')).toBe(true)
    })

    it('leaves out the merely documentary and the unclassified', () => {
        // A reduces_claim note and an unqualified "other" do not belong on the
        // same surface as a warranty that voids the contract.
        expect(gaps.some((g) => g.text.includes('μητρώο'))).toBe(false)
        expect(gaps.some((g) => g.text.includes('δεν ξεκαθαρίζει'))).toBe(false)
    })

    it('never reports a breach as having happened', () => {
        // The vocabulary is deliberately "unverified" — we can see the
        // requirement and cannot see whether it is met.
        for (const gap of gaps) {
            expect(['unverified', 'depends_on_other_policy']).toContain(gap.reason)
        }
    })
})

describe('compliance obligations — the calendar', () => {
    const obligations = complianceObligations(CONDITIONS)

    it('picks up recurring and standing requirements', () => {
        expect(obligations.map((o) => o.recurrence).sort())
            .toEqual(['annual', 'continuous', 'continuous'])
    })

    it('leaves out one-off conditions', () => {
        expect(complianceObligations([{ kind: 'documentation', text: 'x', recurrence: 'once' }])).toEqual([])
        expect(complianceObligations([{ kind: 'condition_precedent', text: 'x' }])).toEqual([])
    })

    it('carries a stated due date when the policy names one', () => {
        const [obligation] = complianceObligations([
            { kind: 'documentation', text: 'Πιστοποιητικό σε ισχύ', recurrence: 'annual', dueBy: '2027-05-12' },
        ])
        expect(obligation.dueBy).toBe('2027-05-12')
    })
})

describe('condition ids — stable across re-extraction', () => {
    it('derives the id from the text, not from position', () => {
        const first = conditionGaps(CONDITIONS)
        const reordered = conditionGaps([...CONDITIONS].reverse())
        expect(new Set(first.map((g) => g.id))).toEqual(new Set(reordered.map((g) => g.id)))
    })

    it('folds Greek accents so a re-typeset schedule keeps the same id', () => {
        const accented = preventionActions([
            { kind: 'security_requirement', text: 'Σύστημα Συναγερμού', recurrence: 'continuous' },
        ])[0].id
        const upper = preventionActions([
            { kind: 'security_requirement', text: 'ΣΥΣΤΗΜΑ ΣΥΝΑΓΕΡΜΟΥ', recurrence: 'continuous' },
        ])[0].id
        expect(accented).toBe(upper)
    })

    it('falls back to the index when the text yields no slug', () => {
        expect(preventionActions([{ kind: 'maintenance', text: '—' }])[0].id).toBe('maintenance:0')
    })
})
