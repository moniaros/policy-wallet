import { beforeEach, describe, expect, it, vi } from 'vitest'

const policyFindUnique = vi.fn()
const mergeUpsert = vi.fn()
const mergeFindUnique = vi.fn()
const mergeUpdate = vi.fn()
const notificationCreate = vi.fn()
const policyDelete = vi.fn()
const policyUpdate = vi.fn()
const documentUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        policy: {
            findUnique: (...a: any[]) => policyFindUnique(...a),
            update: (...a: any[]) => policyUpdate(...a),
            delete: (...a: any[]) => policyDelete(...a),
        },
        policyMergeRequest: {
            upsert: (...a: any[]) => mergeUpsert(...a),
            findUnique: (...a: any[]) => mergeFindUnique(...a),
            update: (...a: any[]) => mergeUpdate(...a),
            findMany: vi.fn(),
        },
        notificationEvent: {
            create: (...a: any[]) => notificationCreate(...a),
            findFirst: vi.fn(async () => null),
        },
        // The bus resolves the recipient and their preferences before writing.
        notificationPreference: { findMany: vi.fn(async () => []) },
        user: { findUnique: vi.fn(async () => ({ email: 'u@example.com', preferredLanguage: 'en' })) },
        policyDocument: { updateMany: (...a: any[]) => documentUpdateMany(...a) },
        $transaction: async (fn: any) =>
            fn({
                policy: {
                    update: (...a: any[]) => policyUpdate(...a),
                    delete: (...a: any[]) => policyDelete(...a),
                },
                policyMergeRequest: { update: (...a: any[]) => mergeUpdate(...a) },
                policyDocument: { updateMany: (...a: any[]) => documentUpdateMany(...a) },
            }),
    },
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

const mockRefresh = vi.fn((..._a: unknown[]) => Promise.resolve({} as any))
vi.mock('@/lib/services/gap-engine', () => ({
    refreshProtectionScore: (...a: unknown[]) => mockRefresh(...a),
}))

import { decidePolicyMerge, requestPolicyMerge } from '@/lib/services/policy-merge.service'

const AGENT = 'agent_1'
const OWNER = 'customer_1'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('requestPolicyMerge — consent, never a silent overwrite', () => {
    it('asks the OTHER uploader to approve and notifies them', async () => {
        policyFindUnique
            .mockResolvedValueOnce({
                id: 'pol_existing',
                ownerUserId: OWNER,
                createdByUserId: OWNER, // the policyholder uploaded it first
                insurerName: 'Εθνική Ασφαλιστική',
                policyNumber: '1651622',
            })
            .mockResolvedValueOnce({
                id: 'pol_incoming',
                ownerUserId: OWNER,
                createdByUserId: AGENT, // the agent uploaded the duplicate
            })
        mergeUpsert.mockResolvedValue({ id: 'mr_1', status: 'pending' })

        const id = await requestPolicyMerge({
            existingPolicyId: 'pol_existing',
            incomingPolicyId: 'pol_incoming',
            requestedByUserId: AGENT,
        })

        expect(id).toBe('mr_1')
        // The policyholder — the other uploader — is the approver.
        expect(mergeUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ approverUserId: OWNER, requestedByUserId: AGENT }),
            })
        )
        expect(notificationCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: OWNER, eventType: 'policy_merge_requested' }),
            })
        )
        // Nothing is merged or deleted until the approver says so.
        expect(policyDelete).not.toHaveBeenCalled()
    })

    it('refuses to link policies of two different owners', async () => {
        policyFindUnique
            .mockResolvedValueOnce({ id: 'a', ownerUserId: 'owner_a', createdByUserId: AGENT })
            .mockResolvedValueOnce({ id: 'b', ownerUserId: 'owner_b', createdByUserId: OWNER })

        await expect(
            requestPolicyMerge({ existingPolicyId: 'a', incomingPolicyId: 'b', requestedByUserId: AGENT })
        ).resolves.toBeNull()
        expect(mergeUpsert).not.toHaveBeenCalled()
    })
})

describe('decidePolicyMerge', () => {
    const pending = {
        id: 'mr_1',
        status: 'pending',
        approverUserId: OWNER,
        requestedByUserId: AGENT,
        existingPolicyId: 'pol_existing',
        incomingPolicyId: 'pol_incoming',
    }

    it('only the designated approver may decide', async () => {
        mergeFindUnique.mockResolvedValue(pending)
        const result = await decidePolicyMerge('mr_1', 'someone_else', 'approved')
        expect(result).toEqual({ ok: false, error: 'NOT_FOUND' })
        expect(policyDelete).not.toHaveBeenCalled()
    })

    it('rejection keeps BOTH records — a duplicate is not an error', async () => {
        mergeFindUnique.mockResolvedValue(pending)

        const result = await decidePolicyMerge('mr_1', OWNER, 'rejected')

        expect(result.ok).toBe(true)
        expect(policyDelete).not.toHaveBeenCalled()
        expect(mergeUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) })
        )
    })

    it('approval folds the duplicate into the surviving policy', async () => {
        mergeFindUnique.mockResolvedValue(pending)
        policyFindUnique
            .mockResolvedValueOnce({
                id: 'pol_existing',
                ownerUserId: OWNER,
                endDate: new Date('2025-05-22'),
                acordData: {},
                documents: [],
                policyNumber: '1651622',
            })
            .mockResolvedValueOnce({
                id: 'pol_incoming',
                ownerUserId: OWNER,
                endDate: new Date('2027-07-11'), // newer → promoted
                acordData: { policy: { expirationDate: '2027-07-11' } },
                documents: [{ id: 'doc_1', fileName: 'p.pdf', uploadedAt: new Date() }],
                insurerName: 'Εθνική Ασφαλιστική',
                lineOfBusiness: 'health',
                startDate: new Date('2026-07-11'),
                premiumAmount: null,
                coverageSummary: null,
                policyNumber: '1651622',
            })

        const result = await decidePolicyMerge('mr_1', OWNER, 'approved')

        expect(result.ok).toBe(true)
        expect(result.mergedIntoPolicyId).toBe('pol_existing')
        expect(documentUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { policyId: 'pol_incoming' }, data: { policyId: 'pol_existing' } })
        )
        expect(policyDelete).toHaveBeenCalledWith({ where: { id: 'pol_incoming' } })
        // Two policies became one — the owner's duplicate-coverage gap and score
        // must recompute, for the OWNER, not whoever approved.
        expect(mockRefresh).toHaveBeenCalledWith(OWNER)
    })

    it('does not recompute when a merge is rejected (both records kept)', async () => {
        mergeFindUnique.mockResolvedValue(pending)
        const result = await decidePolicyMerge('mr_1', OWNER, 'rejected')
        expect(result.ok).toBe(true)
        expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('a decided request cannot be decided twice', async () => {
        mergeFindUnique.mockResolvedValue({ ...pending, status: 'approved' })
        const result = await decidePolicyMerge('mr_1', OWNER, 'approved')
        expect(result).toEqual({ ok: false, error: 'ALREADY_DECIDED' })
    })
})
