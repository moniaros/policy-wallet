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
// createRun pre-loads admin runtime overrides (Phase 6b); unstable_cache needs
// a Next server context, so stub the cached reader — {} = pure env behavior.
vi.mock('@/lib/services/ai/runtime-config', () => ({
    getAiRuntimeOverrides: vi.fn(async () => ({})),
}))
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
const AGENT_ID = 'agent-77'
const POLICY = {
    id: 'pol-1',
    ownerUserId: OWNER_ID,
    // The agent in these fixtures is the MANAGING agent — the one who uploaded
    // this policy for the customer. That is what authorizes them to spend
    // tokens on it. A bare CustomerRelationship used to be enough, which meant
    // any agent could analyse any policy their customer owned, including ones
    // the customer had uploaded privately.
    createdByUserId: AGENT_ID,
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

    // A CustomerRelationship is not consent — an agent creates one unilaterally
    // by typing an email address. Accepting it as authority to analyse let any
    // agent read the document bytes of ANY policy their customer owned, including
    // the ones the customer had uploaded privately, and bill the tokens for it.
    // Authority is: owner, a write/manage grant, or the agent who uploaded THIS
    // policy — the same rule computePolicyAccess.canAnalyze applies.
    it('refuses an agent who has a relationship but did not upload this policy', async () => {
        mockPolicyFind.mockResolvedValue({ ...POLICY, createdByUserId: 'some-other-agent' })
        vi.mocked(db.accessGrant.findFirst).mockResolvedValue(null)
        vi.mocked(db.accessGrant.findMany).mockResolvedValue([] as any)
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: 'rel-1' } as any)

        const orchestrator = new PolicyAnalysisOrchestratorService()

        await expect(orchestrator.createRun('pol-1', AGENT_ID)).rejects.toThrow(
            /Unauthorized access to policy/
        )
    })
})

// The GapAnalysisService consent-gate tests lived here until Aug 2026. That
// service's analyzePolicy() was a third, unreachable gap pipeline and has been
// deleted, so the gate it guarded no longer exists to test. The gate that DOES
// run — orchestrator.createRun / extractBasicSummary — is covered above; those
// are the only paths that can reach an AI provider with a document.

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
