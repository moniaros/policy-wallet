import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ── Mock side-effecting dependencies BEFORE importing the services ──
vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: vi.fn(), update: vi.fn() },
        policyDocument: { updateMany: vi.fn(), findFirst: vi.fn(async () => null) },
        // createRun returns an in-flight run instead of creating a second one;
        // none is in flight in these fixtures.
        policyAnalysisRun: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn(async () => null) },
        // B0.2: createRun plans the attempted rules from the active catalogue
        // before any gate; an empty catalogue is a valid (empty) plan here.
        gapDefinition: { count: vi.fn(), findMany: vi.fn(async () => []) },
        user: { findUnique: vi.fn(), updateMany: vi.fn() },
        accessGrant: { findFirst: vi.fn(), findMany: vi.fn(async () => []) },
        customerRelationship: { findFirst: vi.fn() },
        // The agent scan writes its AGENT_POLICY_SCANNED audit row here; the
        // document gate writes its own verdict row and reads its budget.
        activityLog: { create: vi.fn(async () => ({})), count: vi.fn(async () => 0) },
    },
}))

// ── The agent scan action's own seams (parsePolicyPdfWithGemini) ──
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/services/customer.service', () => ({ CustomerService: class {} }))
vi.mock('@/lib/services/customer-resolution.service', () => ({
    customerResolutionService: { resolveCustomerCandidates: vi.fn() },
}))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: {} }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))
// Partial: the orchestrator's prompt-overrides wraps its loader in
// unstable_cache at import time, so only revalidatePath is stubbed.
vi.mock('next/cache', async (importOriginal) => ({
    ...(await importOriginal<typeof import('next/cache')>()),
    revalidatePath: vi.fn(),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
const validateUploadFile = vi.fn()
vi.mock('@/lib/security/file-upload', () => ({
    validateUploadFile: (...a: unknown[]) => validateUploadFile(...a),
    sanitizeDisplayName: (s: string) => s,
    REJECTION_MESSAGES: {},
}))
vi.mock('@/lib/services/ai/guard', () => ({
    enforceBillableCallPolicy: vi.fn(async () => ({ allowed: true })),
}))
// The document gate runs on the scan's bytes BEFORE the provider is reached
// (lib/ingestion/document-gate.ts); its own suite covers the verdicts. Here
// it passes the four `%PDF` bytes so this file keeps proving the CONSENT gate.
vi.mock('@/lib/ingestion/document-gate', () => ({
    validateDocumentForIngestion: vi.fn(async () => ({
        status: 'validated',
        documentType: 'insurance_policy',
        insuranceConfidence: 0.9,
        detectedBranch: 'motor',
        branchConfidence: 0.9,
        declaredBranch: null,
        branchConsistency: 'not_declared',
        reviewReasons: [],
        evidence: { pageCount: 1, textChars: 500, imageOnly: false, groupsHit: [], branchScores: {}, negativeType: null, classifier: 'deterministic' },
        documentHash: 'h'.repeat(64),
        engineVersion: 'docgate-1',
        latencyMs: 1,
    })),
    documentKindFor: () => 'policy_schedule',
    GATE_ACTIVITY: { validated: 'DOCUMENT_VALIDATED', requires_review: 'DOCUMENT_REVIEW_REQUIRED', rejected: 'DOCUMENT_REJECTED' },
}))
// The provider the scan reaches. One mock object so the call count is the
// proof that the document did — or did not — leave the building.
const scanProvider = {
    isAvailable: () => true,
    getServiceName: () => 'mock',
    extractPolicyData: vi.fn(async () => ({ insurerName: 'ΕΘΝΙΚΗ' })),
}
vi.mock('@/lib/services/ai/ai-service.factory', () => ({
    AIServiceFactory: {},
    getAIService: vi.fn(() => scanProvider),
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
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { PolicyAnalysisOrchestratorService } from '@/lib/services/analysis/policy-analysis-orchestrator.service'
import { GapAnalysisService } from '@/lib/services/gap-analysis.service'
import { AppError } from '@/lib/errors/app-error'
import { parsePolicyPdfWithGemini } from '@/app/(protected)/agent/actions'

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
    // createRun refuses a policy with no document before any run row exists
    // (MISSING_DOCUMENT); these fixtures are about consent and the paywall.
    documents: [{ id: 'doc-1' }],
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

/* ────────────────────────────────────────────────────────────────────────────
 * THE AGENT SCAN (M2 / owner decision D1).
 *
 * parsePolicyPdfWithGemini sends the document to the model provider BEFORE
 * any customer is resolved, so until Sept 2026 nobody's consent was checked
 * on that path — while /trust promised the opposite. The lawful basis is now
 * the agent's OWN recorded AI-processing consent plus a per-scan attestation
 * that they hold the customer's mandate, both checked before the file is
 * read, and the attestation is written into the AGENT_POLICY_SCANNED row.
 * The deep run still needs the customer's own consent (createRun, above).
 * ──────────────────────────────────────────────────────────────────────────── */
describe('agent scan — the agent consents and attests BEFORE the document is read', () => {
    const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
    const mockAudit = vi.mocked(db.activityLog.create)

    function scanForm(attested: boolean): FormData {
        const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
        const file = new File([bytes], 'policy.pdf', { type: 'application/pdf' })
        // jsdom's File has no arrayBuffer(); the action reads the bytes through it.
        Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer, configurable: true })
        const fd = new FormData()
        fd.append('file', file)
        if (attested) fd.append('attested', 'true')
        return fd
    }

    beforeEach(() => {
        vi.stubEnv('GEMINI_API_KEY', 'test-key')
        validateUploadFile.mockResolvedValue({
            ok: true,
            value: { ext: '.pdf', canonicalMime: 'application/pdf', displayName: 'policy.pdf' },
        })
        scanProvider.extractPolicyData.mockClear()
        mockAudit.mockClear()
    })

    it('refuses with AI_CONSENT_REQUIRED when the agent has no consent — the provider never sees the file', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'agent-77', roles: 'agent', aiProcessingConsentVersion: null } } as any)

        const res = await parsePolicyPdfWithGemini(scanForm(true))

        expect(res).toEqual({ success: false, error: 'AI_CONSENT_REQUIRED' })
        expect(scanProvider.extractPolicyData).not.toHaveBeenCalled()
        // Refused before the body: the file was never even validated.
        expect(validateUploadFile).not.toHaveBeenCalled()
        expect(mockAudit).not.toHaveBeenCalled()
    })

    it('refuses with AGENT_ATTESTATION_REQUIRED without the per-scan mandate attestation', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'agent-77', roles: 'agent', aiProcessingConsentVersion: '2026-07' } } as any)

        const res = await parsePolicyPdfWithGemini(scanForm(false))

        expect(res).toEqual({ success: false, error: 'AGENT_ATTESTATION_REQUIRED' })
        expect(scanProvider.extractPolicyData).not.toHaveBeenCalled()
        expect(validateUploadFile).not.toHaveBeenCalled()
        expect(mockAudit).not.toHaveBeenCalled()
    })

    it('with consent AND attestation: the provider is called once and the audit row carries attested: true', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'agent-77', roles: 'agent', aiProcessingConsentVersion: '2026-07' } } as any)

        const res = await parsePolicyPdfWithGemini(scanForm(true))

        expect(res).toMatchObject({ success: true, data: { insurerName: 'ΕΘΝΙΚΗ' } })
        expect(scanProvider.extractPolicyData).toHaveBeenCalledTimes(1)
        expect(mockAudit).toHaveBeenCalledTimes(1)
        expect(mockAudit.mock.calls[0]![0]).toMatchObject({
            data: {
                adminUserId: 'agent-77',
                actionType: 'AGENT_POLICY_SCANNED',
                metadata: { attested: true, agentConsentVersion: '2026-07' },
            },
        })
        // The audit row lands BEFORE the billable call.
        expect(mockAudit.mock.invocationCallOrder[0]).toBeLessThan(
            scanProvider.extractPolicyData.mock.invocationCallOrder[0]!
        )
    })
})

