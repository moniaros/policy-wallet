/**
 * redeemInviteCode (the agent invite code redeemed by a logged-in policyholder)
 * must (1) only connect the account the invite was addressed to — the token alone
 * must not let a forwarded/leaked link bind an arbitrary logged-in account to the
 * agent — and (2) grant real identity consent (activationStatus: "activated"), not
 * just flip the display status, so the agent can actually see the customer they
 * were just connected to. Distinct from redeem-invite-binding.test.ts, which covers
 * the policy-share `redeemInvite` in @/app/auth/actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/lib/db', () => ({
    db: {
        invite: { findUnique: vi.fn(), update: vi.fn() },
        customerRelationship: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
        user: { findUnique: vi.fn(), update: vi.fn() },
        agentProfile: { upsert: vi.fn() },
    },
}))
vi.mock('@/lib/notifications/dispatch', () => ({ emit: vi.fn() }))
// Heavy transitive imports of the onboarding actions module — stub them out.
vi.mock('@/lib/services/policy.service', () => ({ PolicyService: class {} }))
vi.mock('@/lib/subscription-limits', () => ({ canUserAddPolicy: vi.fn(), getUpgradeMessage: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { redeemInviteCode } from '@/app/onboarding/actions'

const mockAuth = vi.mocked(getAuthenticatedUser)
const future = new Date(Date.now() + 24 * 60 * 60 * 1000)

const baseInvite = {
    id: 'inv-1',
    token: 't',
    inviteeEmail: 'alice@x.com',
    inviterUserId: 'agent-1',
    inviteType: 'signup',
    relationshipType: 'agent_client',
    consumedAt: null,
    expiresAt: future,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('redeemInviteCode — email binding + consent', () => {
    it('rejects redemption by an account other than the invited email, without consuming', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'bob', email: 'bob@x.com' } } as any)
        vi.mocked(db.invite.findUnique).mockResolvedValue({ ...baseInvite } as any)

        const res = await redeemInviteCode('t')

        expect(res).toEqual({ success: false, error: 'wrong_account' })
        expect(db.invite.update).not.toHaveBeenCalled()
        expect(db.customerRelationship.create).not.toHaveBeenCalled()
        expect(db.customerRelationship.update).not.toHaveBeenCalled()
    })

    it('grants consent (activationStatus "activated") for the correct account, case-insensitively', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'alice', email: 'Alice@X.com' } } as any)
        vi.mocked(db.invite.findUnique).mockResolvedValue({ ...baseInvite } as any)
        vi.mocked(db.customerRelationship.updateMany).mockResolvedValue({ count: 0 } as any)
        vi.mocked(db.user.findUnique).mockResolvedValue({ name: 'Agent Smith' } as any)

        const res = await redeemInviteCode('t')

        expect(res).toEqual({ success: true, agentName: 'Agent Smith' })
        expect(db.invite.update).toHaveBeenCalled()
        // The agent is the INVITER, the redeemer the policyholder — and the
        // acceptance is consent on both columns, whether the relationship was
        // pre-created (createAgentInvite) or not (sendClientInvite).
        expect(db.customerRelationship.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { agentUserId_policyholderUserId: { agentUserId: 'agent-1', policyholderUserId: 'alice' } },
                create: expect.objectContaining({ status: 'active', activationStatus: 'activated' }),
                update: expect.objectContaining({ status: 'active', activationStatus: 'activated' }),
            })
        )
    })

    // Phase 0.4 (spec-v2 audit 2026-09-23): the copy of the logic that lived in
    // redeemInviteCode ignored relationshipType and ALWAYS made the inviter the
    // agent, so a client→advisor connect code built the relationship backwards.
    it('a client→advisor invite makes the REDEEMER the agent, not the inviter', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'adv-1', email: 'adv@x.com' } } as any)
        vi.mocked(db.invite.findUnique).mockResolvedValue({
            ...baseInvite,
            inviteeEmail: 'adv@x.com',
            inviterUserId: 'client-1',
            relationshipType: 'client_agent',
        } as any)
        vi.mocked(db.user.findUnique).mockResolvedValue({ email: 'adv@x.com', roles: 'agent', name: 'Client Jane' } as any)

        const res = await redeemInviteCode('t')

        expect(res.success).toBe(true)
        expect(db.customerRelationship.upsert).toHaveBeenCalledTimes(1)
        expect(db.customerRelationship.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { agentUserId_policyholderUserId: { agentUserId: 'adv-1', policyholderUserId: 'client-1' } },
            })
        )
        expect(db.customerRelationship.create).not.toHaveBeenCalled()
    })
})
