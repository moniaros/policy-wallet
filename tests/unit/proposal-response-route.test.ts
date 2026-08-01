/**
 * The proposal-response PATCH.
 *
 * (1) A response CLOSES the deal already being worked rather than creating a new
 *     row — creating one left the original open forever (double-counting the deal
 *     in pipeline and won) and gave the new row createdAt === updatedAt, so its
 *     sales-cycle length computed as zero.
 * (2) The client's decline reason is PERSISTED (it used to be interpolated into a
 *     chat message and discarded) and closes the deal as lost with that reason,
 *     so declines are no longer invisible to pipeline analytics.
 * (3) Every close leaves an OpportunityStageHistory row behind.
 * (4) Declining with a reason / counter-offer still writes no `metadata` field
 *     (a non-existent column that once crashed every reasoned decline).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-guard', () => ({
    withApiGuard: (_config: unknown, handler: (ctx: any) => Promise<Response>) => handler,
}))

const tx = {
    proposal: { update: vi.fn(async (_a?: any) => ({ id: 'p1', status: 'done' })) },
    collaborationMessage: { create: vi.fn(async (_a?: any) => ({})) },
    collaborationThread: { update: vi.fn(async (_a?: any) => ({})) },
    opportunity: {
        create: vi.fn(async (_a?: any) => ({ id: 'opp-new' })),
        update: vi.fn(async (_a?: any) => ({})),
    },
    opportunityStageHistory: { create: vi.fn(async (_a?: any) => ({})) },
}

vi.mock('@/lib/db', () => ({
    db: {
        proposal: { findUnique: vi.fn() },
        opportunity: { findFirst: vi.fn() },
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
const mockOppFind = vi.mocked(db.opportunity.findFirst)
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
    tx.opportunity.create.mockResolvedValue({ id: 'opp-new' } as any)
    mockProposalFind.mockResolvedValue({ ...pendingProposal } as any)
    // Default: no deal in flight for this relationship + line.
    mockOppFind.mockResolvedValue(null as any)
})

describe('PATCH proposal response — accept', () => {
    it('CLOSES the deal already in flight instead of creating a duplicate', async () => {
        mockOppFind.mockResolvedValue({ id: 'opp-1', status: 'quoted' } as any)

        await (PATCH as any)(ctx({ status: 'accepted' }))

        // The bug this replaces: a second row was created and the original was
        // left open, so the same deal counted twice.
        expect(tx.opportunity.create).not.toHaveBeenCalled()
        expect(tx.opportunity.update).toHaveBeenCalledTimes(1)

        const call = tx.opportunity.update.mock.calls[0]![0]
        expect(call.where).toEqual({ id: 'opp-1' })
        expect(call.data).toMatchObject({
            status: 'won',
            wonPremium: 500,
            estimatedCommission: 75, // 500 × 0.15
            currency: 'EUR',
            outcome: 'proposal_accepted',
        })
        expect(call.data.outcomeAt).toBeInstanceOf(Date)
    })

    it('logs the won transition with its prior stage', async () => {
        mockOppFind.mockResolvedValue({ id: 'opp-1', status: 'quoted' } as any)

        await (PATCH as any)(ctx({ status: 'accepted' }))

        expect(tx.opportunityStageHistory.create).toHaveBeenCalledTimes(1)
        expect(tx.opportunityStageHistory.create.mock.calls[0]![0].data).toMatchObject({
            opportunityId: 'opp-1',
            fromStatus: 'quoted',
            toStatus: 'won',
            changedByUserId: 'client-1',
            outcome: 'proposal_accepted',
        })
    })

    it('still records the sale when no deal was being tracked', async () => {
        await (PATCH as any)(ctx({ status: 'accepted' }))

        expect(tx.opportunity.update).not.toHaveBeenCalled()
        expect(tx.opportunity.create).toHaveBeenCalledTimes(1)
        expect(tx.opportunity.create.mock.calls[0]![0].data).toMatchObject({
            relationshipId: 'rel-1',
            ownerAgentUserId: 'agent-1',
            status: 'won',
            lineOfBusiness: 'motor',
            wonPremium: 500,
            estimatedCommission: 75,
            currency: 'EUR',
            outcome: 'proposal_accepted',
        })
        // Born closed — logged with no prior stage.
        expect(tx.opportunityStageHistory.create.mock.calls[0]![0].data).toMatchObject({
            opportunityId: 'opp-new',
            fromStatus: null,
            toStatus: 'won',
        })
    })

    it('records the conversion and notifies the agent', async () => {
        await (PATCH as any)(ctx({ status: 'accepted' }))

        expect(mockConversion).toHaveBeenCalledWith('agent-1', 'proposal_accepted', { source: 'proposal' })
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'agent-1',
                eventType: 'proposal_accepted',
                relatedObjectType: 'customer',
                relatedObjectId: 'client-1',
            })
        )
        expect(tx.proposal.update.mock.calls[0]![0].data).not.toHaveProperty('metadata')
    })
})

describe('PATCH proposal response — decline', () => {
    it('PERSISTS the decline reason instead of discarding it', async () => {
        await (PATCH as any)(ctx({
            status: 'declined',
            declineReason: 'too_expensive',
            declineComment: 'over budget',
        }))

        const updateData = tx.proposal.update.mock.calls[0]![0].data
        expect(updateData).toMatchObject({
            status: 'declined',
            declineReason: 'too_expensive',
            declineComment: 'over budget',
        })
        expect(updateData).not.toHaveProperty('metadata')
    })

    it('closes the deal in flight as lost, carrying the reason across', async () => {
        mockOppFind.mockResolvedValue({ id: 'opp-1', status: 'contacted' } as any)

        await (PATCH as any)(ctx({
            status: 'declined',
            declineReason: 'too_expensive',
            declineComment: 'over budget',
        }))

        expect(tx.opportunity.update).toHaveBeenCalledTimes(1)
        expect(tx.opportunity.update.mock.calls[0]![0].data).toMatchObject({
            status: 'lost',
            outcome: 'too_expensive',
            outcomeNotes: 'over budget',
        })
        expect(tx.opportunityStageHistory.create.mock.calls[0]![0].data).toMatchObject({
            opportunityId: 'opp-1',
            fromStatus: 'contacted',
            toStatus: 'lost',
            outcome: 'too_expensive',
        })
        expect(mockConversion).not.toHaveBeenCalled()
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'proposal_declined' })
        )
    })

    it('maps an unrecognised reason to `other` rather than dropping the close', async () => {
        mockOppFind.mockResolvedValue({ id: 'opp-1', status: 'open' } as any)

        await (PATCH as any)(ctx({ status: 'declined', declineReason: 'mystery' }))

        expect(tx.opportunity.update.mock.calls[0]![0].data).toMatchObject({
            status: 'lost',
            outcome: 'other',
        })
    })

    it('invents no opportunity when none was being tracked', async () => {
        await (PATCH as any)(ctx({ status: 'declined', declineReason: 'not_needed' }))

        expect(tx.opportunity.create).not.toHaveBeenCalled()
        expect(tx.opportunity.update).not.toHaveBeenCalled()
        // The reason is still captured on the proposal itself.
        expect(tx.proposal.update.mock.calls[0]![0].data).toMatchObject({ declineReason: 'not_needed' })
    })
})

describe('PATCH proposal response — counter-offer', () => {
    it('closes nothing — a counter-offer is a live negotiation, not a loss', async () => {
        mockOppFind.mockResolvedValue({ id: 'opp-1', status: 'quoted' } as any)

        await (PATCH as any)(ctx({ status: 'declined', counterOfferNotes: 'monthly payments?' }))

        expect(tx.opportunity.create).not.toHaveBeenCalled()
        expect(tx.opportunity.update).not.toHaveBeenCalled()
        expect(tx.opportunityStageHistory.create).not.toHaveBeenCalled()
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'proposal_counter_offer' })
        )
    })

    it('persists the counter-offer note', async () => {
        await (PATCH as any)(ctx({ status: 'declined', counterOfferNotes: 'monthly payments?' }))

        expect(tx.proposal.update.mock.calls[0]![0].data).toMatchObject({
            counterOfferNotes: 'monthly payments?',
        })
    })
})
