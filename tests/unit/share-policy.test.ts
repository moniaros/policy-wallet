import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for every side-effecting module that actions.ts pulls in ---

const mockGetAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: unknown[]) => mockGetAuthenticatedUserOrNull(...args),
    getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn() },
        user: { findUnique: vi.fn() },
        accessGrant: { create: vi.fn() },
        invite: { create: vi.fn() },
        customerRelationship: { findUnique: vi.fn(), create: vi.fn() },
        notificationEvent: { create: vi.fn() },
        activityLog: { create: vi.fn() },
    },
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(),
    sendPolicySharedAccessEmail: vi.fn(),
}))

vi.mock('@/lib/services/collaboration.service', () => ({
    collaborationService: { ensureAutomationThread: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn((fn: () => unknown) => fn?.()) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// Heavy service modules that are imported at the top of actions.ts but unused by
// sharePolicy — stub them so importing the module never hits real side effects.
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/services/ai', () => ({ getAIService: vi.fn() }))
vi.mock('@/lib/services/gap-analysis.service', () => ({ GapAnalysisService: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/services/policy.service', () => ({ PolicyService: vi.fn() }))
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    PolicyAnalysisOrchestratorService: vi.fn(),
}))
vi.mock('@/lib/token-tracking', () => ({ canUserUseTokens: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({
    canUserAddPolicy: vi.fn(),
    canUserUseFeature: vi.fn(),
    getUpgradeMessage: vi.fn(),
    getUserSubscription: vi.fn(),
    SUBSCRIPTION_LIMITS: {},
}))
vi.mock('@/lib/subscription-entitlements', () => ({ resolveUserEntitlements: vi.fn() }))
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn() }))

import { sharePolicy } from '@/app/(protected)/wallet/actions'
import { db } from '@/lib/db'

const OWNER_ID = 'owner-1'
const AGENT_EMAIL = 'agent@example.com'

describe('sharePolicy ownership gate', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetAuthenticatedUserOrNull.mockResolvedValue({
            dbUser: {
                id: OWNER_ID,
                email: 'owner@example.com',
                name: 'Owner',
                preferredLanguage: 'en',
            },
        })
    })

    it('lets the owner share their own policy', async () => {
        // Ownership gate + later detail lookups all read from the same findUnique mock.
        vi.mocked(db.policy.findUnique).mockResolvedValue({
            ownerUserId: OWNER_ID,
            policyNumber: 'PN-1',
            insurerName: 'Test Insurer',
            lineOfBusiness: 'motor',
        } as any)
        vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'agent-1', email: AGENT_EMAIL } as any)
        // Existing relationship so we skip the create branch.
        vi.mocked(db.customerRelationship.findUnique).mockResolvedValue({ id: 'rel-1' } as any)

        const result = await sharePolicy('policy-1', AGENT_EMAIL, 'view')

        expect(result).toEqual({ success: true })
        expect(db.accessGrant.create).toHaveBeenCalledTimes(1)
        expect(db.accessGrant.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    granterUserId: OWNER_ID,
                    granteeUserId: 'agent-1',
                    scope: 'policy:policy-1',
                }),
            })
        )
    })

    it('rejects a non-owner and creates no grant or invite', async () => {
        vi.mocked(db.policy.findUnique).mockResolvedValue({ ownerUserId: 'someone-else' } as any)

        const result = await sharePolicy('policy-1', AGENT_EMAIL, 'view')

        expect(result).toEqual({ error: 'You do not have permission to share this policy' })
        expect(db.accessGrant.create).not.toHaveBeenCalled()
        expect(db.invite.create).not.toHaveBeenCalled()
        // Should bail before even looking up the agent.
        expect(db.user.findUnique).not.toHaveBeenCalled()
    })

    it('rejects an unknown policy id', async () => {
        vi.mocked(db.policy.findUnique).mockResolvedValue(null as any)

        const result = await sharePolicy('missing', AGENT_EMAIL, 'view')

        expect(result).toEqual({ error: 'Policy not found' })
        expect(db.accessGrant.create).not.toHaveBeenCalled()
        expect(db.invite.create).not.toHaveBeenCalled()
    })
})
