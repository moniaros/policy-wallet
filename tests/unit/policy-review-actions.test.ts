import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for every side-effecting module that actions.ts pulls in ---
// (same stub set as share-policy.test.ts)

const mockGetAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: unknown[]) => mockGetAuthenticatedUserOrNull(...args),
    getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn() },
        accessGrant: { create: vi.fn(), findFirst: vi.fn() },
        invite: { create: vi.fn() },
        customerRelationship: { findUnique: vi.fn(), create: vi.fn() },
        // Defaults matter: the bus awaits each of these, so a bare vi.fn()
        // resolving undefined makes emit throw and silently write nothing.
        notificationEvent: { create: vi.fn(), findFirst: vi.fn(async () => null) },
        notificationPreference: { findMany: vi.fn(async () => []) },
        activityLog: { create: vi.fn() },
        gapInstance: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
        opportunity: { findFirst: vi.fn(), create: vi.fn() },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
}))

// The actions resolve per-policy authorization through this — the matrix
// below drives it directly. isAgentRole stays REAL (pure role parsing).
const mockGetPolicyAccess = vi.fn()
vi.mock('@/lib/policy-access', () => ({
    getPolicyAccess: (...args: unknown[]) => mockGetPolicyAccess(...args),
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

vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/services/ai', () => ({ getAIService: vi.fn() }))
vi.mock('@/lib/services/gap-analysis.service', () => ({ GapAnalysisService: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({
    refreshProtectionScore: vi.fn(() => Promise.resolve()),
    runGapEngine: vi.fn(() => Promise.resolve()),
}))
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
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(),
    resolveAgentEntitlements: vi.fn(),
    canAgentRunAnalysis: vi.fn(),
}))
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn() }))

import { confirmPolicyReview, flagPolicyExtraction, ignoreGap, notifyAgentAboutGap } from '@/app/(protected)/wallet/actions'
import { db } from '@/lib/db'
import { runGapEngine } from '@/lib/services/gap-engine'

const OWNER = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', roles: 'policyholder', preferredLanguage: 'en' }
const AGENT = { id: 'agent-1', email: 'agent@example.com', name: 'Agent', roles: 'agent,policyholder', preferredLanguage: 'en' }
const DUAL_OWNER_AGENT = { ...OWNER, roles: 'policyholder,agent' }

const WRITE_ACCESS = { exists: true, canRead: true, canWrite: true }
const READ_ONLY_ACCESS = { exists: true, canRead: true, canWrite: false }
const NO_ACCESS = { exists: true, canRead: false, canWrite: false }

function policyRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'pol-1',
        ownerUserId: OWNER.id,
        status: 'active',
        policyNumber: 'POL-123',
        insurerName: 'Ethniki',
        lineOfBusiness: 'motor',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        acordData: {
            policy: { issueDate: null },
            extraction: {
                reviewState: 'unconfirmed',
                source: 'gemini',
                confidence: { overall: 88, fields: {} },
            },
        },
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    // Default happy path: a managing agent with write access.
    mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: AGENT })
    mockGetPolicyAccess.mockResolvedValue(WRITE_ACCESS)
    // vi.clearAllMocks() wipes the factory defaults, so the bus's lookups have
    // to be re-armed here or emit resolves undefined and writes nothing.
    ;(db.user.findUnique as any).mockResolvedValue({ email: 'a@x.gr', preferredLanguage: 'en' })
    ;(db.notificationEvent.findFirst as any).mockResolvedValue(null)
    ;(db.notificationPreference.findMany as any).mockResolvedValue([])
})

