/**
 * The stale-analysis reaper (app/api/v1/jobs/reap-stale-analyses): a serverless
 * executor killed at the platform ceiling leaves its run 'running' with an
 * expired lease and the policy stuck 'analyzing' forever. The reaper fails the
 * run, surfaces a retryable error on the policy, unsticks its documents, and
 * clears leaked reserved_tokens.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const runFindMany = vi.fn()
const runUpdateMany = vi.fn()
const policyUpdate = vi.fn()
const documentUpdateMany = vi.fn()
const executeRaw = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        policyAnalysisRun: {
            findMany: (...a: unknown[]) => runFindMany(...a),
            updateMany: (...a: unknown[]) => runUpdateMany(...a),
        },
        policy: { update: (...a: unknown[]) => policyUpdate(...a) },
        policyDocument: { updateMany: (...a: unknown[]) => documentUpdateMany(...a) },
        $transaction: async (ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : undefined),
        $executeRaw: (...a: unknown[]) => executeRaw(...a),
    },
}))

const requireApiUser = vi.fn(async () => ({ error: new Response('unauthorized', { status: 401 }) }))
vi.mock('@/lib/api-auth', () => ({
    requireApiUser: (...a: unknown[]) => (requireApiUser as any)(...a),
}))

import { POST } from '@/app/api/v1/jobs/reap-stale-analyses/route'

const originalSecret = process.env.CRON_SECRET

beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    runFindMany.mockResolvedValue([])
    runUpdateMany.mockResolvedValue({ count: 1 })
    policyUpdate.mockResolvedValue({})
    documentUpdateMany.mockResolvedValue({ count: 1 })
    executeRaw.mockResolvedValue(2)
})

afterEach(() => {
    process.env.CRON_SECRET = originalSecret
})

const cronRequest = (secret?: string) =>
    new Request('http://localhost/api/v1/jobs/reap-stale-analyses', {
        method: 'POST',
        headers: secret ? { 'x-cron-secret': secret } : {},
    })

describe('reap-stale-analyses job', () => {
    it('fails the orphaned run and resets the policy + documents to a retryable state', async () => {
        runFindMany.mockResolvedValue([
            {
                id: 'run-1',
                policyId: 'policy-1',
                policy: { acordData: { insurerName: 'Ethniki' } },
            },
        ])

        const res = await POST(cronRequest('test-secret'))
        const body = await res.json()

        expect(body.data.summary).toEqual({
            stale_candidates: 1,
            reaped: 1,
            token_rows_cleared: 2,
        })

        // Guarded: only reaps if the run is STILL running with an expired lease.
        const runArgs = runUpdateMany.mock.calls[0]![0]
        expect(runArgs.where).toMatchObject({ id: 'run-1', status: 'running' })
        expect(runArgs.where.executionLeaseExpiresAt.lt).toBeInstanceOf(Date)
        expect(runArgs.data).toMatchObject({ status: 'failed', failureCode: 'LEASE_EXPIRED' })

        // Policy leaves the eternal spinner with a retryable processingError,
        // preserving existing acordData.
        const policyArgs = policyUpdate.mock.calls[0]![0]
        expect(policyArgs.where).toEqual({ id: 'policy-1' })
        expect(policyArgs.data.status).toBe('action_needed')
        expect(policyArgs.data.acordData.insurerName).toBe('Ethniki')
        expect(policyArgs.data.acordData.processingError).toMatchObject({
            code: 'LEASE_EXPIRED',
            retryable: true,
        })

        expect(documentUpdateMany).toHaveBeenCalledWith({
            where: { policyId: 'policy-1', processingStatus: 'processing' },
            data: { processingStatus: 'failed' },
        })
    })

    it('skips a run that a redelivery resumed between the scan and the update', async () => {
        runFindMany.mockResolvedValue([
            { id: 'run-1', policyId: 'policy-1', policy: { acordData: null } },
        ])
        runUpdateMany.mockResolvedValue({ count: 0 })

        const res = await POST(cronRequest('test-secret'))
        const body = await res.json()

        expect(body.data.summary.reaped).toBe(0)
        expect(policyUpdate).not.toHaveBeenCalled()
        expect(documentUpdateMany).not.toHaveBeenCalled()
    })

    it('always clears leaked reservations for users with no running run', async () => {
        await POST(cronRequest('test-secret'))
        expect(executeRaw).toHaveBeenCalledTimes(1)
    })

    it('refuses to run without cron or admin authorization', async () => {
        const res = await POST(cronRequest())
        expect(res.status).toBe(401)
        expect(runFindMany).not.toHaveBeenCalled()
    })
})
