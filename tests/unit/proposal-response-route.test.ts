/**
 * The proposal-response PATCH: (1) accepting captures a WON Opportunity + a
 * conversion event (previously nothing beyond the status flip); (2) declining
 * with a reason / counter-offer no longer writes a non-existent `metadata` field
 * (which threw a Prisma validation error and crashed every reasoned decline).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-guard', () => ({
    withApiGuard: (_config: unknown, handler: (ctx: any) => Promise<Response>) => handler,
}))

const tx = {
    proposal: { update: vi.fn(async (_a?: any) => ({ id: 'p1', status: 'done' })) },
    collaborationMessage: { create: vi.fn(async (_a?: any) => ({})) },
    collaborationThread: { update: vi.fn(async (_a?: any) => ({})) },
    opportunity: { create: vi.fn(async (_a?: any) => ({})) },
}

vi.mock('@/lib/db', () => ({
    db: {
        proposal: { findUnique: vi.fn() },
        agentProfile: { findUnique: vi.fn(async () => ({ commissionRates: {} })) },
        $transaction: vi.fn(async (cb: any) => cb(tx)),
    },
}))
vi.mock('@/lib/notifications', () => ({ notifyCounterparty: vi.fn(async () => {}) }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/agent/commission', () => ({ commissionOn: (_r: any, _l: any, p: any) => Number(p) * 0.15 }))

import { db } from '@/lib/db'
import { notifyCounterparty } from '@/lib/notifications'
import { recordConversionEvent } from '@/lib/journey/conversion-events'
import { PATCH } from '@/app/api/v1/collaboration/proposals/[id]/route'

const mockProposalFind = vi.mocked(db.proposal.findUnique)
const mockNotify = vi.mocked(notifyCounterparty)
const mockConversion = vi.mocked(recordConversionEvent)

const pendingProposal = {
    id: 'p1',
    status: 'pending',
    threadId: 'thr-1',
    relationshipId: 'rel-1',
    insurerName: 'Allianz',
    lineOfBusiness: 'motor',
    premiumAmount: 500,
    premiumCurrency: 'EUR',
    relationship: { agentUserId: 'agent-1', policyholderUserId: 'client-1' },
}

const ctx = (body: Record<string, unknown>) => ({
    auth: { dbUser: { id: 'client-1' } },
    params: { id: 'p1' },
    req: new Request('http://localhost/api/v1/collaboration/proposals/p1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }),
})

beforeEach(() => {
    vi.clearAllMocks()
    tx.proposal.update.mockResolvedValue({ id: 'p1', status: 'done' } as any)
    mockProposalFind.mockResolvedValue({ ...pendingProposal } as any)
})

describe('PATCH proposal response', () => {
    it('accepting creates a WON opportunity and records a conversion — no metadata field', async () => {
        await (PATCH as any)(ctx({ status: 'accepted' }))

        expect(tx.opportunity.create).toHaveBeenCalledTimes(1)
        const oppData = tx.opportunity.create.mock.calls[0]![0].data
        expect(oppData).toMatchObject({
            relationshipId: 'rel-1',
            ownerAgentUserId: 'agent-1',
            status: 'won',
            lineOfBusiness: 'motor',
            wonPremium: 500,
            estimatedCommission: 75, // 500 × 0.15
            currency: 'EUR',
        })
        expect(mockConversion).toHaveBeenCalledWith('agent-1', 'proposal_accepted', { source: 'proposal' })
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'agent-1', eventType: 'proposal_accepted', relatedObjectType: 'customer', relatedObjectId: 'client-1' })
        )
        // The proposal update must never carry a `metadata` field.
        expect(tx.proposal.update.mock.calls[0]![0].data).not.toHaveProperty('metadata')
    })

    it('declining with a reason updates status without a metadata write and creates no opportunity', async () => {
        const res = await (PATCH as any)(ctx({ status: 'declined', declineReason: 'too_expensive', declineComment: 'over budget' }))

        expect(res).toBeInstanceOf(Response)
        const updateData = tx.proposal.update.mock.calls[0]![0].data
        expect(updateData).toMatchObject({ status: 'declined' })
        expect(updateData).not.toHaveProperty('metadata')
        expect(tx.opportunity.create).not.toHaveBeenCalled()
        expect(mockConversion).not.toHaveBeenCalled()
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'proposal_declined' })
        )
    })

    it('a counter-offer decline routes the counter notification and creates no opportunity', async () => {
        await (PATCH as any)(ctx({ status: 'declined', counterOfferNotes: 'monthly payments?' }))

        expect(tx.opportunity.create).not.toHaveBeenCalled()
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'proposal_counter_offer' })
        )
    })
})
