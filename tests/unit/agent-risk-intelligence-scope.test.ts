import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
    relation: vi.fn(), policies: vi.fn(), profile: vi.fn(), versions: vi.fn(), visibility: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ db: {
    customerRelationship: { findFirst: mocks.relation },
    policy: { findMany: mocks.policies },
    policyholderProfile: { findUnique: mocks.profile },
    riskProfileVersion: { findMany: mocks.versions },
}}))
vi.mock('@/lib/agent-visibility', () => ({
    ENDED_RELATIONSHIP_STATUSES: ['inactive', 'terminated'], getAgentPolicyVisibilityWhere: mocks.visibility,
}))
import { getRiskIntelligence } from '@/lib/services/risk-dna/service'

beforeEach(() => {
    vi.clearAllMocks()
    mocks.relation.mockResolvedValue({ activationStatus: 'pending' })
    mocks.visibility.mockResolvedValue({ id: { in: ['shared-policy'] } })
    mocks.policies.mockResolvedValue([])
    mocks.profile.mockResolvedValue(null)
    mocks.versions.mockResolvedValue([])
})
describe('agent-scoped intelligence', () => {
    it('restricts policies and does not read unconsented profile or owner-wide history', async () => {
        await getRiskIntelligence('customer', new Date(), 'agent')
        expect(mocks.policies).toHaveBeenCalledWith(expect.objectContaining({ where: {
            ownerUserId: 'customer', status: { not: 'deleted' }, id: { in: ['shared-policy'] },
        } }))
        expect(mocks.profile).not.toHaveBeenCalled()
        expect(mocks.versions).not.toHaveBeenCalled()
    })
    it('rejects missing or ended relationships before reading personal data', async () => {
        mocks.relation.mockResolvedValue(null)
        await expect(getRiskIntelligence('customer', new Date(), 'agent')).rejects.toThrow('Forbidden')
        expect(mocks.policies).not.toHaveBeenCalled()
        expect(mocks.profile).not.toHaveBeenCalled()
        expect(mocks.relation).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { notIn: ['inactive', 'terminated'] } }) }))
    })
    it('allows consented profile data but still excludes owner-wide history', async () => {
        mocks.relation.mockResolvedValue({ activationStatus: 'activated' })
        await getRiskIntelligence('customer', new Date(), 'agent')
        expect(mocks.profile).toHaveBeenCalledOnce()
        expect(mocks.visibility).toHaveBeenCalledWith('agent')
        expect(mocks.versions).not.toHaveBeenCalled()
    })
    it('preserves the owner view', async () => {
        await getRiskIntelligence('customer')
        expect(mocks.profile).toHaveBeenCalledOnce()
        expect(mocks.versions).toHaveBeenCalledOnce()
        expect(mocks.visibility).not.toHaveBeenCalled()
    })
})
