/**
 * Admin policy operations: requeue (reap + createRun + enqueue, honouring the
 * AI-consent gate), hard-delete (best-effort storage cleanup + cascade delete),
 * edit key fields (with date validation), and merge (delegating to the shared
 * mergePolicyRecords). All admin-gated, validated, audited, { ok, error }.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN = { id: 'admin-1', email: 'admin@policywallet.gr', roles: 'admin' }
const mockVerifyAdminRole = vi.fn(async (..._a: any[]): Promise<any> => ADMIN)
const mockLogAdminAction = vi.fn(async (..._a: any[]) => {})
vi.mock('@/lib/admin/admin-guard', () => ({
    verifyAdminRole: (...a: unknown[]) => (mockVerifyAdminRole as any)(...a),
    logAdminAction: (...a: unknown[]) => (mockLogAdminAction as any)(...a),
}))

const mockFindUnique = vi.fn(async (..._a: any[]): Promise<any> => null)
const mockDelete = vi.fn(async (..._a: any[]) => ({}))
const mockUpdate = vi.fn(async (..._a: any[]) => ({}))
const mockFindMany = vi.fn(async (..._a: any[]): Promise<any[]> => [])
vi.mock('@/lib/db', () => ({
    db: {
        policy: {
            findUnique: (...a: unknown[]) => (mockFindUnique as any)(...a),
            delete: (...a: unknown[]) => (mockDelete as any)(...a),
            update: (...a: unknown[]) => (mockUpdate as any)(...a),
            findMany: (...a: unknown[]) => (mockFindMany as any)(...a),
        },
    },
}))

const mockReap = vi.fn(async (..._a: any[]) => ({ staleCandidates: 0, reaped: 0 }))
const mockCreateRun = vi.fn(async (..._a: any[]): Promise<any> => ({ id: 'run1', status: 'running' }))
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    PolicyAnalysisOrchestratorService: class {
        reapStaleRuns(...a: unknown[]) { return (mockReap as any)(...a) }
        createRun(...a: unknown[]) { return (mockCreateRun as any)(...a) }
    },
}))

const mockEnqueue = vi.fn(async (..._a: any[]) => true)
vi.mock('@/lib/services/analysis/analysis-queue', () => ({ enqueueAnalysisRun: (...a: unknown[]) => (mockEnqueue as any)(...a) }))

const mockMergeRecords = vi.fn(async (..._a: any[]): Promise<any> => ({ ok: true, mergedIntoPolicyId: 't', policyNumber: 'PN' }))
vi.mock('@/lib/services/policy-merge.service', () => ({ mergePolicyRecords: (...a: unknown[]) => (mockMergeRecords as any)(...a) }))

const mockDeleteFile = vi.fn(async (..._a: any[]) => true)
vi.mock('@/lib/storage', () => ({ deleteFile: (...a: unknown[]) => (mockDeleteFile as any)(...a) }))

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

import { requeuePolicy, deletePolicy, updatePolicyFields, mergePolicies } from '@/app/(protected)/admin/policy-actions'

beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRole.mockResolvedValue(ADMIN)
    mockReap.mockResolvedValue({ staleCandidates: 0, reaped: 0 })
    mockCreateRun.mockResolvedValue({ id: 'run1', status: 'running' })
    mockEnqueue.mockResolvedValue(true)
    mockMergeRecords.mockResolvedValue({ ok: true, mergedIntoPolicyId: 't', policyNumber: 'PN' })
    mockDeleteFile.mockResolvedValue(true)
})

describe('requeuePolicy', () => {
    it('reaps the stuck run, creates a fresh run and enqueues it', async () => {
        mockFindUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u1', status: 'analyzing', owner: { preferredLanguage: 'el' } })
        const res = await requeuePolicy('p1')
        expect(res).toEqual({ ok: true, runId: 'run1', queued: true })
        expect(mockReap).toHaveBeenCalledWith(expect.objectContaining({ graceMs: 0, policyIds: ['p1'] }))
        expect(mockCreateRun).toHaveBeenCalledWith('p1', 'u1')
        expect(mockEnqueue).toHaveBeenCalledWith('run1', 'el')
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('REQUEUE_POLICY')
    })

    it('does not enqueue when the owner lacks AI-processing consent', async () => {
        mockFindUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u1', status: 'analyzing', owner: { preferredLanguage: 'el' } })
        mockCreateRun.mockResolvedValue({ id: 'run-blocked', status: 'blocked' })
        const res = await requeuePolicy('p1')
        expect(res.ok).toBe(false)
        expect(mockEnqueue).not.toHaveBeenCalled()
    })

    it('returns not-found for an unknown policy', async () => {
        mockFindUnique.mockResolvedValue(null)
        expect(await requeuePolicy('ghost')).toEqual({ ok: false, error: 'Policy not found.' })
    })
})

describe('deletePolicy', () => {
    it('best-effort deletes storage then cascade-deletes the policy', async () => {
        mockFindUnique.mockResolvedValue({ id: 'p1', policyNumber: 'PN1', ownerUserId: 'u1', documents: [{ fileUrl: 'http://x/a.pdf' }] })
        const res = await deletePolicy('p1')
        expect(res).toEqual({ ok: true })
        expect(mockDeleteFile).toHaveBeenCalledWith('http://x/a.pdf')
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'p1' } })
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('DELETE_POLICY')
    })

    it('returns not-found for an unknown policy', async () => {
        mockFindUnique.mockResolvedValue(null)
        expect(await deletePolicy('ghost')).toEqual({ ok: false, error: 'Policy not found.' })
        expect(mockDelete).not.toHaveBeenCalled()
    })
})

describe('updatePolicyFields', () => {
    it('updates provided fields and parses dates', async () => {
        mockFindUnique.mockResolvedValue({ id: 'p1' })
        const res = await updatePolicyFields('p1', { insurerName: 'Ethniki', startDate: '2024-05-22' })
        expect(res).toEqual({ ok: true })
        const arg = mockUpdate.mock.calls[0]?.[0]
        expect(arg.data.insurerName).toBe('Ethniki')
        expect(arg.data.startDate).toBeInstanceOf(Date)
    })

    it('rejects an invalid date', async () => {
        mockFindUnique.mockResolvedValue({ id: 'p1' })
        const res = await updatePolicyFields('p1', { endDate: 'not-a-date' })
        expect(res).toEqual({ ok: false, error: 'Invalid endDate.' })
        expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('rejects an empty update', async () => {
        const res = await updatePolicyFields('p1', {})
        expect(res).toEqual({ ok: false, error: 'No fields to update.' })
    })
})

describe('mergePolicies', () => {
    it('merges source into target via the shared record merge and audits', async () => {
        const res = await mergePolicies({ sourceId: 's', targetId: 't' })
        expect(res).toEqual({ ok: true, mergedIntoPolicyId: 't' })
        // target survives (existing), source is folded in (incoming)
        expect(mockMergeRecords).toHaveBeenCalledWith('t', 's')
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('MERGE_POLICIES')
    })

    it('maps a domain error to a friendly message', async () => {
        mockMergeRecords.mockResolvedValue({ ok: false, error: 'OWNER_MISMATCH' })
        const res = await mergePolicies({ sourceId: 's', targetId: 't' })
        expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/different owners/i) })
    })
})