/* ────────────────────────────────────────────────────────────────────────────
 * SOURCE GUARD — every caller of the AI service reads consent first.
 *
 * The behavioural cases above pin the paths someone remembered. This arm
 * enumerates the paths from the filesystem: every `.extractPolicyData(` /
 * `.askQuestion(` call under app/ and lib/, attributed to the NAMED function
 * that contains it, must be preceded in that same function by a read of
 * `aiProcessingConsentVersion`. A function that hands the document to a
 * provider without one is red the day it is written, whatever it is called.
 * Exemptions carry a reason and must still match a live call site — a stale
 * exemption is a hole someone could later hide a new sender behind.
 * ──────────────────────────────────────────────────────────────────────────── */
const REPO_ROOT = process.cwd()
const CALLER_ROOTS = ['app', 'lib'] as const
const AI_CALL = /\.(?:extractPolicyData|askQuestion|classifyDocument)\s*\(/g
const CONSENT_READ = /\baiProcessingConsentVersion\b/

const NOT_A_FUNCTION_NAME = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof', 'await', 'new', 'else',
    'do', 'try', 'yield', 'delete', 'void', 'throw', 'case', 'import', 'export', 'super', 'this',
    'with', 'in', 'of', 'as', 'instanceof',
])

/**
 * Blank comments, string / template literals and regex literals — keeping
 * every character position (newlines included) so indices map back to the
 * original source. What is left is the code whose braces and identifiers
 * the function walker can trust.
 */
