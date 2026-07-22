/**
 * Admin token grant: increments the purchasable balance
 * (TokenBalance.purchasedTokens) inside a transaction, records a €0
 * TokenPurchase history row, audits actor + amount + reason, and returns the new
 * available balance (purchased − used). Input is validated before any write.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN = { id: 'admin-1', email: 'admin@policywallet.gr', roles: 'admin' }
const mockVerifyAdminRole = vi.fn(async (..._a: any[]): Promise<any> => ADMIN)
const mockLogAdminAction = vi.fn(async (..._a: any[]) => {})
vi.mock('@/lib/admin/admin-guard', () => ({
    verifyAdminRole: (...a: unknown[]) => (mockVerifyAdminRole as any)(...a),
    logAdminAction: (...a: unknown[]) => (mockLogAdminAction as any)(...a),
}))

const mockUserFindUnique = vi.fn(async (..._a: any[]): Promise<any> => ({ email: 'u@example.gr' }))
const mockUpsert = vi.fn(async (..._a: any[]): Promise<any> => ({ purchasedTokens: BigInt(5000), usedTokens: BigInt(1000) }))
const mockPurchaseCreate = vi.fn(async (..._a: any[]) => ({}))
const txMock = {
    tokenBalance: { upsert: (...a: unknown[]) => (mockUpsert as any)(...a) },
    tokenPurchase: { create: (...a: unknown[]) => (mockPurchaseCreate as any)(...a) },
}
vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => (mockUserFindUnique as any)(...a) },
        $transaction: async (fn: any) => fn(txMock),
    },
}))

// Other module-level imports of admin/actions.ts.
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(), getSupabaseAuthUserByEmail: vi.fn() }))
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/services/compliance.service', () => ({ buildUserDataExportPayload: vi.fn() }))
vi.mock('@/lib/services/billing/reconciliation.service', () => ({ getBillingReconciliationSnapshot: vi.fn() }))
vi.mock('@/lib/services/ops/launch-readiness.service', () => ({ getLaunchReadinessSnapshot: vi.fn() }))
vi.mock('@/lib/services/gdpr-erasure.service', () => ({ eraseUserData: vi.fn(), isAnonymizedEmail: vi.fn() }))
vi.mock('@/lib/seo/site', () => ({ getSiteOrigin: () => 'https://www.policywallet.gr' }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { grantTokens } from '@/app/(protected)/admin/actions'

beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRole.mockResolvedValue(ADMIN)
    mockUserFindUnique.mockResolvedValue({ email: 'u@example.gr' })
    mockUpsert.mockResolvedValue({ purchasedTokens: BigInt(5000), usedTokens: BigInt(1000) })
})

describe('grantTokens', () => {
    it('increments the balance, records history, audits, and returns new available', async () => {
        const res = await grantTokens({ userId: 'user-1', amount: 1000, reason: 'goodwill' })

        expect(res).toEqual({ ok: true, newAvailable: 4000 })
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1' },
                update: expect.objectContaining({ purchasedTokens: { increment: BigInt(1000) } }),
            })
        )
        expect(mockPurchaseCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: 'user-1', tokensPurchased: BigInt(1000), amountEur: 0, status: 'completed' }),
        })
        expect(mockLogAdminAction.mock.calls[0]?.[2]).toBe('GRANT_TOKENS')
    })

    it('rejects a non-positive / non-integer amount before writing', async () => {
        expect(await grantTokens({ userId: 'user-1', amount: 0, reason: 'x' })).toEqual({ ok: false, error: 'Invalid grant details.' })
        expect(await grantTokens({ userId: 'user-1', amount: 1.5, reason: 'x' })).toEqual({ ok: false, error: 'Invalid grant details.' })
        expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('requires a reason', async () => {
        const res = await grantTokens({ userId: 'user-1', amount: 100, reason: '   ' })
        expect(res).toEqual({ ok: false, error: 'Invalid grant details.' })
    })

    it('returns not-found for an unknown user', async () => {
        mockUserFindUnique.mockResolvedValue(null)
        const res = await grantTokens({ userId: 'ghost', amount: 100, reason: 'x' })
        expect(res).toEqual({ ok: false, error: 'User not found.' })
        expect(mockUpsert).not.toHaveBeenCalled()
    })
})
