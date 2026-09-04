import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock side-effecting dependencies BEFORE importing the action module ──
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn() },
        user: { findUnique: vi.fn() },
        accessGrant: { findFirst: vi.fn() },
        customerRelationship: { findFirst: vi.fn() },
        // The bus reads preferences and checks the dedupe key before writing.
        notificationEvent: { create: vi.fn(), findFirst: vi.fn() },
        notificationPreference: { findMany: vi.fn() },
        invite: { create: vi.fn() },
    },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/services/ai/ai-service.factory', () => ({
    AIServiceFactory: {},
    getAIService: vi.fn(() => ({ isAvailable: () => false })),
}))
vi.mock('@/lib/services/customer.service', () => ({ CustomerService: class {} }))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: {} }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { sendPolicyInviteEmail, sendAiConsentRequestEmail } from '@/lib/email/invite-emails'
import { requestAiConsent } from '@/app/(protected)/agent/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockPolicyFind = vi.mocked(db.policy.findUnique)
const mockUserFind = vi.mocked(db.user.findUnique)
const mockGrantFind = vi.mocked(db.accessGrant.findFirst)
const mockNotifCreate = vi.mocked(db.notificationEvent.create)
const mockInviteCreate = vi.mocked(db.invite.create)

const AGENT = { dbUser: { id: 'agent-1', roles: 'agent', name: 'Agent A', email: 'a@x.gr' } } as any
const POLICY = { id: 'pol-1', ownerUserId: 'owner-1', policyNumber: 'P-1' } as any

beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(AGENT)
    mockPolicyFind.mockResolvedValue(POLICY)
    mockGrantFind.mockResolvedValue({ id: 'grant-1' } as any)
    mockNotifCreate.mockResolvedValue({} as any)
    vi.mocked(db.notificationEvent.findFirst).mockResolvedValue(null as any)
    vi.mocked(db.notificationPreference.findMany).mockResolvedValue([] as any)
    mockInviteCreate.mockImplementation((async ({ data }: any) => ({ id: 'inv-1', ...data })) as any)
})

describe('requestAiConsent — agent asks the policy owner instead of being dead-ended', () => {
    it('rejects non-agent callers', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'u1', roles: 'policyholder' } } as any)
        const res = await requestAiConsent('pol-1')
        expect(res).toEqual({ error: 'UNAUTHORIZED' })
        expect(mockNotifCreate).not.toHaveBeenCalled()
    })

    it('rejects agents with no grant or relationship to the owner', async () => {
        mockGrantFind.mockResolvedValue(null)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue(null)
        const res = await requestAiConsent('pol-1')
        expect(res).toEqual({ error: 'UNAUTHORIZED' })
    })

    it('short-circuits when the owner already consented', async () => {
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: '2026-07' } as any)
        const res = await requestAiConsent('pol-1')
        expect(res).toEqual({ success: true, mode: 'already_consented' })
        expect(mockNotifCreate).not.toHaveBeenCalled()
        expect(mockInviteCreate).not.toHaveBeenCalled()
    })

    it('sends an in-app notification + email when the owner has a usable account', async () => {
        mockUserFind.mockResolvedValue({
            id: 'owner-1', email: 'o@x.gr', preferredLanguage: 'el',
            emailVerified: new Date(), lastActiveAt: new Date(), aiProcessingConsentVersion: null,
        } as any)

        const res = await requestAiConsent('pol-1')

        expect(res).toEqual({ success: true, mode: 'notification', emailDelivered: true })
        expect(mockNotifCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'owner-1',
                    eventType: 'ai_consent_request',
                    relatedObjectId: 'pol-1',
                }),
            })
        )
        expect(sendAiConsentRequestEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'o@x.gr', language: 'el' })
        )
        expect(mockInviteCreate).not.toHaveBeenCalled()
    })

    it('sends a typed signup invite when the customer has no usable account', async () => {
        mockUserFind.mockResolvedValue({
            id: 'owner-1', email: 'placeholder@x.gr', preferredLanguage: 'el',
            emailVerified: null, lastActiveAt: null, aiProcessingConsentVersion: null,
        } as any)

        const res = await requestAiConsent('pol-1')

        expect(res).toMatchObject({ success: true, mode: 'invite', emailDelivered: true })
        expect(mockInviteCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    inviteType: 'signup',
                    relationshipType: 'agent_client',
                    scope: 'policy:pol-1',
                }),
            })
        )
        expect(sendPolicyInviteEmail).toHaveBeenCalled()
        expect(mockNotifCreate).not.toHaveBeenCalled()
    })
})