describe('confirmPolicyReview', () => {
    it('applies column + envelope edits and stamps reviewState=confirmed in one transaction', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        const result = await confirmPolicyReview('pol-1', {
            insurerName: 'Interamerican',
            premiumAmount: 500,
            premiumFrequency: 'monthly',
            issueDate: '2025-12-15',
            sumInsured: 15000,
        })

        expect(result).toEqual({ success: true })
        expect(db.$transaction).toHaveBeenCalledTimes(1)

        const updateArgs = (db.policy.update as any).mock.calls[0][0]
        expect(updateArgs.where).toEqual({ id: 'pol-1' })
        expect(updateArgs.data.insurerName).toBe('Interamerican')
        expect(updateArgs.data.premiumAmount).toBe(500)

        const acord = updateArgs.data.acordData
        expect(acord.policy.issueDate).toBe('2025-12-15')
        expect(acord.policy.premiumFrequency).toBe('monthly')
        // motor → sum insured written to vehicle.estimatedMarketValue
        expect(acord.vehicle.estimatedMarketValue).toBe(15000)
        expect(acord.extraction.reviewState).toBe('confirmed')
        expect(acord.extraction.confirmedAt).toBeTruthy()
        expect(acord.extraction.flaggedAt).toBeNull()

        const logArgs = (db.activityLog.create as any).mock.calls[0][0]
        expect(logArgs.data.actionType).toBe('POLICY_REVIEW_CONFIRMED')
        expect(logArgs.data.metadata.editedFields).toContain('insurerName')
    })

    it('confirms with no edits (stamp only)', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ success: true })

        const updateArgs = (db.policy.update as any).mock.calls[0][0]
        expect(updateArgs.data.insurerName).toBeUndefined()
        expect(updateArgs.data.acordData.extraction.reviewState).toBe('confirmed')
    })

    it('recomputes the owner’s gaps and score after a successful confirm', async () => {
        // The review step exists to correct the AI. Without this, a sum insured
        // an agent just raised keeps showing "underinsured", and a corrected
        // line of business leaves the old branch's gaps — the derived insights
        // silently contradict the human's correction.
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow({ ownerUserId: 'owner-1' }))

        await confirmPolicyReview('pol-1', { sumInsured: 300000 })

        expect(runGapEngine).toHaveBeenCalledTimes(1)
        // Recomputed for the OWNER (cross-policy portfolio rules), not the agent.
        expect(runGapEngine).toHaveBeenCalledWith('owner-1')
    })

    it('does not recompute when the save is rejected', async () => {
        // A recompute on a save that never happened would rebuild gaps from
        // unchanged data for no reason — and, on an auth failure, for a policy
        // the caller may not touch.
        mockGetPolicyAccess.mockResolvedValue(READ_ONLY_ACCESS)
        await confirmPolicyReview('pol-1', { sumInsured: 300000 })
        expect(runGapEngine).not.toHaveBeenCalled()
    })

    it('still succeeds when the recompute throws (best-effort)', async () => {
        // A failed recompute must never undo a save that already committed.
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())
        ;(runGapEngine as any).mockRejectedValueOnce(new Error('engine down'))

        const result = await confirmPolicyReview('pol-1', { premiumAmount: 400 })
        expect(result).toEqual({ success: true })
        expect(db.$transaction).toHaveBeenCalledTimes(1)
    })

    it('derives the sum-insured target from the post-edit line of business', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        await confirmPolicyReview('pol-1', { lineOfBusiness: 'home', sumInsured: 200000 })

        const acord = (db.policy.update as any).mock.calls[0][0].data.acordData
        expect(acord.property.insuredValue).toBe(200000)
        expect(acord.vehicle).toBeUndefined()
    })

    // ── Authorization matrix: the review is an agent-only step ──

    it('rejects a b2c owner without the agent role', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: OWNER })
        // The owner can read AND write their own policy — role is what denies.
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true, isOwner: true })
        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('allows a dual-role owner-agent on their own policy', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: DUAL_OWNER_AGENT })
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true, isOwner: true })
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow({ ownerUserId: DUAL_OWNER_AGENT.id }))
        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ success: true })
    })

    it('rejects an agent with only a read grant', async () => {
        mockGetPolicyAccess.mockResolvedValue(READ_ONLY_ACCESS)
        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('returns Not found for a stranger (no existence leak)', async () => {
        mockGetPolicyAccess.mockResolvedValue(NO_ACCESS)
        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ error: 'Not found' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects while analysis is running', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow({ status: 'analyzing' }))
        const result = await confirmPolicyReview('pol-1', {})
        expect(result).toEqual({ error: 'ANALYSIS_IN_PROGRESS' })
    })

    it('rejects endDate before startDate against effective values', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())
        const result = await confirmPolicyReview('pol-1', { endDate: '2025-01-01' })
        expect(result).toEqual({ error: 'END_DATE_BEFORE_START' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects invalid input', async () => {
        const result = await confirmPolicyReview('pol-1', { premiumAmount: -5 } as any)
        expect(result).toEqual({ error: 'Invalid input' })
    })
})

