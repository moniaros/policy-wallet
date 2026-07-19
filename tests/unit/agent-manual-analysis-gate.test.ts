import { describe, it, expect, vi, beforeEach } from 'vitest'

// Manual re-analysis is a paying-only feature: the shared gate
// canAgentTriggerManualAnalysis is the ONE place the rule lives, called by
// every manual trigger (runPolicyAnalysis, retryPolicyAnalysis, the review
// route and retry-missing route). Upload-time auto-analysis is a different
// path and is not gated here.

// ── Layer 1: the real helper against a mocked db ────────────────────

vi.mock('@/lib/db', () => ({
    db: {
        subscription: { findFirst: vi.fn() },
        policyAnalysisRun: { count: vi.fn() },
        policy: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn() },
        notificationEvent: { create: vi.fn() },
        activityLog: { create: vi.fn() },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
}))

import { canAgentTriggerManualAnalysis } from '@/lib/subscription-entitlements'
import { db } from '@/lib/db'

/** subscription.findFirst answers by plan type filter. */
function subscriptions({ agentPlan, b2cPlan }: { agentPlan?: string | null; b2cPlan?: string | null }) {
    ;(db.subscription.findFirst as any).mockImplementation(async (args: any) => {
        const planTypeFilter = args?.where?.plan?.planType
        const wantsAgent = planTypeFilter === 'agent'
        const name = wantsAgent ? agentPlan : b2cPlan
        if (!name) return null
        return {
            status: 'active',
            stripeSubscriptionId: 'sub_1',
            currentPeriodEnd: new Date(Date.now() + 86_400_000),
            plan: { name, planType: wantsAgent ? 'agent' : 'policyholder' },
        }
    })
}

describe('canAgentTriggerManualAnalysis (real helper)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(db.policyAnalysisRun.count as any).mockResolvedValue(0)
    })

    it('passes non-agent users through without any lookup', async () => {
        const result = await canAgentTriggerManualAnalysis('u1', 'policyholder')
        expect(result).toEqual({ allowed: true })
        expect(db.subscription.findFirst).not.toHaveBeenCalled()
    })

    it('blocks agent_free with no paid b2c plan', async () => {
        subscriptions({ agentPlan: null, b2cPlan: null })
        const result = await canAgentTriggerManualAnalysis('u1', 'agent')
        expect(result).toEqual({ allowed: false, code: 'AGENT_UPGRADE_REQUIRED' })
    })

    it('allows a paid agent plan (within cap)', async () => {
        subscriptions({ agentPlan: 'agent_starter', b2cPlan: null })
        const result = await canAgentTriggerManualAnalysis('u1', 'agent')
        expect(result).toEqual({ allowed: true })
    })

    it('allows a dual-role user paying for b2c pro even on agent_free', async () => {
        subscriptions({ agentPlan: null, b2cPlan: 'pro' })
        const result = await canAgentTriggerManualAnalysis('u1', 'policyholder,agent')
        expect(result).toEqual({ allowed: true })
    })

    it('blocks a dual-role user on Starter (paid but not the AI tier)', async () => {
        subscriptions({ agentPlan: null, b2cPlan: 'plus' })
        const result = await canAgentTriggerManualAnalysis('u1', 'policyholder,agent')
        expect(result).toEqual({ allowed: false, code: 'AGENT_UPGRADE_REQUIRED' })
    })

    it('enforces the monthly cap even for paid agents', async () => {
        subscriptions({ agentPlan: 'agent_starter', b2cPlan: null })
        ;(db.policyAnalysisRun.count as any).mockResolvedValue(50)
        const result = await canAgentTriggerManualAnalysis('u1', 'agent')
        expect(result).toMatchObject({ allowed: false, code: 'AGENT_ANALYSIS_LIMIT', used: 50 })
    })
})

// ── Layer 2: runPolicyAnalysis maps the gate's answers ──────────────

const mockGetAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: unknown[]) => mockGetAuthenticatedUserOrNull(...args),
    getAuthenticatedUser: vi.fn(),
}))

const mockCreateRun = vi.fn()
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    // Must be constructible — the action calls `new PolicyAnalysisOrchestratorService()`.
    PolicyAnalysisOrchestratorService: vi.fn(function (this: unknown) {
        return { createRun: mockCreateRun, executeRun: vi.fn() }
    }),
}))

