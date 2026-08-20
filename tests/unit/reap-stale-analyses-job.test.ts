/**
 * Stale-analysis reaping: a serverless executor killed at the platform
 * ceiling leaves its run 'running' with an expired lease and the policy stuck
 * 'analyzing' forever. The orchestrator's reapStaleRuns fails the run,
 * surfaces a retryable error on the policy (failRun-shape parity), and
 * unsticks its documents — atomically, so a crash mid-reap can't strand the
 * policy with a failed run no later pass revisits. The cron route delegates
 * there and clears leaked reservations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const runFindMany = vi.fn()
const policyFindUnique = vi.fn()
const policyDelete = vi.fn()
const deleteFile = vi.fn(async (_fileUrl: string) => true)
const txRunUpdateMany = vi.fn()
const txPolicyFindUnique = vi.fn()
const txPolicyUpdate = vi.fn()
const txDocumentUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        policyAnalysisRun: { findMany: (...a: unknown[]) => runFindMany(...a) },
        // The reaper now also applies the discard rule: a placeholder-only
        // policy whose executor died is removed rather than left showing the
        // customer a policy the product knows nothing about.
        policy: {
            findUnique: (...a: unknown[]) => policyFindUnique(...a),
            delete: (...a: unknown[]) => policyDelete(...a),
        },
        $transaction: async (arg: unknown) => {
            if (typeof arg === 'function') {
                return (arg as (tx: unknown) => Promise<unknown>)({
                    policyAnalysisRun: { updateMany: (...a: unknown[]) => txRunUpdateMany(...a) },
                    policy: {
                        findUnique: (...a: unknown[]) => txPolicyFindUnique(...a),
                        update: (...a: unknown[]) => txPolicyUpdate(...a),
                    },
                    policyDocument: { updateMany: (...a: unknown[]) => txDocumentUpdateMany(...a) },
                })
            }
            return Promise.all(arg as Promise<unknown>[])
        },
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
vi.mock('@/lib/storage', () => ({ deleteFile: (fileUrl: string) => deleteFile(fileUrl) }))
vi.mock('@/lib/token-tracking', () => ({
    canUserUseTokens: vi.fn(),
    reserveTokens: vi.fn(),
    releaseTokenReservation: vi.fn(),
    clearOrphanedReservations: vi.fn(async () => 2),
}))
vi.mock('@/lib/services/ai', () => ({
    getAIService: vi.fn(() => ({ isAvailable: () => false, getServiceName: () => 'mock' })),
}))
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({ tier: 'plus', limits: {} })),
    resolveAgentEntitlements: vi.fn(async () => ({ tier: 'agent_pro', limits: { priorityQueue: true } })),
}))

import { PolicyAnalysisOrchestratorService } from '@/lib/services/analysis/policy-analysis-orchestrator.service'

beforeEach(() => {
    vi.clearAllMocks()
    runFindMany.mockResolvedValue([])
    txRunUpdateMany.mockResolvedValue({ count: 1 })
    txPolicyFindUnique.mockResolvedValue({ acordData: { insurerName: 'Ethniki' } })
    txPolicyUpdate.mockResolvedValue({})
    txDocumentUpdateMany.mockResolvedValue({ count: 1 })
})

describe('PolicyAnalysisOrchestratorService.reapStaleRuns', () => {
    const service = new PolicyAnalysisOrchestratorService()

    beforeEach(() => {
        // Default: the reaped policy still carries a user-typed identity, so
        // the discard rule leaves it alone and only the mark-up runs.
        policyFindUnique.mockResolvedValue({
            id: 'policy-1',
            insurerName: 'Interamerican',
            policyNumber: 'POL-42',
            ownerUserId: 'user-1',
            documents: [],
        })
        policyDelete.mockResolvedValue({ id: 'policy-1' })
        deleteFile.mockResolvedValue(true)
    })

    it('fails the orphaned run and resets policy + documents in one transaction, mirroring failRun', async () => {
        runFindMany.mockResolvedValue([
            { id: 'run-1', policyId: 'policy-1', provider: 'gemini' },
        ])

        const summary = await service.reapStaleRuns({ graceMs: 5 * 60 * 1000, limit: 50 })

        expect(summary).toEqual({ staleCandidates: 1, reaped: 1, discarded: 0 })

        // Scan is bounded and only looks at running runs past the grace cutoff.
        const findArgs = runFindMany.mock.calls[0]![0]
        expect(findArgs.where.status).toBe('running')
        expect(findArgs.where.executionLeaseExpiresAt.lt).toBeInstanceOf(Date)
        expect(findArgs.take).toBe(50)

        // Guarded fail with failRun-parity fields (remediationSummary carries
        // the i18n key the UI reads).
        const runArgs = txRunUpdateMany.mock.calls[0]![0]
        expect(runArgs.where).toMatchObject({ id: 'run-1', status: 'running' })
        expect(runArgs.data).toMatchObject({ status: 'failed', failureCode: 'LEASE_EXPIRED' })
        expect(runArgs.data.remediationSummary.finalUserMessageKey).toBe('analysis.errors.generic')

        // Policy leaves the eternal spinner with a retryable processingError
        // and the pipeline block, preserving existing acordData.
        const policyArgs = txPolicyUpdate.mock.calls[0]![0]
        expect(policyArgs.where).toEqual({ id: 'policy-1' })
        expect(policyArgs.data.status).toBe('action_needed')
        expect(policyArgs.data.acordData.insurerName).toBe('Ethniki')
        expect(policyArgs.data.acordData.processingError).toMatchObject({
            code: 'LEASE_EXPIRED',
            retryable: true,
        })
        expect(policyArgs.data.acordData.analysis.pipeline).toMatchObject({
            runId: 'run-1',
            status: 'failed',
            lastFailureCode: 'LEASE_EXPIRED',
        })

        expect(txDocumentUpdateMany).toHaveBeenCalledWith({
            where: { policyId: 'policy-1', processingStatus: 'processing' },
            data: { processingStatus: 'failed' },
        })
    })

    it('skips a run that a redelivery resumed between the scan and the guarded update', async () => {
        runFindMany.mockResolvedValue([{ id: 'run-1', policyId: 'policy-1', provider: 'gemini' }])
        txRunUpdateMany.mockResolvedValue({ count: 0 })

        const summary = await service.reapStaleRuns()

        expect(summary).toEqual({ staleCandidates: 1, reaped: 0, discarded: 0 })
        expect(txPolicyUpdate).not.toHaveBeenCalled()
        expect(txDocumentUpdateMany).not.toHaveBeenCalled()
    })

    it('discards a reaped policy that is nothing but placeholders', async () => {
        // Process death is the one failure path no in-process handler covers,
        // so the discard rule has to be applied here too — otherwise a killed
        // executor is exactly how "__PENDING_EXTRACTION__" reaches a customer.
        runFindMany.mockResolvedValue([{ id: 'run-1', policyId: 'policy-1', provider: 'gemini' }])
        policyFindUnique.mockResolvedValue({
            id: 'policy-1',
            insurerName: '__PENDING_EXTRACTION__',
            policyNumber: 'PENDING-1786732800000',
            ownerUserId: 'user-1',
            documents: [{ id: 'doc-1', fileUrl: 'https://x.supabase.co/storage/v1/object/public/policies/a.pdf' }],
        })

        const summary = await service.reapStaleRuns()

        expect(summary).toEqual({ staleCandidates: 1, reaped: 1, discarded: 1 })
        // Storage first, then the row — an object that outlives its row is
        // personal data no GDPR export can see.
        expect(deleteFile).toHaveBeenCalledWith('https://x.supabase.co/storage/v1/object/public/policies/a.pdf')
        expect(policyDelete).toHaveBeenCalledWith({ where: { id: 'policy-1' } })
    })
})

describe('reap-stale-analyses route', () => {
    it('delegates to the orchestrator + reservation cleanup behind cron auth', async () => {
        vi.resetModules()
        const reapStaleRuns = vi.fn(async () => ({ staleCandidates: 3, reaped: 2 }))
        const clearOrphanedReservations = vi.fn(async () => 4)
        const authorizeCronRequest = vi.fn(async () => null)

        vi.doMock('@/lib/api-auth', () => ({ authorizeCronRequest }))
        vi.doMock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
            PolicyAnalysisOrchestratorService: vi.fn(function (this: any) {
                this.reapStaleRuns = reapStaleRuns
            }),
        }))
        vi.doMock('@/lib/token-tracking', () => ({ clearOrphanedReservations }))

        const { POST } = await import('@/app/api/v1/jobs/reap-stale-analyses/route')
        const res = await POST(new Request('http://localhost/api/v1/jobs/reap-stale-analyses', { method: 'POST' }))
        const body = await res.json()

        expect(body.data.summary).toEqual({ stale_candidates: 3, reaped: 2, token_rows_cleared: 4 })
        expect(reapStaleRuns).toHaveBeenCalledWith({ graceMs: 5 * 60 * 1000, limit: 50 })
        expect(clearOrphanedReservations).toHaveBeenCalledTimes(1)
    })

    it('refuses to run when cron/admin authorization fails', async () => {
        vi.resetModules()
        const reapStaleRuns = vi.fn()
        vi.doMock('@/lib/api-auth', () => ({
            authorizeCronRequest: vi.fn(async () => new Response('unauthorized', { status: 401 })),
        }))
        vi.doMock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
            PolicyAnalysisOrchestratorService: vi.fn(function (this: any) {
                this.reapStaleRuns = reapStaleRuns
            }),
        }))
        vi.doMock('@/lib/token-tracking', () => ({ clearOrphanedReservations: vi.fn() }))

        const { POST } = await import('@/app/api/v1/jobs/reap-stale-analyses/route')
        const res = await POST(new Request('http://localhost/api/v1/jobs/reap-stale-analyses', { method: 'POST' }))

        expect(res.status).toBe(401)
        expect(reapStaleRuns).not.toHaveBeenCalled()
    })
})
