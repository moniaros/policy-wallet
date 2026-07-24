import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock side-effecting dependencies BEFORE importing the services ──
vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn(), update: vi.fn() },
        policyDocument: { updateMany: vi.fn() },
        policyAnalysisRun: { create: vi.fn(), update: vi.fn() },
        gapDefinition: { count: vi.fn() },
        user: { findUnique: vi.fn(), updateMany: vi.fn() },
        accessGrant: { findFirst: vi.fn(), findMany: vi.fn(async () => []) },
        customerRelationship: { findFirst: vi.fn() },
    },
}))

vi.mock('@/lib/env', () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: 'gemini-test',
        GEMINI_MODEL_EXTRACTION: 'gemini-test',
        GEMINI_MODEL_GAP_ANALYSIS: 'gemini-test',
        GEMINI_MODEL_QA: 'gemini-test',
        GEMINI_MODEL_FALLBACK: 'gemini-test',
        FF_AI_FAILOVER_OPENAI: 'false',
        FF_AI_DEGRADED_COMPLETION: 'true',
        FF_AI_REMEDIATION_ALERTS: 'false',
        FF_AI_REMEDIATION_CANARY_MODE: 'off',
        AI_ALLOW_FULL_FAILOVER: 'true',
    },
}))

vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/token-tracking', () => ({
    canUserUseTokens: vi.fn(),
    reserveTokens: vi.fn(),
    releaseTokenReservation: vi.fn(),
}))
vi.mock('@/lib/services/ai', () => ({
    getAIService: vi.fn(() => ({ isAvailable: () => false, getServiceName: () => 'mock' })),
}))
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({ tier: 'plus', limits: {} })),
    // Agent-initiated runs now resolve queue priority from the agent tier.
    resolveAgentEntitlements: vi.fn(async () => ({ tier: 'agent_pro', limits: { priorityQueue: true } })),
}))

const mockRefresh = vi.fn((..._a: unknown[]) => Promise.resolve({} as any))
vi.mock('@/lib/services/gap-engine', () => ({
    refreshProtectionScore: (...a: unknown[]) => mockRefresh(...a),
}))

import { db } from '@/lib/db'
import { canUserUseTokens } from '@/lib/token-tracking'
import { resolveUserEntitlements } from '@/lib/subscription-entitlements'
import { getAIService } from '@/lib/services/ai'
import { PolicyAnalysisOrchestratorService } from '@/lib/services/analysis/policy-analysis-orchestrator.service'
import { GapAnalysisService } from '@/lib/services/gap-analysis.service'
import { AppError } from '@/lib/errors/app-error'

const mockPolicyFind = vi.mocked(db.policy.findUnique)
const mockPolicyUpdate = vi.mocked(db.policy.update)
const mockDocsUpdate = vi.mocked(db.policyDocument.updateMany)
const mockRunCreate = vi.mocked(db.policyAnalysisRun.create)
const mockGapCount = vi.mocked(db.gapDefinition.count)
const mockUserFind = vi.mocked(db.user.findUnique)
const mockTokenGate = vi.mocked(canUserUseTokens)
const mockEntitlements = vi.mocked(resolveUserEntitlements)
const mockUserUpdateMany = vi.mocked(db.user.updateMany)
const mockGetAIService = vi.mocked(getAIService)

const OWNER_ID = 'owner-1'
const POLICY = {
    id: 'pol-1',
    ownerUserId: OWNER_ID,
    lineOfBusiness: 'motor',
    documents: [],
    acordData: {},
} as any

beforeEach(() => {
    vi.clearAllMocks()
    mockPolicyFind.mockResolvedValue(POLICY)
    mockGapCount.mockResolvedValue(3)
    mockTokenGate.mockResolvedValue({ allowed: true } as any)
    mockRunCreate.mockImplementation((async ({ data }: any) => ({ id: 'run-1', ...data })) as any)
    mockUserUpdateMany.mockResolvedValue({ count: 1 } as any)
})

