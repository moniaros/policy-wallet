import { beforeEach, describe, expect, it, vi } from 'vitest'

// Query spies — the batch scorers must hit each of these a FIXED number of
// times regardless of how many opportunities/customers are scored (no N+1).
const userFindMany = vi.fn()
const policyGroupBy = vi.fn()
const analysisGroupBy = vi.fn()
const relationshipFindMany = vi.fn()
const threadFindMany = vi.fn()
const participantFindMany = vi.fn()
const proposalFindMany = vi.fn()
const opportunityFindMany = vi.fn()
const profileFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        user: { findMany: (...a: any[]) => userFindMany(...a) },
        policy: { groupBy: (...a: any[]) => policyGroupBy(...a) },
        policyAnalysisRun: { groupBy: (...a: any[]) => analysisGroupBy(...a) },
        customerRelationship: { findMany: (...a: any[]) => relationshipFindMany(...a) },
        collaborationThread: { findMany: (...a: any[]) => threadFindMany(...a) },
        collaborationParticipant: { findMany: (...a: any[]) => participantFindMany(...a) },
        proposal: { findMany: (...a: any[]) => proposalFindMany(...a) },
        opportunity: { findMany: (...a: any[]) => opportunityFindMany(...a) },
        policyholderProfile: { findMany: (...a: any[]) => profileFindMany(...a) },
    },
}))

import { scoreOpportunitiesBatch } from '@/lib/services/gap-engine/opportunity-scoring'
import { calculateEngagementScoresBatch } from '@/lib/services/engagement-scoring'

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000)

beforeEach(() => {
    vi.clearAllMocks()

    // C1: fully engaged customer. C2: dormant/empty customer.
    userFindMany.mockResolvedValue([
        {
            id: 'C1', name: 'Full', email: 'full@example.com', phoneNumber: '30', image: 'img',
            lastActiveAt: new Date(now), createdAt: daysAgo(400), pushToken: 'tok',
        },
        {
            id: 'C2', name: null, email: null, phoneNumber: null, image: null,
            lastActiveAt: daysAgo(100), createdAt: daysAgo(400), pushToken: null,
        },
    ])
    policyGroupBy.mockResolvedValue([{ ownerUserId: 'C1', _count: { _all: 5 } }])
    analysisGroupBy.mockResolvedValue([{ userId: 'C1', _count: { _all: 10 } }])
    relationshipFindMany.mockResolvedValue([{ policyholderUserId: 'C1' }])
    // t1 appears as both created and participated — must count once (distinct → 3).
    threadFindMany.mockResolvedValue([
        { id: 't1', createdByUserId: 'C1' },
        { id: 't2', createdByUserId: 'C1' },
    ])
    participantFindMany.mockResolvedValue([
        { threadId: 't1', userId: 'C1' },
        { threadId: 't3', userId: 'C1' },
    ])
    proposalFindMany.mockResolvedValue([{ relationshipId: 'r1', relationship: { policyholderUserId: 'C1' } }])
    // A genuinely complete profile. It used to list six nullable fields, which
    // was "100%" under the opportunity engine's own long-gone definition of
    // completeness; that number now comes from `contextCompleteness`, which
    // counts answered CONTEXT FACTORS — the same measure the client sees on their
    // own dashboard. `answeredFields` is what makes a declared "no" count as an
    // answer, so a maxed customer has to carry it.
    profileFindMany.mockResolvedValue([
        {
            userId: 'C1', maritalStatus: 'single', employmentStatus: 'employed',
            dateOfBirth: daysAgo(10000), annualIncome: 30000, occupation: 'x', smokingStatus: 'non_smoker',
            childrenCount: 0, dependentsCount: 0, hasPets: false, vehiclesCount: 0,
            residenceType: 'rented', propertiesOwned: 0, rentsOutProperty: false, ownsBoat: false,
            ownsBusiness: false, businessEmployees: 0, savingsAmount: 5000,
            mortgageAmount: null, hasLoans: false, loanAmount: null, travelsFrequently: false,
            activities: [], valuablesValue: 0, cyberExposure: 'low', retirementPlanning: false,
            chronicConditions: [],
            answeredFields: [
                'maritalStatus', 'employmentStatus', 'dateOfBirth', 'annualIncome',
                'childrenCount', 'dependentsCount', 'hasPets', 'vehiclesCount',
                'residenceType', 'propertiesOwned', 'rentsOutProperty', 'ownsBoat',
                'ownsBusiness', 'businessEmployees', 'savingsAmount', 'mortgageAmount',
                'hasLoans', 'loanAmount', 'travelsFrequently', 'activities',
                'valuablesValue', 'cyberExposure', 'retirementPlanning', 'chronicConditions',
            ],
        },
    ])
})

describe('calculateEngagementScoresBatch', () => {
    it('scores a maxed customer at 100 and dedupes threads across roles', async () => {
        const scores = await calculateEngagementScoresBatch(['C1', 'C2'])
        // 30 (recency) + 20 (policies) + 20 (analyses) + 15 (collab) + 15 (profile) = 100
        expect(scores.get('C1')?.total).toBe(100)
        expect(scores.get('C1')?.breakdown.collaboration).toBe(15) // 5 conn + 5 (threads>=3) + 5 proposal
        // C2 has no signal at all
        expect(scores.get('C2')?.total).toBe(0)
        expect(scores.get('C2')?.riskLevel).toBe('inactive')
    })

    it('issues a fixed number of queries regardless of user count (no N+1)', async () => {
        await calculateEngagementScoresBatch(['C1', 'C2'])
        expect(userFindMany).toHaveBeenCalledTimes(1)
        expect(policyGroupBy).toHaveBeenCalledTimes(1)
        expect(threadFindMany).toHaveBeenCalledTimes(1)
    })
})

describe('scoreOpportunitiesBatch', () => {
    beforeEach(() => {
        opportunityFindMany.mockResolvedValue([
            { id: 'oppA', createdAt: new Date(now), gapInstance: { severity: 'critical', detectedAt: new Date(now) }, relationship: { policyholderUserId: 'C1' } },
            { id: 'oppB', createdAt: daysAgo(100), gapInstance: { severity: 'low', detectedAt: daysAgo(100) }, relationship: { policyholderUserId: 'C2' } },
        ])
    })

    it('applies the documented 40/20/20/20 weighting', async () => {
        const scores = await scoreOpportunitiesBatch(['oppA', 'oppB'])
        // A: 100*.4 + 100*.2 + 100*.2 + 100*.2 = 100
        expect(scores.get('oppA')?.score).toBe(100)
        expect(scores.get('oppA')?.likelihood).toBe('high')
        // B: severity low(20)*.4 + profile 0*.2 + engagement 0*.2 + recency 10*.2 = 10
        expect(scores.get('oppB')?.score).toBe(10)
        expect(scores.get('oppB')?.likelihood).toBe('low')
    })

    it('fetches opportunities and customer facts once — no per-opportunity queries', async () => {
        await scoreOpportunitiesBatch(['oppA', 'oppB'])
        expect(opportunityFindMany).toHaveBeenCalledTimes(1)
        expect(userFindMany).toHaveBeenCalledTimes(1)
        expect(profileFindMany).toHaveBeenCalledTimes(1)
    })

    it('returns an empty map for no ids without touching the db', async () => {
        const scores = await scoreOpportunitiesBatch([])
        expect(scores.size).toBe(0)
        expect(opportunityFindMany).not.toHaveBeenCalled()
    })
})
