import { describe, it, expect, vi, beforeEach } from 'vitest'

// getPolicyAccess is dynamically imported inside update(); grant write access.
const mockGetPolicyAccess = vi.fn()
vi.mock('@/lib/policy-access', () => ({
    getPolicyAccess: (...args: unknown[]) => mockGetPolicyAccess(...args),
}))

// The recompute under test. refreshProtectionScore → runGapEngine(userId).
const mockRefresh = vi.fn((..._args: unknown[]) => Promise.resolve({} as any))
vi.mock('@/lib/services/gap-engine', () => ({
    refreshProtectionScore: (...args: unknown[]) => mockRefresh(...args),
}))

vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

// policy.service → lib/storage → lib/env, which throws without AUTH_SECRET in
// the test env. Stub storage, as the sibling policy-action tests do.
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))

import { PolicyService } from '@/lib/services/policy.service'

const OWNER_ID = 'owner-9'
const EDITOR_ID = 'agent-1' // an agent editing a customer's policy via an edit grant

function makeDb() {
    return {
        policy: {
            findUnique: vi.fn(async () => ({
                id: 'pol-1',
                ownerUserId: OWNER_ID,
                policyNumber: 'POL-1',
                insurerName: 'ΕΘΝΙΚΗ',
            })),
            update: vi.fn(async () => ({ id: 'pol-1', ownerUserId: OWNER_ID })),
        },
        user: { findUnique: vi.fn(async () => ({ email: 'a@b.gr' })) },
        activityLog: { create: vi.fn(async () => ({})) },
    } as any
}

beforeEach(() => {
    vi.clearAllMocks()
    mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: true })
})

/**
 * PolicyService.update recomputed `refreshProtectionScore(userId)` where userId
 * is whoever made the edit. An agent with an edit grant can change a customer's
 * policy, so the engine ran over the AGENT's own portfolio — rebuilding gaps
 * that did not change — while the CUSTOMER's gaps and score, the ones that
 * actually changed and the ones the customer sees, stayed stale.
 */
describe('a policy edit recomputes the OWNER’s gaps, not the editor’s', () => {
    it('runs the gap engine for the policy owner even when an agent makes the edit', async () => {
        const db = makeDb()
        const service = new PolicyService(db)

        await service.update('pol-1', EDITOR_ID, { lineOfBusiness: 'health' }, 'el')

        expect(mockRefresh).toHaveBeenCalledTimes(1)
        expect(mockRefresh).toHaveBeenCalledWith(OWNER_ID)
        expect(mockRefresh).not.toHaveBeenCalledWith(EDITOR_ID)
    })

    it('still logs the activity against the editor (who did it), not the owner', async () => {
        const db = makeDb()
        const service = new PolicyService(db)

        await service.update('pol-1', EDITOR_ID, { premiumAmount: 500 }, 'el')

        // The audit trail records the actor…
        const logArg = db.activityLog.create.mock.calls[0][0]
        expect(logArg.data.adminUserId).toBe(EDITOR_ID)
        // …while the recompute targets the owner. Two different users, on purpose.
        expect(mockRefresh).toHaveBeenCalledWith(OWNER_ID)
    })

    it('does not recompute when write access is denied', async () => {
        mockGetPolicyAccess.mockResolvedValue({ exists: true, canRead: true, canWrite: false })
        const db = makeDb()
        const service = new PolicyService(db)

        await expect(service.update('pol-1', EDITOR_ID, { premiumAmount: 1 }, 'el')).rejects.toBeTruthy()
        expect(mockRefresh).not.toHaveBeenCalled()
        expect(db.policy.update).not.toHaveBeenCalled()
    })

    it('returns the updated policy even if the recompute rejects (best-effort)', async () => {
        mockRefresh.mockRejectedValueOnce(new Error('engine down'))
        const db = makeDb()
        const service = new PolicyService(db)

        const result = await service.update('pol-1', EDITOR_ID, { insurerName: 'Interamerican' }, 'el')
        expect(result).toBeTruthy()
        expect(db.policy.update).toHaveBeenCalledTimes(1)
    })
})