const mockGetPolicyAccess = vi.fn()
vi.mock('@/lib/policy-access', () => ({
    getPolicyAccess: (...args: unknown[]) => mockGetPolicyAccess(...args),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })) }))
vi.mock('@/lib/email/invite-emails', () => ({ sendPolicyInviteEmail: vi.fn(), sendPolicySharedAccessEmail: vi.fn() }))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: { ensureAutomationThread: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/services/ai', () => ({ getAIService: vi.fn() }))
vi.mock('@/lib/services/gap-analysis.service', () => ({ GapAnalysisService: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/services/policy.service', () => ({ PolicyService: vi.fn() }))
vi.mock('@/lib/services/analysis/analysis-queue', () => ({ enqueueAnalysisRun: vi.fn(async () => true) }))
vi.mock('@/lib/token-tracking', () => ({ canUserUseTokens: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({
    canUserAddPolicy: vi.fn(),
    canUserUseFeature: vi.fn(),
    getUserSubscription: vi.fn(),
    SUBSCRIPTION_LIMITS: {},
}))
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn() }))

import { runPolicyAnalysis } from '@/app/(protected)/wallet/actions'

const FREE_AGENT = { id: 'agent-free', email: 'a@x.gr', roles: 'agent', preferredLanguage: 'en' }
const PAID_AGENT = { id: 'agent-paid', email: 'p@x.gr', roles: 'agent', preferredLanguage: 'en' }
const B2C_PRO = { id: 'user-pro', email: 'u@x.gr', roles: 'policyholder', preferredLanguage: 'en' }

describe('runPolicyAnalysis — paid-only manual re-analysis', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(db.policy.findUnique as any).mockResolvedValue({ id: 'pol-1', ownerUserId: 'cust-1', policyNumber: 'P-1' })
        ;(db.policyAnalysisRun.count as any).mockResolvedValue(0)
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true, canAnalyze: true })
        mockCreateRun.mockResolvedValue({ id: 'run-1', status: 'queued' })
    })

    it('blocks agent_free with AGENT_UPGRADE_REQUIRED before any run is created', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: FREE_AGENT })
        subscriptions({ agentPlan: null, b2cPlan: null })

        const result = await runPolicyAnalysis('pol-1')
        expect(result).toEqual({ error: 'AGENT_UPGRADE_REQUIRED' })
        expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('lets a paid agent through to the run', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: PAID_AGENT })
        subscriptions({ agentPlan: 'agent_pro', b2cPlan: null })

        const result = await runPolicyAnalysis('pol-1')
        expect(mockCreateRun).toHaveBeenCalledWith('pol-1', PAID_AGENT.id)
        expect(result).toMatchObject({ success: true, runId: 'run-1' })
    })

    it('maps the monthly cap to the localized limit message', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: PAID_AGENT })
        subscriptions({ agentPlan: 'agent_starter', b2cPlan: null })
        ;(db.policyAnalysisRun.count as any).mockResolvedValue(50)

        const result = await runPolicyAnalysis('pol-1')
        expect('error' in result && String((result as any).error)).toContain('50/50')
        expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('passes b2c users straight through (their gate is the orchestrator pro check)', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: B2C_PRO })

        const result = await runPolicyAnalysis('pol-1')
        expect(db.subscription.findFirst).not.toHaveBeenCalled()
        expect(mockCreateRun).toHaveBeenCalledWith('pol-1', B2C_PRO.id)
        expect(result).toMatchObject({ success: true })
    })

    it('surfaces the orchestrator UPGRADE_REQUIRED block for non-paying b2c users', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: B2C_PRO })
        mockCreateRun.mockResolvedValue({ id: 'run-2', status: 'blocked', failureCode: 'UPGRADE_REQUIRED' })

        const result = await runPolicyAnalysis('pol-1')
        expect(result).toEqual({ error: 'UPGRADE_REQUIRED', runId: 'run-2' })
    })

    it('denies read-only grantees before any gate', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: FREE_AGENT })
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: false, canAnalyze: false })

        const result = await runPolicyAnalysis('pol-1')
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(db.subscription.findFirst).not.toHaveBeenCalled()
    })
})
