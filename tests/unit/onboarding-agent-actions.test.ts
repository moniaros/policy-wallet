import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock all side-effecting dependencies BEFORE importing the actions ──
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
    db: {
        agentProfile: { update: vi.fn(), findUnique: vi.fn() },
        invite: { create: vi.fn() },
    },
}))

vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(async () => 'https://cdn.test/asset') }))
vi.mock('@/lib/email/invite-emails', () => ({ sendPolicyInviteEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { sendPolicyInviteEmail } from '@/lib/email/invite-emails'
import {
    updateAgentProfile,
    completeOnboarding,
    sendClientInvite,
} from '@/app/onboarding/agent/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockUpdate = vi.mocked(db.agentProfile.update)
const mockInviteCreate = vi.mocked(db.invite.create)
const mockSendInvite = vi.mocked(sendPolicyInviteEmail)

const AGENT = {
    supabaseUser: { id: 'sb-123' },
    dbUser: { id: 'agent-123', roles: 'agent', name: 'Agent A', email: 'agent@example.com', preferredLanguage: 'en' },
} as any

const POLICYHOLDER = {
    supabaseUser: { id: 'sb-999' },
    dbUser: { id: 'user-999', roles: 'policyholder', name: 'Pol', email: 'pol@example.com', preferredLanguage: 'el' },
} as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('onboarding/agent server actions — identity is derived from the session, never the caller', () => {
    describe('updateAgentProfile', () => {
        it('rejects an unauthenticated caller and never writes to the DB', async () => {
            mockAuth.mockResolvedValue(null)

            const result = await updateAgentProfile({ agencyName: 'Evil Co' })

            expect(result.success).toBe(false)
            expect(result.error).toMatch(/unauthorized/i)
            expect(mockUpdate).not.toHaveBeenCalled()
        })

        it('rejects a non-agent (policyholder) caller and never writes to the DB', async () => {
            mockAuth.mockResolvedValue(POLICYHOLDER)

            const result = await updateAgentProfile({ agencyName: 'Evil Co' })

            expect(result.success).toBe(false)
            expect(result.error).toMatch(/forbidden|agent/i)
            expect(mockUpdate).not.toHaveBeenCalled()
        })

        it('scopes the write to the SESSION user id, ignoring any caller-supplied id', async () => {
            mockAuth.mockResolvedValue(AGENT)
            mockUpdate.mockResolvedValue({} as any)

            const result = await updateAgentProfile({ agencyName: 'Legit Agency' })

            expect(result.success).toBe(true)
            expect(mockUpdate).toHaveBeenCalledTimes(1)
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'agent-123' } })
            )
        })
    })

    describe('completeOnboarding', () => {
        it('rejects an unauthenticated caller and never writes to the DB', async () => {
            mockAuth.mockResolvedValue(null)

            const result = await completeOnboarding()

            expect(result.success).toBe(false)
            expect(mockUpdate).not.toHaveBeenCalled()
        })

        it('marks onboarding complete for the session user only', async () => {
            mockAuth.mockResolvedValue(AGENT)
            mockUpdate.mockResolvedValue({} as any)

            const result = await completeOnboarding()

            expect(result.success).toBe(true)
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'agent-123' } })
            )
        })
    })

    describe('sendClientInvite (impersonation vector)', () => {
        it('rejects an unauthenticated caller — no invite created, no email sent', async () => {
            mockAuth.mockResolvedValue(null)

            const result = await sendClientInvite('victim@example.com')

            expect(result.success).toBe(false)
            expect(mockInviteCreate).not.toHaveBeenCalled()
            expect(mockSendInvite).not.toHaveBeenCalled()
        })

        it('sets inviterUserId to the session user, not a caller-supplied id', async () => {
            mockAuth.mockResolvedValue(AGENT)
            mockInviteCreate.mockResolvedValue({ id: 'inv-1', token: 'tok-1' } as any)

            const result = await sendClientInvite('client@example.com')

            expect(result.success).toBe(true)
            expect(mockInviteCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ inviterUserId: 'agent-123', inviteeEmail: 'client@example.com' }),
                })
            )
        })
    })

})
