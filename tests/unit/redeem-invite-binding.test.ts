/**
 * A leaked policy-share token must not grant access to whoever opens it —
 * redeemInvite binds share/access invites to the addressed email.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const inviteFindUnique = vi.fn()
const inviteUpdate = vi.fn()
const userFindUnique = vi.fn()
const policyFindUnique = vi.fn()
const grantFindFirst = vi.fn()
const grantCreate = vi.fn()
const relationshipUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        invite: {
            findUnique: (...a: unknown[]) => inviteFindUnique(...a),
            update: (...a: unknown[]) => inviteUpdate(...a),
        },
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
        policy: { findUnique: (...a: unknown[]) => policyFindUnique(...a) },
        accessGrant: {
            findFirst: (...a: unknown[]) => grantFindFirst(...a),
            create: (...a: unknown[]) => grantCreate(...a),
        },
        customerRelationship: { updateMany: (...a: unknown[]) => relationshipUpdateMany(...a) },
    },
}))
// auth/actions imports these at module load — stub so the import resolves.
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))

import { redeemInvite } from '@/app/auth/actions'

const shareInvite = (email: string | null) => ({
    id: 'inv1',
    token: 'tok',
    inviteType: 'policy_share',
    scope: 'policy:pol1',
    inviteeEmail: email,
    inviterUserId: 'owner1',
    requestedPermissions: 'view',
    consumedAt: null,
    expiresAt: new Date('2999-01-01'),
})

beforeEach(() => {
    vi.clearAllMocks()
    inviteUpdate.mockResolvedValue({})
    grantFindFirst.mockResolvedValue(null)
    grantCreate.mockResolvedValue({})
    policyFindUnique.mockResolvedValue({ ownerUserId: 'owner1' }) // not the redeemer
})

describe('redeemInvite — share/access email binding', () => {
    it('mints the grant when the redeemer email matches the addressed email', async () => {
        inviteFindUnique.mockResolvedValue(shareInvite('agent@x.com'))
        userFindUnique.mockResolvedValue({ email: 'agent@x.com' })

        await redeemInvite('tok', 'agentUser')

        expect(inviteUpdate).toHaveBeenCalled()
        expect(grantCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ granteeUserId: 'agentUser', scope: 'policy:pol1' }) })
        )
    })

    it('does NOT grant to a mismatched email, and leaves the invite unconsumed', async () => {
        inviteFindUnique.mockResolvedValue(shareInvite('agent@x.com'))
        userFindUnique.mockResolvedValue({ email: 'attacker@evil.com' })

        await redeemInvite('tok', 'attacker')

        expect(grantCreate).not.toHaveBeenCalled()
        expect(inviteUpdate).not.toHaveBeenCalled() // still valid for the intended recipient
    })

    it('is case-insensitive on the email match', async () => {
        inviteFindUnique.mockResolvedValue(shareInvite('Agent@X.com'))
        userFindUnique.mockResolvedValue({ email: 'agent@x.COM' })

        await redeemInvite('tok', 'agentUser')

        expect(grantCreate).toHaveBeenCalled()
    })
})
