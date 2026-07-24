/**
 * Batch upload persists client-extracted policy rows and stops — it never enters
 * the background-analysis path that single-policy create uses to reach gap
 * detection. So without an explicit recompute a batch upload left the owner's
 * protection score unchanged and detected NO gaps, including the duplicate
 * coverage ACROSS the batch that uploading several policies at once is the very
 * moment to surface. These pin that the score/gaps recompute for the owner after
 * a batch that created at least one policy, and not after one that created none.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-guard', () => ({
    withApiGuard: (_config: unknown, handler: (ctx: any) => Promise<Response>) => handler,
}))

const policyCount = vi.fn(async (..._a: any[]) => 0)
const policyCreate = vi.fn(async (...a: any[]) => ({ id: `pol-${a[0].data.policyNumber}`, ...a[0].data }))
const activityCreate = vi.fn(async (..._a: any[]) => ({}))
vi.mock('@/lib/db', () => ({
    db: {
        policy: {
            count: (...a: any[]) => policyCount(...a),
            create: (...a: any[]) => policyCreate(...a),
        },
        activityLog: { create: (...a: any[]) => activityCreate(...a) },
    },
}))

const mockRefresh = vi.fn((..._a: unknown[]) => Promise.resolve({} as any))
vi.mock('@/lib/services/gap-engine', () => ({
    refreshProtectionScore: (...a: unknown[]) => mockRefresh(...a),
}))

vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({ limits: { policies: null } })),
}))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn(async () => {}) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/policies/batch-create/route'

const OWNER = 'owner-batch-1'

const policy = (n: string, over: Record<string, unknown> = {}) => ({
    insurerName: 'ΕΘΝΙΚΗ',
    policyNumber: n,
    lineOfBusiness: 'motor',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    ...over,
})

const call = (policies: unknown[]) =>
    (POST as any)({
        auth: { dbUser: { id: OWNER, email: 'o@b.gr' } },
        body: { policies },
    })

beforeEach(() => {
    vi.clearAllMocks()
    policyCount.mockResolvedValue(0)
})

describe('a batch upload recomputes the owner’s gaps and score', () => {
    it('recomputes for the owner after creating policies', async () => {
        const res = await call([policy('A-1'), policy('A-2')])
        const payload = await res.json()

        expect(payload.count).toBe(2)
        expect(mockRefresh).toHaveBeenCalledTimes(1)
        expect(mockRefresh).toHaveBeenCalledWith(OWNER)
    })

    it('does not recompute when every policy failed (nothing created)', async () => {
        // Both rows have end before start → both rejected, none created.
        const res = await call([
            policy('B-1', { startDate: '2027-01-01', endDate: '2026-01-01' }),
            policy('B-2', { startDate: '2027-01-01', endDate: '2026-01-01' }),
        ])
        const payload = await res.json()

        expect(payload.count).toBe(0)
        expect(payload.failedCount).toBe(2)
        expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('still succeeds when the recompute throws (best-effort)', async () => {
        mockRefresh.mockRejectedValueOnce(new Error('engine down'))
        const res = await call([policy('C-1')])
        const payload = await res.json()

        expect(payload.success).toBe(true)
        expect(payload.count).toBe(1)
        expect(policyCreate).toHaveBeenCalledTimes(1)
    })
})
