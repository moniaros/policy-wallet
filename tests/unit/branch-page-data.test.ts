import { describe, expect, it } from 'vitest'

import {
    buildBranchOverview,
    deriveBranchState,
    policiesInBranch,
    toTopLevelBranch,
    upcomingRenewals,
    type BranchPolicyFacts,
} from '@/lib/insurance/branch-page'
import { getBranch, normalizeBranch } from '@/lib/insurance/taxonomy'

const NOW = new Date('2026-07-12T00:00:00Z')

function policy(overrides: Partial<BranchPolicyFacts>): BranchPolicyFacts {
    return {
        id: 'p1',
        lineOfBusiness: 'motor',
        status: 'active',
        endDate: new Date('2027-01-01T00:00:00Z'),
        ...overrides,
    }
}

describe('branch page data — toTopLevelBranch', () => {
    it('walks child branches to their root', () => {
        expect(toTopLevelBranch(getBranch('motorbike')!).id).toBe('motor')
        expect(toTopLevelBranch(getBranch('business_interruption')!).id).toBe('business')
        expect(toTopLevelBranch(getBranch('income_protection')!).id).toBe('life')
    })

    it('leaves top-level branches unchanged', () => {
        expect(toTopLevelBranch(getBranch('travel')!).id).toBe('travel')
    })
})

describe('branch page data — policiesInBranch', () => {
    it('matches the whole family, normalizing free-form lines', () => {
        const policies = [
            policy({ id: 'a', lineOfBusiness: 'motor' }),
            policy({ id: 'b', lineOfBusiness: 'motorbike' }),
            policy({ id: 'c', lineOfBusiness: 'Auto Insurance' }),
            policy({ id: 'd', lineOfBusiness: 'home' }),
        ]
        expect(policiesInBranch(policies, 'motor').map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })
})

describe('branch page data — upcomingRenewals', () => {
    it('returns only policies ending inside the window, soonest first', () => {
        const policies = [
            policy({ id: 'far', endDate: new Date('2027-06-01T00:00:00Z') }),
            policy({ id: 'soon', endDate: new Date('2026-08-01T00:00:00Z') }),
            policy({ id: 'sooner', endDate: new Date('2026-07-20T00:00:00Z') }),
            policy({ id: 'past', endDate: new Date('2026-07-01T00:00:00Z') }),
            policy({ id: 'none', endDate: null }),
        ]
        expect(upcomingRenewals(policies, NOW).map((p) => p.id)).toEqual(['sooner', 'soon'])
    })
})

describe('branch page data — deriveBranchState', () => {
    it('prioritises attention > covered > gap > neutral', () => {
        expect(deriveBranchState({ hasActivePolicy: true, needsAttention: true, expected: true, hasAnyPolicy: true })).toBe('attention')
        expect(deriveBranchState({ hasActivePolicy: true, needsAttention: false, expected: true, hasAnyPolicy: true })).toBe('covered')
        // §2.2: an expected line with NOTHING in the wallet is not held —
        // never a finding about a product the customer does not own.
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: true, hasAnyPolicy: false })).toBe('not_held')
        // …but a wallet that HOLDS a (cancelled) policy in the line is an
        // owned product with dead cover: attention, not not-held.
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: true, hasAnyPolicy: true })).toBe('attention')
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: false, hasAnyPolicy: false })).toBe('neutral')
    })
})