describe('AI-processing consent gate — orchestrator createRun (GDPR Art. 9)', () => {
    it('blocks the run with AI_CONSENT_REQUIRED when the owner has no consent, before any status mutation', async () => {
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: null } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', OWNER_ID)

        expect(run.status).toBe('blocked')
        expect(run.failureCode).toBe('AI_CONSENT_REQUIRED')
        expect(run.blockedReason).toBe('ai_consent_missing')
        // The consent check must be against the policy OWNER
        expect(mockUserFind).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: OWNER_ID } })
        )
        // No policy/document churn and no token accounting for a consent-blocked attempt
        expect(mockPolicyUpdate).not.toHaveBeenCalled()
        expect(mockDocsUpdate).not.toHaveBeenCalled()
        expect(mockTokenGate).not.toHaveBeenCalled()
    })

    it('proceeds to a queued run (token gate consulted) when a Plus owner has consented', async () => {
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: '2026-07' } as any)
        // Deep analysis is Plus-only (code tier `pro`).
        mockEntitlements.mockResolvedValue({ tier: 'pro', limits: {} } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', OWNER_ID)

        expect(run.status).toBe('queued')
        expect(mockTokenGate).toHaveBeenCalledTimes(1)
        expect(mockPolicyUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'analyzing' } })
        )
    })

    it("checks the OWNER's consent, not the initiator's, when an agent triggers the run", async () => {
        // Agent with an active relationship (loadAuthorizedPolicy allows this path)
        vi.mocked(db.accessGrant.findFirst).mockResolvedValue(null)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: null } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', 'agent-77')

        expect(run.status).toBe('blocked')
        expect(run.failureCode).toBe('AI_CONSENT_REQUIRED')
        expect(mockUserFind).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: OWNER_ID } })
        )
    })
})

describe('AI-processing consent gate — legacy GapAnalysisService.analyzePolicy', () => {
    const makeDb = (consentVersion: string | null) => ({
        policy: {
            findUnique: vi.fn(async () => POLICY),
        },
        user: {
            findUnique: vi.fn(async () => ({ aiProcessingConsentVersion: consentVersion })),
        },
        gapDefinition: { findMany: vi.fn(async () => []) },
        gapInstance: { deleteMany: vi.fn() },
        accessGrant: { findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []) },
        customerRelationship: { findFirst: vi.fn(async () => null) },
    }) as any

    it('rejects with AI_CONSENT_REQUIRED before touching gaps or the AI service when consent is missing', async () => {
        const fakeDb = makeDb(null)
        const service = new GapAnalysisService(fakeDb)

        await expect(service.analyzePolicy('pol-1', OWNER_ID, 'en')).rejects.toSatisfy((e: unknown) => {
            expect(e).toBeInstanceOf(AppError)
            expect((e as AppError).metadata?.reason).toBe('AI_CONSENT_REQUIRED')
            return true
        })

        expect(fakeDb.gapInstance.deleteMany).not.toHaveBeenCalled()
        expect(mockGetAIService).not.toHaveBeenCalled()
    })

    it('passes the gate when the owner has consented (proceeds into gap-definition flow)', async () => {
        const fakeDb = makeDb('2026-07')
        const service = new GapAnalysisService(fakeDb)

        // With zero gap definitions the service returns early, success — proving the
        // consent gate passed without needing the AI provider.
        const result = await service.analyzePolicy('pol-1', OWNER_ID, 'en')
        expect(result.success).toBe(true)
        expect(result.count).toBe(0)
    })
})

