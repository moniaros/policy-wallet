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
// The route reads the owner's existing policies once, to reject duplicates
// before writing them. An empty wallet is the default for these cases.
const policyFindMany = vi.fn(async (..._a: any[]) => [] as any[])
const activityCreate = vi.fn(async (..._a: any[]) => ({}))
vi.mock('@/lib/db', () => ({
    db: {
        policy: {
            count: (...a: any[]) => policyCount(...a),
            create: (...a: any[]) => policyCreate(...a),
            findMany: (...a: any[]) => policyFindMany(...a),
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
    policyFindMany.mockResolvedValue([])
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

/**
 * A bulk upload is a batch, not a transaction: one bad document must never cost
 * the user the good ones. The required-field checks used to live in the Zod
 * schema, which made them ARRAY-level — `withApiGuard` rejected the whole body,
 * so a single policy whose start date the extractor could not read returned 400
 * and created ZERO rows.
 */
describe('one unusable document does not cost the batch', () => {
    it('writes the good rows and reports only the bad one', async () => {
        const res = await call([
            policy('D-1'),
            policy('D-2', { startDate: '' }),
            policy('D-3'),
        ])
        const payload = await res.json()

        expect(payload.count).toBe(2)
        expect(payload.failedCount).toBe(1)
        expect(payload.failedPolicies[0]).toMatchObject({
            index: 1,
            code: 'REQUIRED_DATA_MISSING',
        })
        expect(payload.failedPolicies[0].context.missingFields).toContain('startDate')
    })

    it('names the reason with a code, never with prose the UI has to parse', async () => {
        const res = await call([policy('E-1', { startDate: '2027-01-01', endDate: '2026-01-01' })])
        const payload = await res.json()

        expect(payload.failedPolicies[0].code).toBe('INVALID_POLICY_PERIOD')
        // The old shape was `error: "Invalid date format"` — an English string
        // that no Greek UI could render and no support tool could group by.
        expect(payload.failedPolicies[0]).not.toHaveProperty('error')
    })
})

/**
 * The single-upload path has always refused to create a second copy of a policy
 * the owner already holds (policy.service.ts, matched on owner + number +
 * insurer). Batch create never did — so re-uploading a document already in the
 * wallet silently produced a duplicate, and retrying a partly-saved batch
 * produced one per attempt.
 */
describe('duplicates are refused, in the wallet and within the batch', () => {
    it('refuses a policy the owner already holds, case-insensitively', async () => {
        policyFindMany.mockResolvedValue([
            { id: 'existing-1', insurerName: 'ΕΘΝΙΚΗ', policyNumber: 'F-1' },
        ])

        const res = await call([policy('f-1'), policy('F-2')])
        const payload = await res.json()

        expect(payload.count).toBe(1)
        expect(payload.failedPolicies).toHaveLength(1)
        expect(payload.failedPolicies[0]).toMatchObject({
            index: 0,
            code: 'DUPLICATE_POLICY',
            context: { existingPolicyId: 'existing-1' },
        })
        expect(policyCreate).toHaveBeenCalledTimes(1)
    })

    it('refuses the same document twice inside one batch', async () => {
        // The second copy is not yet in the DB when the first is written, so
        // only claiming the key as we go catches it.
        const res = await call([policy('G-1'), policy('G-1')])
        const payload = await res.json()

        expect(payload.count).toBe(1)
        expect(payload.failedPolicies[0].code).toBe('DUPLICATE_POLICY')
    })

    it('makes a retry of a partly-saved batch idempotent', async () => {
        // First attempt: one row lands, one fails.
        policyCreate.mockRejectedValueOnce(new Error('connection reset'))
        const first = await call([policy('H-1'), policy('H-2')])
        const firstPayload = await first.json()
        expect(firstPayload.count).toBe(1)
        expect(firstPayload.failedPolicies[0].code).toBe('PERSISTENCE_FAILED')

        // The user retries the whole batch. H-2 is now in the wallet, so the
        // retry must add H-1 and refuse to duplicate H-2.
        policyFindMany.mockResolvedValue([
            { id: 'pol-H-2', insurerName: 'ΕΘΝΙΚΗ', policyNumber: 'H-2' },
        ])
        const second = await call([policy('H-1'), policy('H-2')])
        const secondPayload = await second.json()

        expect(secondPayload.count).toBe(1)
        expect(secondPayload.failedPolicies[0]).toMatchObject({ index: 1, code: 'DUPLICATE_POLICY' })
    })

    it('does not leak database detail when a write fails', async () => {
        policyCreate.mockRejectedValueOnce(
            new Error('Invalid `prisma.policy.create()` invocation: Unique constraint failed')
        )
        const res = await call([policy('I-1')])
        const body = JSON.stringify(await res.json())

        expect(body).toContain('PERSISTENCE_FAILED')
        expect(body.toLowerCase()).not.toContain('prisma')
        expect(body.toLowerCase()).not.toContain('constraint')
    })
})
