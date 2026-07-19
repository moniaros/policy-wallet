import { describe, it, expect, vi, beforeEach } from 'vitest'

// Manual re-analysis is a paid feature for agent-role users: agent_free may
// not trigger runPolicyAnalysis (upload-time auto-analysis is a different
// path and stays available within the monthly cap). B2C users are unaffected
// here — their gate is the orchestrator's pro-tier check.

const mockGetAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: unknown[]) => mockGetAuthenticatedUserOrNull(...args),
    getAuthenticatedUser: vi.fn(),
}))

const mockCreateRun = vi.fn()
const mockExecuteRun = vi.fn()
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    // Must be constructible — the action calls `new PolicyAnalysisOrchestratorService()`.
    PolicyAnalysisOrchestratorService: vi.fn(function (this: unknown) {
        return { createRun: mockCreateRun, executeRun: mockExecuteRun }
    }),
}))

const mockGetPolicyAccess = vi.fn()
vi.mock('@/lib/policy-access', () => ({
    getPolicyAccess: (...args: unknown[]) => mockGetPolicyAccess(...args),
}))

const mockResolveAgentEntitlements = vi.fn()
const mockCanAgentRunAnalysis = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(),
    resolveAgentEntitlements: (...args: unknown[]) => mockResolveAgentEntitlements(...args),
    canAgentRunAnalysis: (...args: unknown[]) => mockCanAgentRunAnalysis(...args),
}))

vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn() },
        notificationEvent: { create: vi.fn() },
        activityLog: { create: vi.fn() },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
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
import { db } from '@/lib/db'

const FREE_AGENT = { id: 'agent-free', email: 'a@x.gr', roles: 'agent', preferredLanguage: 'en' }
const PAID_AGENT = { id: 'agent-paid', email: 'p@x.gr', roles: 'agent', preferredLanguage: 'en' }
const B2C_PRO = { id: 'user-pro', email: 'u@x.gr', roles: 'policyholder', preferredLanguage: 'en' }

beforeEach(() => {
    vi.clearAllMocks()
    ;(db.policy.findUnique as any).mockResolvedValue({ id: 'pol-1', ownerUserId: 'cust-1', policyNumber: 'P-1' })
    mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true, canAnalyze: true })
    mockCreateRun.mockResolvedValue({ id: 'run-1', status: 'queued' })
})

describe('runPolicyAnalysis — paid-agent gate on manual re-analysis', () => {
    it('blocks agent_free with AGENT_UPGRADE_REQUIRED before any run is created', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: FREE_AGENT })
        mockResolveAgentEntitlements.mockResolvedValue({ tier: 'agent_free', isPaid: false })

        const result = await runPolicyAnalysis('pol-1')
        expect(result).toEqual({ error: 'AGENT_UPGRADE_REQUIRED' })
        expect(mockCreateRun).not.toHaveBeenCalled()
        expect(mockCanAgentRunAnalysis).not.toHaveBeenCalled()
    })

    it('lets a paid agent through to the monthly cap check and the run', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: PAID_AGENT })
        mockResolveAgentEntitlements.mockResolvedValue({ tier: 'agent_starter', isPaid: true })
        mockCanAgentRunAnalysis.mockResolvedValue({ allowed: true, used: 1, limit: 50 })

        const result = await runPolicyAnalysis('pol-1')
        expect(mockCanAgentRunAnalysis).toHaveBeenCalledWith(PAID_AGENT.id)
        expect(mockCreateRun).toHaveBeenCalledWith('pol-1', PAID_AGENT.id)
        expect(result).toMatchObject({ success: true, runId: 'run-1' })
    })

    it('still enforces the monthly cap for paid agents', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: PAID_AGENT })
        mockResolveAgentEntitlements.mockResolvedValue({ tier: 'agent_pro', isPaid: true })
        mockCanAgentRunAnalysis.mockResolvedValue({ allowed: false, used: 200, limit: 200 })

        const result = await runPolicyAnalysis('pol-1')
        expect('error' in result && String((result as any).error)).toContain('200/200')
        expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('does not consult agent entitlements for b2c users (orchestrator pro gate applies)', async () => {
        mockGetAuthenticatedUserOrNull.mockResolvedValue({ dbUser: B2C_PRO })

        const result = await runPolicyAnalysis('pol-1')
        expect(mockResolveAgentEntitlements).not.toHaveBeenCalled()
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
        expect(mockResolveAgentEntitlements).not.toHaveBeenCalled()
    })
})
