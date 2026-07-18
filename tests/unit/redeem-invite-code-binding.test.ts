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
        customerRelationship: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
        user: { findUnique: vi.fn() },
    },
}))
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
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue(null)
        vi.mocked(db.user.findUnique).mockResolvedValue({ name: 'Agent Smith' } as any)

        const res = await redeemInviteCode('t')

        expect(res).toEqual({ success: true, agentName: 'Agent Smith' })
        expect(db.invite.update).toHaveBeenCalled()
        expect(db.customerRelationship.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'active', activationStatus: 'activated' }),
            })
        )
    })

    it('activates an existing relationship with consent on the update path', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'alice', email: 'alice@x.com' } } as any)
        vi.mocked(db.invite.findUnique).mockResolvedValue({ ...baseInvite } as any)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
        vi.mocked(db.user.findUnique).mockResolvedValue({ name: 'Agent Smith' } as any)

        await redeemInviteCode('t')

        expect(db.customerRelationship.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'rel-1' },
                data: expect.objectContaining({ status: 'active', activationStatus: 'activated' }),
            })
        )
    })
})