describe('branch page data — buildBranchOverview', () => {
    it('always shows the rich branches, top-level only', () => {
        const overview = buildBranchOverview([], [])
        const ids = overview.map((entry) => entry.branch.id)
        for (const richId of ['motor', 'home', 'health', 'life', 'pension', 'travel', 'cyber', 'pet', 'business']) {
            expect(ids).toContain(richId)
        }
        expect(ids).not.toContain('motorbike')
        expect(ids).not.toContain('other')
        expect(overview.every((entry) => entry.state === 'neutral')).toBe(true)
    })

    it('rolls child-branch policies up to the top-level tile', () => {
        const overview = buildBranchOverview([policy({ lineOfBusiness: 'motorbike' })], [])
        const motor = overview.find((entry) => entry.branch.id === 'motor')!
        expect(motor.policyCount).toBe(1)
        expect(motor.state).toBe('covered')
    })

    it('marks expected-but-missing TOP-LEVEL lines as gaps', () => {
        const overview = buildBranchOverview([], ['health', 'income_protection'])
        expect(overview.find((entry) => entry.branch.id === 'health')!.state).toBe('not_held')

        // A child-branch EXPECTATION deliberately does NOT roll up, even though a
        // child-branch POLICY does (see the test above). The asymmetry is the
        // point: holding a motorbike policy really does mean you are insured in
        // the motor family, but needing income protection does not mean you need
        // life insurance. Tiles carry the parent's label, so rolling the
        // expectation up put a tile reading «Ζωή» (Life) in front of every
        // employed person with thin savings — including those with no dependants
        // and no debt, who have no life-insurance need at all. It fired on 17 of
        // 24 validation scenarios. The recommendation card still names the right
        // product; silence beats a mislabelled verdict.
        expect(overview.find((entry) => entry.branch.id === 'life')!.state).toBe('neutral')
    })

    it('an unread row is a document on file, never cover and never a finding', () => {
        // The Sept-2026 defect row: a one-line PDF stored `active`, line «Άλλο»,
        // placeholder identity — the map painted «Άλλο: Καλυμμένο».
        const defect = buildBranchOverview([policy({ lineOfBusiness: 'other', status: 'active', unread: true })], [])
        const other = defect.find((entry) => entry.branch.id === 'other')!
        expect(other.state).toBe('unread')
        expect(other.policyCount).toBe(1)
        expect(other.activeCount).toBe(0)

        // Stamped action_needed (EXTRACTION_EMPTY) it is still unread — not
        // the amber «attention» ATTENTION_STATUSES would otherwise raise over
        // a file nobody could read.
        expect(
            buildBranchOverview([policy({ lineOfBusiness: 'motor', status: 'action_needed', unread: true })], []).find((entry) => entry.branch.id === 'motor')!.state
        ).toBe('unread')

        // An expected line with only an unread document: unread, not not_held
        // (something WAS uploaded) and not covered.
        expect(
            buildBranchOverview([policy({ lineOfBusiness: 'health', status: 'analyzing', unread: true })], ['health']).find((entry) => entry.branch.id === 'health')!.state
        ).toBe('unread')

        // Read evidence outranks it in both directions.
        const withCover = buildBranchOverview(
            [policy({ id: 'a', lineOfBusiness: 'motor', status: 'active' }), policy({ id: 'b', lineOfBusiness: 'motor', status: 'action_needed', unread: true })],
            []
        )
        expect(withCover.find((entry) => entry.branch.id === 'motor')!.state).toBe('covered')
        const withLapse = buildBranchOverview(
            [policy({ id: 'a', lineOfBusiness: 'motor', status: 'expired' }), policy({ id: 'b', lineOfBusiness: 'motor', status: 'active', unread: true })],
            []
        )
        expect(withLapse.find((entry) => entry.branch.id === 'motor')!.state).toBe('attention')
    })

    it('deriveBranchState: unread only fills the silence a read policy would otherwise decide', () => {
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: true, hasAnyPolicy: false, hasUnread: true })).toBe('unread')
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: false, hasAnyPolicy: false, hasUnread: true })).toBe('unread')
        expect(deriveBranchState({ hasActivePolicy: true, needsAttention: false, expected: true, hasAnyPolicy: true, hasUnread: true })).toBe('covered')
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: true, hasAnyPolicy: true, hasUnread: true })).toBe('attention')
    })

    it('attention wins over covered', () => {
        const overview = buildBranchOverview(
            [
                policy({ id: 'ok', lineOfBusiness: 'home', status: 'active' }),
                policy({ id: 'exp', lineOfBusiness: 'home', status: 'expiring_soon' }),
            ],
            []
        )
        expect(overview.find((entry) => entry.branch.id === 'home')!.state).toBe('attention')
    })

    it('includes non-rich top-level branches only when policies or expectations exist', () => {
        const withBoat = buildBranchOverview([policy({ lineOfBusiness: 'marine' })], [])
        expect(withBoat.find((entry) => entry.branch.id === 'boat')).toBeDefined()
        expect(normalizeBranch('marine').id).toBe('boat')

        const without = buildBranchOverview([], [])
        expect(without.find((entry) => entry.branch.id === 'boat')).toBeUndefined()
    })
})
