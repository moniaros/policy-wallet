/**
 * changeUserRole must keep the DB roles string and the Supabase JWT
 * user_metadata.role in lockstep. The DB write alone is not enough: middleware
 * (proxy.ts) gates /admin on the JWT metadata role, so a DB-only promotion left
 * a new admin bounced until someone edited Supabase by hand. The action now
 * resolves the AUTH user by email (User.id is a cuid, not the auth UUID),
 * merges metadata, and reports the sync gap honestly instead of silent success.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN = { id: 'admin-1', email: 'admin@policywallet.gr', roles: 'admin' }

const mockVerifyAdminRole = vi.fn(async (..._a: any[]): Promise<any> => ADMIN)
const mockLogAdminAction = vi.fn(async (..._a: any[]) => {})
vi.mock('@/lib/admin/admin-guard', () => ({
    verifyAdminRole: (...a: unknown[]) => (mockVerifyAdminRole as any)(...a),
    logAdminAction: (...a: unknown[]) => (mockLogAdminAction as any)(...a),
}))

const mockUserFindUnique = vi.fn(async (..._a: any[]): Promise<any> => ({
    email: 'u@example.gr',
    roles: 'policyholder',
}))
const mockUserUpdate = vi.fn(async (args: any) => ({ id: args?.where?.id, ...args?.data }))
vi.mock('@/lib/db', () => ({
    db: {
        user: {
            findUnique: (...a: unknown[]) => (mockUserFindUnique as any)(...a),
            update: (...a: unknown[]) => (mockUserUpdate as any)(...a),
        },
    },
}))

const mockUpdateUserById = vi.fn(async (..._a: any[]): Promise<any> => ({ error: null }))
const mockGetAuthUser = vi.fn(async (..._a: any[]): Promise<any> => ({
    id: 'auth-uuid-1',
    user_metadata: { language: 'el', email_verified: true },
}))
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        auth: { admin: { updateUserById: (...a: unknown[]) => (mockUpdateUserById as any)(...a) } },
    }),
    getSupabaseAuthUserByEmail: (...a: unknown[]) => (mockGetAuthUser as any)(...a),
}))

// Other module-level imports of admin/actions.ts — mocked so the module loads.
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/services/compliance.service', () => ({ buildUserDataExportPayload: vi.fn() }))
vi.mock('@/lib/services/billing/reconciliation.service', () => ({ getBillingReconciliationSnapshot: vi.fn() }))
vi.mock('@/lib/services/ops/launch-readiness.service', () => ({ getLaunchReadinessSnapshot: vi.fn() }))
vi.mock('@/lib/services/gdpr-erasure.service', () => ({ eraseUserData: vi.fn(), isAnonymizedEmail: vi.fn() }))
vi.mock('@/lib/seo/site', () => ({ getSiteOrigin: () => 'https://www.policywallet.gr' }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { changeUserRole } from '@/app/(protected)/admin/actions'

beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRole.mockResolvedValue(ADMIN)
    mockUserFindUnique.mockResolvedValue({ email: 'u@example.gr', roles: 'policyholder' })
    mockUserUpdate.mockImplementation(async (args: any) => ({ id: args?.where?.id, ...args?.data }))
    mockGetAuthUser.mockResolvedValue({ id: 'auth-uuid-1', user_metadata: { language: 'el', email_verified: true } })
    mockUpdateUserById.mockResolvedValue({ error: null })
})

describe('changeUserRole', () => {
    it('promotes to admin: writes DB roles AND syncs the JWT metadata (merged)', async () => {
        const result = await changeUserRole('user-1', 'admin')

        expect(result).toEqual({ ok: true, jwtSynced: true })

        // DB updated to the validated single role
        expect(mockUserUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'user-1' }, data: { roles: 'admin' } })
        )

        // JWT synced by the EMAIL-resolved auth id, with metadata merged (not clobbered)
        expect(mockGetAuthUser).toHaveBeenCalledWith('u@example.gr')
        expect(mockUpdateUserById).toHaveBeenCalledWith('auth-uuid-1', {
            user_metadata: { language: 'el', email_verified: true, role: 'admin' },
        })

        // audit trail records the sync happened
        const auditMeta = mockLogAdminAction.mock.calls[0]?.[4]
        expect(auditMeta).toMatchObject({ newRole: 'admin', jwtSynced: true })
    })

    it('rejects an unknown role before touching the DB or JWT', async () => {
        const result = await changeUserRole('user-1', 'superuser')

        expect(result).toEqual({ ok: false, error: 'INVALID_ROLE' })
        expect(mockUserUpdate).not.toHaveBeenCalled()
        expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it('returns USER_NOT_FOUND when the user does not exist', async () => {
        mockUserFindUnique.mockResolvedValue(null)

        const result = await changeUserRole('ghost', 'agent')

        expect(result).toEqual({ ok: false, error: 'USER_NOT_FOUND' })
        expect(mockUserUpdate).not.toHaveBeenCalled()
    })

    it('surfaces a JWT sync failure honestly (DB kept, audited jwtSynced:false)', async () => {
        mockUpdateUserById.mockResolvedValue({ error: { message: 'boom' } })

        const result = await changeUserRole('user-1', 'admin')

        expect(result).toEqual({ ok: false, error: 'ROLE_SAVED_JWT_SYNC_FAILED' })
        // DB was still updated so a retry can re-sync
        expect(mockUserUpdate).toHaveBeenCalled()
        const auditMeta = mockLogAdminAction.mock.calls[0]?.[4]
        expect(auditMeta).toMatchObject({ jwtSynced: false })
    })

    it('treats a missing Supabase auth user as a sync failure', async () => {
        mockGetAuthUser.mockResolvedValue(null)

        const result = await changeUserRole('user-1', 'admin')

        expect(result).toEqual({ ok: false, error: 'ROLE_SAVED_JWT_SYNC_FAILED' })
        expect(mockUpdateUserById).not.toHaveBeenCalled()
    })
})