describe('flagPolicyExtraction', () => {
    it('stamps reviewState=flagged and records notificationEvent + activityLog', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        const result = await flagPolicyExtraction('pol-1', 'The premium is wrong')
        expect(result).toEqual({ success: true })

        const updateArgs = (db.policy.update as any).mock.calls[0][0]
        expect(updateArgs.data.acordData.extraction.reviewState).toBe('flagged')
        expect(updateArgs.data.acordData.extraction.flaggedAt).toBeTruthy()
        expect(updateArgs.data.acordData.extraction.flagReason).toBe('The premium is wrong')
        // Columns untouched — soft gate
        expect(updateArgs.data.insurerName).toBeUndefined()
        expect(updateArgs.data.status).toBeUndefined()

        const eventArgs = (db.notificationEvent.create as any).mock.calls[0][0]
        expect(eventArgs.data.eventType).toBe('extraction_flagged')
        expect(eventArgs.data.relatedObjectType).toBe('policy')
        expect(eventArgs.data.relatedObjectId).toBe('pol-1')

        const logArgs = (db.activityLog.create as any).mock.calls[0][0]
        expect(logArgs.data.actionType).toBe('POLICY_EXTRACTION_FLAGGED')
        expect(logArgs.data.metadata.reason).toBe('The premium is wrong')
        expect(logArgs.data.metadata.overallConfidence).toBe(88)
        expect(logArgs.data.metadata.provider).toBe('gemini')
    })

    it('truncates the reason to 500 chars and tolerates an empty reason', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        await flagPolicyExtraction('pol-1', 'x'.repeat(600))
        const first = (db.policy.update as any).mock.calls[0][0]
        expect(first.data.acordData.extraction.flagReason).toHaveLength(500)

        vi.clearAllMocks()
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: AGENT })
        mockGetPolicyAccess.mockResolvedValue(WRITE_ACCESS)
        ;(db.policy.findUnique as any).mockResolvedValue(policyRow())

        const result = await flagPolicyExtraction('pol-1')
        expect(result).toEqual({ success: true })
        const second = (db.policy.update as any).mock.calls[0][0]
        expect(second.data.acordData.extraction.flagReason).toBeNull()
    })

    it('rejects a b2c owner without the agent role', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: OWNER })
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true, isOwner: true })
        const result = await flagPolicyExtraction('pol-1', 'nope')
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('returns Not found for a stranger (no existence leak)', async () => {
        mockGetPolicyAccess.mockResolvedValue(NO_ACCESS)
        const result = await flagPolicyExtraction('pol-1', 'nope')
        expect(result).toEqual({ error: 'Not found' })
        expect(db.$transaction).not.toHaveBeenCalled()
    })
})

/**
 * Dismissing a coverage gap mutates the owner's coverage picture and moves their
 * protection score — it is a WRITE. It checked only that a grant EXISTED, not its
 * permission level, so a view-only agent could ignore a customer's gap. It must
 * gate on canWrite, like every other policy write.
 */
describe('ignoreGap — dismissing a gap is a write, not a read', () => {
    const gapRow = (ownerUserId = OWNER.id) => ({
        id: 'gap-1',
        policyId: 'pol-1',
        policy: { id: 'pol-1', ownerUserId },
    })

    beforeEach(() => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: AGENT })
        ;(db.gapInstance.findFirst as any).mockResolvedValue(gapRow())
    })

    it('rejects a view-only agent and does NOT dismiss the gap', async () => {
        mockGetPolicyAccess.mockResolvedValue(READ_ONLY_ACCESS)
        const result = await ignoreGap('gap-1')
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.gapInstance.update).not.toHaveBeenCalled()
    })

    it('lets an agent with write access dismiss it', async () => {
        mockGetPolicyAccess.mockResolvedValue(WRITE_ACCESS)
        const result = await ignoreGap('gap-1')
        expect(result).toEqual({ success: true })
        expect(db.gapInstance.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'gap-1' }, data: { status: 'ignored' } })
        )
    })

    it('checks access against the gap’s own policy', async () => {
        mockGetPolicyAccess.mockResolvedValue(WRITE_ACCESS)
        await ignoreGap('gap-1')
        expect(mockGetPolicyAccess).toHaveBeenCalledWith('pol-1', expect.objectContaining({ id: AGENT.id }))
    })

    it('returns not-found for a missing gap without touching access', async () => {
        ;(db.gapInstance.findFirst as any).mockResolvedValue(null)
        const result = await ignoreGap('gap-x')
        expect(result).toEqual({ error: 'Gap not found' })
    })
})

/**
 * "Ask my agent about this gap" is policyholder-initiated: the relationship is
 * looked up with the CALLER as the policyholder. Allowing a non-owner through a
 * grant made no sense — it would mint the opportunity in the caller's OWN agent
 * relationship, cross-linking this owner's gap. Owner-only, like updateGapStatus.
 */
describe('notifyAgentAboutGap — owner-only', () => {
    it('rejects a non-owner EVEN WITH an active grant, and mints no opportunity', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: AGENT }) // not the owner
        ;(db.policy.findUnique as any).mockResolvedValue({ id: 'pol-1', ownerUserId: OWNER.id })
        // A grant exists — the OLD owner-or-grant check would let the agent past
        // here; owner-only must still reject before any relationship/opportunity.
        ;(db.accessGrant.findFirst as any).mockResolvedValue({ id: 'grant-1', permissions: 'edit' })

        const result = await notifyAgentAboutGap('gap-1', 'pol-1')

        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.opportunity.create).not.toHaveBeenCalled()
    })

    it('returns not-found for a missing policy', async () => {
        ;(db.policy.findUnique as any).mockResolvedValue(null)
        const result = await notifyAgentAboutGap('gap-1', 'pol-x')
        expect(result).toEqual({ error: 'Policy not found' })
    })
})
