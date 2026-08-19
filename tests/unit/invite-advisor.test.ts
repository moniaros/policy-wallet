/**
 * Policyholder→advisor "connect by email" flow.
 *
 * inviteAdvisorByEmail creates the inverse-direction invite (signup /
 * client_agent) and emails the advisor; redeemInvite's client_agent branch makes
 * the redeemer an agent (adds the role + syncs the JWT when they lacked it) and
 * connects them as agentUserId → policyholderUserId, email-bound so a leaked
 * link can't connect a wrong advisor. isAgentRole is left REAL so the
 * add-role-when-missing / idempotent-when-present logic is genuinely exercised.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── shared db mock (vi.hoisted so the factory can reference it at hoist time) ──
const db = vi.hoisted(() => ({
    user: { findUnique: vi.fn(), update: vi.fn() },
    invite: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    customerRelationship: { findUnique: vi.fn(), upsert: vi.fn() },
    agentProfile: { upsert: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db }))

// ── auth ─────────────────────────────────────────────────────────────────────
const mockGetAuthOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...a: unknown[]) => (mockGetAuthOrNull as any)(...a),
    getAuthenticatedUser: (...a: unknown[]) => (mockGetAuthOrNull as any)(...a),
}))

// ── rate limit (dynamic-imported) ────────────────────────────────────────────
const mockRateLimit = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => (mockRateLimit as any)(...a) }))

// ── email (dynamic-imported) ─────────────────────────────────────────────────
const mockSendAdvisorInviteEmail = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendAdvisorInviteEmail: (...a: unknown[]) => (mockSendAdvisorInviteEmail as any)(...a),
}))

// ── supabase admin (dynamic-imported by redeemInvite) ────────────────────────
const mockUpdateUserById = vi.fn(async () => ({ error: null }))
const mockGetAuthUserByEmail = vi.fn(async () => ({ id: 'auth-uuid', user_metadata: { language: 'el' } }))
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({ auth: { admin: { updateUserById: (...a: unknown[]) => (mockUpdateUserById as any)(...a) } } }),
    getSupabaseAuthUserByEmail: (...a: unknown[]) => (mockGetAuthUserByEmail as any)(...a),
}))

// ── module-load stubs so relationship-actions.ts + auth/actions.ts import ────
vi.mock('@/lib/seo/site', () => ({ absoluteUrl: (p: string) => `https://www.policywallet.gr${p}`, getSiteOrigin: () => 'https://www.policywallet.gr' }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('next/server', () => ({ after: (fn: any) => fn?.() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email/admin-emails', () => ({ sendAdminSignupNotificationEmail: vi.fn() }))
vi.mock('@/lib/tokens', () => ({
    consumePasswordResetToken: vi.fn(), generatePasswordResetToken: vi.fn(),
    generateVerificationToken: vi.fn(), validatePasswordResetToken: vi.fn(),
}))
vi.mock('@/lib/auth/phone-auth', () => ({
    buildSyntheticEmailFromPhone: vi.fn(), isSyntheticPhoneEmail: vi.fn(), normalizeGreekMobile: vi.fn(),
}))
vi.mock('@/lib/pricing/public-pricing-content', () => ({ VALID_PLAN_IDS: [] }))

import { inviteAdvisorByEmail } from '@/app/(protected)/agent/relationship-actions'
import { redeemInvite } from '@/app/auth/actions'

const PH = { dbUser: { id: 'ph-1', email: 'me@example.gr', name: 'Maria', preferredLanguage: 'el' } }

beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthOrNull.mockResolvedValue(PH)
    mockRateLimit.mockResolvedValue({ success: true })
    mockSendAdvisorInviteEmail.mockResolvedValue({ success: true })
    mockUpdateUserById.mockResolvedValue({ error: null })
    mockGetAuthUserByEmail.mockResolvedValue({ id: 'auth-uuid', user_metadata: { language: 'el' } })
    db.user.findUnique.mockResolvedValue(null)
    db.user.update.mockResolvedValue({})
    db.customerRelationship.findUnique.mockResolvedValue(null)
    db.customerRelationship.upsert.mockResolvedValue({})
    db.agentProfile.upsert.mockResolvedValue({})
    db.invite.create.mockImplementation(async (args: any) => ({ id: 'inv-1', ...args.data, token: 'tok123' }))
    db.invite.update.mockResolvedValue({})
})

describe('inviteAdvisorByEmail', () => {
    it('creates a signup/client_agent invite to the normalized email and sends the email', async () => {
        const result = await inviteAdvisorByEmail('  Advisor@Example.GR  ')

        expect(result).toMatchObject({ success: true, emailDelivered: true })
        expect(db.invite.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    inviterUserId: 'ph-1',
                    inviteeEmail: 'advisor@example.gr',
                    inviteType: 'signup',
                    relationshipType: 'client_agent',
                }),
            })
        )
        expect(mockSendAdvisorInviteEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'advisor@example.gr', token: 'tok123' })
        )
    })

    it('returns a copyable link when email delivery fails', async () => {
        mockSendAdvisorInviteEmail.mockResolvedValue({ success: false })
        const result = await inviteAdvisorByEmail('advisor@example.gr')
        expect(result).toMatchObject({ success: true, emailDelivered: false })
        expect((result as any).inviteLink).toContain('/invite/tok123')
    })

    it('refuses a self-invite before creating anything', async () => {
        const result = await inviteAdvisorByEmail('me@example.gr')
        expect(result).toEqual({ success: false, error: 'self' })
        expect(db.invite.create).not.toHaveBeenCalled()
    })

    it('rejects an invalid email', async () => {
        const result = await inviteAdvisorByEmail('not-an-email')
        expect(result).toEqual({ success: false, error: 'invalid_email' })
        expect(db.invite.create).not.toHaveBeenCalled()
    })

    it('rate-limits and does not send', async () => {
        mockRateLimit.mockResolvedValue({ success: false })
        const result = await inviteAdvisorByEmail('advisor@example.gr')
        expect(result).toEqual({ success: false, error: 'rate_limited' })
        expect(db.invite.create).not.toHaveBeenCalled()
        expect(mockSendAdvisorInviteEmail).not.toHaveBeenCalled()
    })

    it('short-circuits when already connected to that advisor', async () => {
        db.user.findUnique.mockResolvedValue({ id: 'adv-1' })
        db.customerRelationship.findUnique.mockResolvedValue({ status: 'active' })
        const result = await inviteAdvisorByEmail('advisor@example.gr')
        expect(result).toMatchObject({ success: true, alreadyConnected: true })
        expect(db.invite.create).not.toHaveBeenCalled()
    })
})

describe('redeemInvite — client_agent branch', () => {
    const invite = {
        id: 'inv-1', token: 'tok123', inviterUserId: 'ph-1', inviteeEmail: 'advisor@example.gr',
        inviteType: 'signup', relationshipType: 'client_agent',
        consumedAt: null, expiresAt: new Date(Date.now() + 86_400_000), scope: null, requestedPermissions: null,
    }

    it('adds the agent role + syncs JWT and connects when the advisor was not an agent', async () => {
        db.invite.findUnique.mockResolvedValue(invite)
        db.user.findUnique.mockResolvedValue({ email: 'advisor@example.gr', roles: 'policyholder' })
        mockGetAuthOrNull.mockResolvedValue({ dbUser: { id: 'adv-1' } })

        await redeemInvite('tok123')

        // consumed
        expect(db.invite.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'inv-1' }, data: expect.objectContaining({ inviteeUserId: 'adv-1' }) })
        )
        // agent role added + AgentProfile + JWT synced
        expect(db.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'adv-1' }, data: { roles: 'policyholder,agent' } })
        )
        expect(db.agentProfile.upsert).toHaveBeenCalled()
        expect(mockGetAuthUserByEmail).toHaveBeenCalledWith('advisor@example.gr')
        expect(mockUpdateUserById).toHaveBeenCalledWith('auth-uuid', {
            user_metadata: { language: 'el', role: 'policyholder,agent' },
        })
        // connected: advisor is the agent, inviter is the client
        expect(db.customerRelationship.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { agentUserId_policyholderUserId: { agentUserId: 'adv-1', policyholderUserId: 'ph-1' } },
                create: expect.objectContaining({ agentUserId: 'adv-1', policyholderUserId: 'ph-1', status: 'active' }),
            })
        )
    })

    it('is idempotent on the role when the advisor is already an agent', async () => {
        db.invite.findUnique.mockResolvedValue(invite)
        db.user.findUnique.mockResolvedValue({ email: 'advisor@example.gr', roles: 'agent' })
        mockGetAuthOrNull.mockResolvedValue({ dbUser: { id: 'adv-1' } })

        await redeemInvite('tok123')

        expect(db.user.update).not.toHaveBeenCalled()
        expect(mockUpdateUserById).not.toHaveBeenCalled()
        expect(db.customerRelationship.upsert).toHaveBeenCalled()
    })

    it('refuses on an email mismatch (wrong-recipient click leaves the invite valid)', async () => {
        db.invite.findUnique.mockResolvedValue(invite)
        db.user.findUnique.mockResolvedValue({ email: 'someone-else@example.gr', roles: 'policyholder' })
        mockGetAuthOrNull.mockResolvedValue({ dbUser: { id: 'adv-1' } })

        await redeemInvite('tok123')

        expect(db.invite.update).not.toHaveBeenCalled()
        expect(db.customerRelationship.upsert).not.toHaveBeenCalled()
    })
})
