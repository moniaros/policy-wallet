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
const txRunUpdateMany = vi.fn()
const txPolicyFindUnique = vi.fn()
const txPolicyUpdate = vi.fn()
const txDocumentUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        policyAnalysisRun: { findMany: (...a: unknown[]) => runFindMany(...a) },
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

    it('fails the orphaned run and resets policy + documents in one transaction, mirroring failRun', async () => {
        runFindMany.mockResolvedValue([
            { id: 'run-1', policyId: 'policy-1', provider: 'gemini' },
        ])

        const summary = await service.reapStaleRuns({ graceMs: 5 * 60 * 1000, limit: 50 })

        expect(summary).toEqual({ staleCandidates: 1, reaped: 1 })

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

        expect(summary).toEqual({ staleCandidates: 1, reaped: 0 })
        expect(txPolicyUpdate).not.toHaveBeenCalled()
        expect(txDocumentUpdateMany).not.toHaveBeenCalled()
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