export function blankNonCode(src: string): string {
    const out = src.split('')
    const n = src.length
    const blank = (from: number, to: number) => {
        for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' '
    }
    let i = 0
    let lastSignificant = ''
    while (i < n) {
        const c = src[i]
        const d = src[i + 1]
        if (c === '/' && d === '/') {
            const e = src.indexOf('\n', i)
            const end = e === -1 ? n : e
            blank(i, end)
            i = end
            continue
        }
        if (c === '/' && d === '*') {
            const e = src.indexOf('*/', i + 2)
            const end = e === -1 ? n : e + 2
            blank(i, end)
            i = end
            continue
        }
        if (c === '"' || c === "'") {
            let j = i + 1
            while (j < n && src[j] !== c && src[j] !== '\n') {
                if (src[j] === '\\') j++
                j++
            }
            blank(i + 1, j)
            i = j + 1
            lastSignificant = c
            continue
        }
        if (c === '`') {
            let j = i + 1
            let depth = 0
            while (j < n) {
                if (src[j] === '\\') { j += 2; continue }
                if (depth === 0 && src[j] === '`') break
                if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue }
                if (depth > 0 && src[j] === '{') { depth++; j++; continue }
                if (depth > 0 && src[j] === '}') { depth--; j++; continue }
                j++
            }
            blank(i + 1, j)
            i = j + 1
            lastSignificant = c
            continue
        }
        // A regex literal can only follow an operator / opener / keyword, never
        // an operand — that is how `a / b` is told apart from `/\}/`.
        if (c === '/' && /[(,=:[!&|?{};]|^/.test(lastSignificant) && d !== undefined) {
            let j = i + 1
            let inClass = false
            while (j < n && src[j] !== '\n') {
                if (src[j] === '\\') { j += 2; continue }
                if (src[j] === '[') inClass = true
                else if (src[j] === ']') inClass = false
                else if (src[j] === '/' && !inClass) break
                j++
            }
            blank(i + 1, j)
            i = j + 1
            lastSignificant = ')'
            continue
        }
        if (!/\s/.test(c)) {
            // `return /re/` — keep the keyword visible to the regex heuristic.
            if (/[A-Za-z_$\d]/.test(c)) {
                let k = i
                while (k < n && /[A-Za-z_$\d]/.test(src[k])) k++
                const word = src.slice(i, k)
                lastSignificant = word === 'return' || word === 'typeof' || word === 'case' ? '(' : 'a'
                i = k
                continue
            }
            lastSignificant = c
        }
        i++
    }
    return out.join('')
}

type NamedFunction = { name: string; start: number; open: number; close: number; kind: 'function' | 'statement' }

function matchingClose(code: string, openIdx: number, open: string, close: string): number {
    let depth = 0
    for (let i = openIdx; i < code.length; i++) {
        if (code[i] === open) depth++
        else if (code[i] === close) {
            depth--
            if (depth === 0) return i
        }
    }
    return -1
}

/** From the `:` of a return-type annotation to the `{` that opens the body. */
function bodyOpenAfterAnnotation(code: string, colon: number): number | null {
    let depth = 0
    let seen = ''
    for (let i = colon + 1; i < code.length; i++) {
        const c = code[i]
        if (c === '=' && code[i + 1] === '>') { seen += '=>'; i++; continue }
        if (c === '<' || c === '(' || c === '[') depth++
        else if (c === '>' || c === ')' || c === ']') depth--
        else if (c === '{') {
            if (depth === 0 && seen.length > 0 && !/[:|&,=(<[]$/.test(seen)) return i
            depth++
        } else if (c === '}') depth--
        // `;` / `=` end the declaration only at depth 0 — inside an object
        // type (`Promise<{ status: "ok"; reason?: string }>`) they are members.
        else if (depth === 0 && (c === ';' || c === '=')) return null
        if (!/\s/.test(c)) seen += c
    }
    return null
}

/**
 * Every NAMED function with a `{ … }` body — declarations, class and
 * object-literal methods, arrow consts — with the index range of its body.
 * Anonymous closures are not entries: a call inside one is attributed to the
 * named function that contains it, which is the function that owns the gate.
 */
export function namedFunctions(code: string): NamedFunction[] {
    const out: NamedFunction[] = []
    const seenOpens = new Set<number>()
    const add = (name: string, start: number, open: number) => {
        if (seenOpens.has(open)) return
        const close = matchingClose(code, open, '{', '}')
        if (close === -1) return
        seenOpens.add(open)
        out.push({ name, start, open, close, kind: 'function' })
    }

    const DECL = /(?:^|[\n;{}])[ \t]*(?:export\s+)?(?:default\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(?:function\s*\*?\s*)?([A-Za-z_$][\w$]*)\s*(?:<[^()]*?>)?\s*\(/g
    for (const m of code.matchAll(DECL)) {
        const name = m[1]
        if (NOT_A_FUNCTION_NAME.has(name)) continue
        const paren = m.index! + m[0].length - 1
        const closeParen = matchingClose(code, paren, '(', ')')
        if (closeParen === -1) continue
        let k = closeParen + 1
        while (k < code.length && /\s/.test(code[k])) k++
        let open: number | null = null
        if (code[k] === '{') open = k
        else if (code[k] === ':') open = bodyOpenAfterAnnotation(code, k)
        if (open === null) continue
        add(name, m.index! + m[0].indexOf(name), open)
    }

    const ARROW = /(?:^|[\n;{}])[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*?)?=\s*(?:async\s*)?\(/g
    for (const m of code.matchAll(ARROW)) {
        const name = m[1]
        const paren = m.index! + m[0].length - 1
        const closeParen = matchingClose(code, paren, '(', ')')
        if (closeParen === -1) continue
        let k = closeParen + 1
        while (k < code.length && /\s/.test(code[k])) k++
        if (code[k] === ':') {
            // `(): T => {` — walk the annotation up to the arrow.
            let depth = 0
            let j = k + 1
            for (; j < code.length; j++) {
                const c = code[j]
                if (c === '=' && code[j + 1] === '>' && depth === 0) break
                if (c === '<' || c === '(' || c === '[' || c === '{') depth++
                else if (c === '>' || c === ')' || c === ']' || c === '}') depth--
            }
            k = j
        }
        if (code[k] !== '=' || code[k + 1] !== '>') continue
        k += 2
        while (k < code.length && /\s/.test(code[k])) k++
        if (code[k] !== '{') continue
        add(name, m.index! + m[0].indexOf(name), k)
    }

    // A named binding whose initializer is an expression — `export const POST
    // = withApiGuard({…}, async ({ req }) => {…})`, `export const aiGateway =
    // {…}`. The handler is an anonymous closure, so the binding's whole
    // statement is its scope: a call anywhere inside it belongs to `POST`
    // unless a smaller named function contains it.
    const STATEMENT = /(?:^|[\n;{}])[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*?)?=(?!=|>)\s*/g
    for (const m of code.matchAll(STATEMENT)) {
        const name = m[1]
        const eq = m.index! + m[0].lastIndexOf('=')
        let depth = 0
        let i = eq + 1
        for (; i < code.length; i++) {
            const c = code[i]
            if (c === '(' || c === '{' || c === '[') depth++
            else if (c === ')' || c === '}' || c === ']') depth--
            else if (depth === 0 && (c === ';' || c === '\n')) break
        }
        // Only an initializer that DEFINES a function is a scope — a plain
        // `const result = await ai.extractPolicyData({…})` is not.
        if (!/=>|\bfunction\b|\basync\b/.test(code.slice(eq, i))) continue
        out.push({ name, start: m.index! + m[0].indexOf(name), open: eq, close: i, kind: 'statement' })
    }

    return out.sort((a, b) => a.open - b.open)
}

/**
 * The scope a call site belongs to: the innermost NAMED FUNCTION containing
 * it; only when no named function does (a handler closure handed to
 * `withApiGuard`) the innermost binding statement.
 */
function enclosingScope(fns: NamedFunction[], at: number): NamedFunction | undefined {
    const containing = fns
        .filter((f) => f.open < at && at < f.close)
        .sort((a, b) => (a.close - a.open) - (b.close - b.open))
    return containing.find((f) => f.kind === 'function') ?? containing[0]
}

/**
 * Every AI call site in `source`, as `fnName` → whether a consent read
 * precedes it inside that function. `<module>` when no named function
 * contains the call.
 */
export function ungatedAiCallers(source: string): string[] {
    const code = blankNonCode(source)
    const fns = namedFunctions(code)
    const offenders: string[] = []
    for (const call of code.matchAll(AI_CALL)) {
        const at = call.index!
        const enclosing = enclosingScope(fns, at)
        const name = enclosing?.name ?? '<module>'
        const before = enclosing ? code.slice(enclosing.start, at) : code.slice(0, at)
        if (!CONSENT_READ.test(before)) offenders.push(name)
    }
    return [...new Set(offenders)]
}

function listSources(dirAbs: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dirAbs)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue
        const p = join(dirAbs, entry)
        if (statSync(p).isDirectory()) listSources(p, out)
        else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec|d)\.tsx?$/.test(entry)) out.push(p)
    }
    return out
}

/**
 * Callers that reach a provider without their own consent read, with the
 * reason each is nevertheless acceptable. Keyed `file#function`.
 */
const AI_CALLER_EXEMPTIONS: Record<string, string> = {
    'lib/ingestion/model-classifier.ts#classifyWithModel':
        'The document gate\'s only model call. Its caller, consultModel in lib/ingestion/document-gate.ts, ' +
        'reads the actor\'s aiProcessingConsentVersion immediately before invoking it and returns a held ' +
        'verdict without it (pinned by tests/unit/ingestion/document-gate.test.ts «consent is read first»).',

    'lib/services/analysis/policy-analysis-orchestrator.service.ts#executePipelineAttempt':
        'Runs only for a PolicyAnalysisRun row that createRun already created — and createRun ' +
        'refuses with AI_CONSENT_REQUIRED before any run row exists (pinned above). The step ' +
        'executor never selects a policy on its own.',
    'lib/services/ai/gateway.ts#askQuestion':
        'Routing wrapper over the provider (model selection + output cap). Its header states ' +
        'that callers own the consent gate; those callers are inside this universe and are ' +
        'checked here (wallet askPolicyQuestion, agent suggestQualificationFromNotes).',
}

describe('source guard — every function that hands text or a document to the AI service reads consent first', () => {
    const files = CALLER_ROOTS.flatMap((root) => listSources(join(REPO_ROOT, root)))
    const findings = files.flatMap((file) => {
        const rel = relative(REPO_ROOT, file)
        return ungatedAiCallers(readFileSync(file, 'utf8')).map((fn) => `${rel}#${fn}`)
    })
    const callSites = files.flatMap((file) => {
        const rel = relative(REPO_ROOT, file)
        const code = blankNonCode(readFileSync(file, 'utf8'))
        const fns = namedFunctions(code)
        return [...code.matchAll(AI_CALL)].map((call) => `${rel}#${enclosingScope(fns, call.index!)?.name ?? '<module>'}`)
    })

    it('enumerates a real universe (the known callers are attributed to their functions)', () => {
        for (const expected of [
            'app/(protected)/agent/actions.ts#parsePolicyPdfWithGemini',
            'app/(protected)/agent/actions.ts#suggestQualificationFromNotes',
            'app/(protected)/wallet/actions.ts#askPolicyQuestion',
            'app/api/policies/extract/route.ts#POST',
            'lib/services/analysis/policy-analysis-orchestrator.service.ts#extractBasicSummary',
        ]) {
            expect(callSites, expected).toContain(expected)
        }
    })

    it('names every caller that reaches the provider without reading aiProcessingConsentVersion first', () => {
        const unexplained = findings.filter((key) => !(key in AI_CALLER_EXEMPTIONS))
        expect(
            unexplained,
            'These functions call extractPolicyData / askQuestion without reading ' +
                'aiProcessingConsentVersion earlier in the same function. Gate them (owner consent for a ' +
                "customer's document, the agent's own consent + attestation for an agent scan) or add an " +
                'exemption WITH a reason:\n' + unexplained.join('\n')
        ).toEqual([])
    })

    it('carries no stale exemptions', () => {
        const stale = Object.keys(AI_CALLER_EXEMPTIONS).filter((key) => !callSites.includes(key))
        expect(stale, `Exemptions with no matching call site:\n${stale.join('\n')}`).toEqual([])
    })

    it('the matcher is proven against a committed probe', () => {
        const probe = readFileSync(join(REPO_ROOT, 'tests/fixtures/guard-probes/ai-call-consent-gate.ts.txt'), 'utf8')
        expect(ungatedAiCallers(probe)).toEqual(['ungatedScanProbe', 'lateReadProbe'])
        // The walker sees every named shape in the probe, including the
        // object-literal method and the arrow with a braced return type.
        const names = namedFunctions(blankNonCode(probe)).map((f) => f.name)
        expect(names).toEqual(expect.arrayContaining(['ungatedScanProbe', 'gatedScanProbe', 'gatedArrowProbe', 'lateReadProbe', 'askQuestion']))
    })
})
