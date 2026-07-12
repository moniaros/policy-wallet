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
        expect(deriveBranchState({ hasActivePolicy: true, needsAttention: true, expected: true })).toBe('attention')
        expect(deriveBranchState({ hasActivePolicy: true, needsAttention: false, expected: true })).toBe('covered')
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: true })).toBe('gap')
        expect(deriveBranchState({ hasActivePolicy: false, needsAttention: false, expected: false })).toBe('neutral')
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

    it('marks expected-but-missing lines as gaps', () => {
        const overview = buildBranchOverview([], ['health', 'income_protection'])
        expect(overview.find((entry) => entry.branch.id === 'health')!.state).toBe('gap')
        // income_protection rolls up to life
        expect(overview.find((entry) => entry.branch.id === 'life')!.state).toBe('gap')
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