describe('basic summary (free/Starter path) recomputes the owner’s gaps + score', () => {
    // The deep AI gap analysis is Plus-only, but the deterministic profile gaps
    // and the protection score are free-tier features that need no tokens. This
    // path — a new user's first policy at onboarding — extracted and marked the
    // policy active but never recomputed, so their first impression was an empty
    // score and no gaps until a once-daily cron caught up.
    it('runs the gap engine for the OWNER, even when an agent triggers the extraction', async () => {
        // Owner ≠ actor: the recompute must target whose coverage the policy is,
        // not who pressed the button (the initiator-vs-owner trap).
        vi.mocked(db.accessGrant.findFirst).mockResolvedValue(null)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: '2026-07' } as any)
        mockPolicyFind.mockResolvedValue({ ...POLICY, documents: [{ id: 'doc-1' }] } as any)
        mockGetAIService.mockReturnValue({
            isAvailable: () => true,
            getServiceName: () => 'mock',
            extractPolicyData: vi.fn(async () => ({ insurerName: 'ΕΘΝΙΚΗ' })),
        } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        // Stub the document/metadata seams; the recompute wiring is what's under test.
        ;(orchestrator as any).prepareDocument = vi.fn(async () => ({ document: { bytes: 'x' } }))
        ;(orchestrator as any).buildMetadata = vi.fn(() => ({
            insurerName: 'ΕΘΝΙΚΗ', policyNumber: 'P-1', lineOfBusiness: 'motor',
            startDate: null, endDate: null, premiumAmount: null, coverageSummary: null,
        }))

        const result = await orchestrator.extractBasicSummary('pol-1', 'agent-77')

        expect(result.status).toBe('completed')
        expect(mockRefresh).toHaveBeenCalledWith(OWNER_ID)
        expect(mockRefresh).not.toHaveBeenCalledWith('agent-77')
    })

    it('does not recompute when the owner has not consented (blocked before extraction)', async () => {
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: null } as any)
        mockPolicyFind.mockResolvedValue({ ...POLICY, documents: [{ id: 'doc-1' }] } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const result = await orchestrator.extractBasicSummary('pol-1', OWNER_ID)

        expect(result.status).toBe('blocked')
        expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('does not recompute when extraction fails', async () => {
        mockUserFind.mockResolvedValue({ aiProcessingConsentVersion: '2026-07' } as any)
        mockPolicyFind.mockResolvedValue({ ...POLICY, documents: [{ id: 'doc-1' }] } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        ;(orchestrator as any).prepareDocument = vi.fn(async () => { throw new Error('doc gone') })

        const result = await orchestrator.extractBasicSummary('pol-1', OWNER_ID)

        expect(result.status).toBe('failed')
        expect(mockRefresh).not.toHaveBeenCalled()
    })
})

describe('AI paywall — deep analysis is Plus-only (orchestrator createRun)', () => {
    const CONSENTED_OWNER = { aiProcessingConsentVersion: '2026-07' }

    it('blocks a free policyholder — deep AI requires Plus, no trial run', async () => {
        mockEntitlements.mockResolvedValue({ tier: 'free', limits: {} } as any)
        // 1st user lookup: owner consent; 2nd: initiator roles
        mockUserFind
            .mockResolvedValueOnce(CONSENTED_OWNER as any)
            .mockResolvedValueOnce({ roles: 'policyholder' } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', OWNER_ID)

        expect(run.status).toBe('blocked')
        expect(run.failureCode).toBe('UPGRADE_REQUIRED')
        expect(run.blockedReason).toBe('free_tier_ai_locked')
        expect(mockTokenGate).not.toHaveBeenCalled()
        expect(mockUserUpdateMany).not.toHaveBeenCalled()
    })

    it('blocks a Starter (code `plus`) policyholder too — Starter has no deep AI', async () => {
        mockEntitlements.mockResolvedValue({ tier: 'plus', limits: {} } as any)
        mockUserFind
            .mockResolvedValueOnce(CONSENTED_OWNER as any)
            .mockResolvedValueOnce({ roles: 'policyholder' } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', OWNER_ID)

        expect(run.status).toBe('blocked')
        expect(run.failureCode).toBe('UPGRADE_REQUIRED')
        expect(mockPolicyUpdate).not.toHaveBeenCalled()
    })

    it('queues for a Plus (code `pro`) policyholder and applies the token gate', async () => {
        mockEntitlements.mockResolvedValue({ tier: 'pro', limits: {} } as any)
        mockUserFind
            .mockResolvedValueOnce(CONSENTED_OWNER as any)
            .mockResolvedValueOnce({ roles: 'policyholder' } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', OWNER_ID)

        expect(run.status).toBe('queued')
        expect(mockTokenGate).toHaveBeenCalledTimes(1)
    })

    it('never applies the policyholder paywall to agent initiators (agent budgets meter them)', async () => {
        mockEntitlements.mockResolvedValue({ tier: 'free', limits: {} } as any)
        vi.mocked(db.accessGrant.findFirst).mockResolvedValue(null)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
        mockUserFind
            .mockResolvedValueOnce(CONSENTED_OWNER as any)
            .mockResolvedValueOnce({ roles: 'agent', trialAnalysisUsedAt: null } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun('pol-1', 'agent-77')

        expect(run.status).toBe('queued')
        expect(mockUserUpdateMany).not.toHaveBeenCalled()
        expect(mockTokenGate).toHaveBeenCalledTimes(1)
    })
})
