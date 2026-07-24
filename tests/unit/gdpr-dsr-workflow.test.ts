/**
 * The DSR status machine in app/(protected)/admin/actions.ts: execute must
 * accept `processing` (recovery from a crash between the erasure and the
 * completed-write — previously an unrecoverable dead-end), a thrown erasure
 * marks the request failed+retryable, admin deleteUser now routes through the
 * same DSR machinery instead of the FK-doomed db.user.delete(), and DSR audit
 * logs identify subjects by id, never by email (the execute log used to
 * preserve the exact identifier the erasure had just removed).
 * Audit: docs/audits/gdpr-deletion-erasure-2026-07.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN = { id: 'admin-1', email: 'admin@policywallet.gr', roles: 'admin' }

const mockVerifyAdminRole = vi.fn(async (..._a: any[]): Promise<any> => ADMIN)
const mockLogAdminAction = vi.fn(async (..._a: any[]) => {})
vi.mock('@/lib/admin/admin-guard', () => ({
    verifyAdminRole: (...a: unknown[]) => (mockVerifyAdminRole as any)(...a),
    logAdminAction: (...a: unknown[]) => (mockLogAdminAction as any)(...a),
}))

const mockEraseUserData = vi.fn(async (..._a: any[]): Promise<any> => ({
    anonymizedEmail: 'deleted+u1.1@deleted.policywallet.local',
    deletedPolicies: 1,
    storageFilesDeleted: 1,
    stripeSubscriptionsCancelled: 1,
    authUserDeleted: true,
    cancelledSubscriptions: 1,
}))
vi.mock('@/lib/services/gdpr-erasure.service', () => ({
    eraseUserData: (...a: unknown[]) => (mockEraseUserData as any)(...a),
    isAnonymizedEmail: (email: string) => !!email && email.endsWith('@deleted.policywallet.local'),
}))

vi.mock('@/lib/db', () => ({
    db: {
        deletionRequest: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })) as any,
        },
        user: { findUnique: vi.fn(), delete: vi.fn() },
        dataExportRequest: { findUnique: vi.fn(), update: vi.fn() },
    },
}))

const mockSendEmail = vi.fn(async (..._a: any[]) => ({ success: true }))
vi.mock('@/lib/email/email-service', () => ({
    sendEmail: (...a: unknown[]) => (mockSendEmail as any)(...a),
}))
// Spread the real module rather than replacing it: a bare `{ getSiteOrigin }`
// made every OTHER export undefined, so when the email templates started reading
// siteConfig.contactEmail the template threw, sendDsrLifecycleEmail's catch
// swallowed it, and three Art. 12(4) assertions failed for a reason that had
// nothing to do with GDPR.
vi.mock('@/lib/seo/site', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/seo/site')>()),
    getSiteOrigin: () => 'https://www.policywallet.gr',
}))

vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/services/compliance.service', () => ({ buildUserDataExportPayload: vi.fn() }))
vi.mock('@/lib/services/billing/reconciliation.service', () => ({ getBillingReconciliationSnapshot: vi.fn() }))
vi.mock('@/lib/services/ops/launch-readiness.service', () => ({ getLaunchReadinessSnapshot: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))

import { db } from '@/lib/db'
import { executeDeletionRequest, deleteUser, approveDeletionRequest, rejectDeletionRequest } from '@/app/(protected)/admin/actions'

const mockRequestFind = vi.mocked(db.deletionRequest.findUnique)
const mockRequestFindFirst = vi.mocked(db.deletionRequest.findFirst)
const mockRequestCreate = vi.mocked(db.deletionRequest.create)
const mockRequestUpdate = vi.mocked(db.deletionRequest.update)
const mockUserFind = vi.mocked(db.user.findUnique)
const mockUserDelete = vi.mocked(db.user.delete)

function request(status: string, overrides: Record<string, unknown> = {}) {
    return {
        id: 'req-1',
        userId: 'user-1',
        status,
        reviewedAt: null,
        operatorNotes: null,
        user: { email: 'maria@example.com', preferredLanguage: 'el' },
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue({ success: true } as any)
    mockVerifyAdminRole.mockResolvedValue(ADMIN as any)
    mockEraseUserData.mockResolvedValue({
        anonymizedEmail: 'deleted+u1.1@deleted.policywallet.local',
        deletedPolicies: 1,
        storageFilesDeleted: 1,
        stripeSubscriptionsCancelled: 1,
        authUserDeleted: true,
        cancelledSubscriptions: 1,
    } as any)
    ;(mockRequestUpdate as any).mockImplementation(async (args: any) => ({ id: args.where.id, ...args.data }))
})

describe('executeDeletionRequest — status machine', () => {
    it.each(['approved', 'failed', 'processing'])('executes from %s', async (status) => {
        mockRequestFind.mockResolvedValue(request(status) as any)

        const result = await executeDeletionRequest('req-1')

        expect(result.success).toBe(true)
        expect(mockEraseUserData).toHaveBeenCalledWith('user-1')
        const finalWrite = mockRequestUpdate.mock.calls.at(-1)![0] as any
        expect(finalWrite.data.status).toBe('completed')
    })

    it.each(['requested', 'in_review', 'completed', 'rejected'])('refuses to execute from %s', async (status) => {
        mockRequestFind.mockResolvedValue(request(status) as any)

        const result = await executeDeletionRequest('req-1')

        expect(result.success).toBe(false)
        expect(mockEraseUserData).not.toHaveBeenCalled()
    })

    it('a thrown erasure marks the request failed with the error message (retryable)', async () => {
        mockRequestFind.mockResolvedValue(request('approved') as any)
        mockEraseUserData.mockRejectedValue(new Error('Storage deletion failed for 1 document(s): doc-9'))

        const result = await executeDeletionRequest('req-1')

        expect(result.success).toBe(false)
        const finalWrite = mockRequestUpdate.mock.calls.at(-1)![0] as any
        expect(finalWrite.data.status).toBe('failed')
        expect(finalWrite.data.errorMessage).toContain('Storage deletion failed')
    })

    it('DSR audit logs never carry the subject email', async () => {
        mockRequestFind.mockResolvedValue(request('approved') as any)

        await executeDeletionRequest('req-1')

        expect(mockLogAdminAction).toHaveBeenCalled()
        for (const call of mockLogAdminAction.mock.calls) {
            const description = call[3] as string
            const metadata = call[4] as Record<string, unknown> | undefined
            expect(description).not.toContain('maria@example.com')
            expect(metadata ? JSON.stringify(metadata) : '').not.toContain('maria@example.com')
        }
    })
})

describe('Art. 12(4) — the data subject is informed of the outcome', () => {
    it('approval emails the user in their language', async () => {
        mockRequestFind.mockResolvedValue(request('requested') as any)

        await approveDeletionRequest('req-1')

        expect(mockSendEmail).toHaveBeenCalledTimes(1)
        const email = mockSendEmail.mock.calls[0]![0] as any
        expect(email.to).toBe('maria@example.com')
        expect(email.subject).toContain('εγκρίθηκε')
    })

    it('rejection emails the user WITH the reason', async () => {
        mockRequestFind.mockResolvedValue(request('in_review', { user: { email: 'maria@example.com', preferredLanguage: 'en' } }) as any)

        await rejectDeletionRequest('req-1', 'Identity could not be verified')

        expect(mockSendEmail).toHaveBeenCalledTimes(1)
        const email = mockSendEmail.mock.calls[0]![0] as any
        expect(email.to).toBe('maria@example.com')
        expect(email.html).toContain('Identity could not be verified')
        expect(email.html).toContain('complaint')
    })

    it('completion emails the ORIGINAL address captured before erasure', async () => {
        mockRequestFind.mockResolvedValue(request('approved') as any)

        await executeDeletionRequest('req-1')

        expect(mockSendEmail).toHaveBeenCalledTimes(1)
        expect((mockSendEmail.mock.calls[0]![0] as any).to).toBe('maria@example.com')
    })

    it('skips the completion email on a retry whose address is already anonymized', async () => {
        mockRequestFind.mockResolvedValue(
            request('failed', { user: { email: 'deleted+u1.9@deleted.policywallet.local', preferredLanguage: 'el' } }) as any
        )

        await executeDeletionRequest('req-1')

        expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('an email failure never fails the DSR action', async () => {
        mockRequestFind.mockResolvedValue(request('approved') as any)
        mockSendEmail.mockRejectedValue(new Error('smtp down'))

        const result = await executeDeletionRequest('req-1')
        expect(result.success).toBe(true)
    })
})

describe('deleteUser — centralized through the DSR eraser', () => {
    beforeEach(() => {
        mockUserFind.mockResolvedValue({ email: 'maria@example.com', roles: 'policyholder' } as any)
        mockRequestFindFirst.mockResolvedValue(null)
        mockRequestCreate.mockResolvedValue(request('approved') as any)
        // the internal executeDeletionRequest call re-loads the request
        mockRequestFind.mockResolvedValue(request('approved') as any)
    })

    it('creates an approved ADMIN_INITIATED request and runs the shared eraser — never db.user.delete', async () => {
        const result = await deleteUser('user-1', 'support request')

        expect(result.success).toBe(true)
        expect(mockUserDelete).not.toHaveBeenCalled()
        expect(mockRequestCreate).toHaveBeenCalledTimes(1)
        const createData = (mockRequestCreate.mock.calls[0]![0] as any).data
        expect(createData).toMatchObject({ userId: 'user-1', status: 'approved', legalBasis: 'ADMIN_INITIATED' })
        expect(createData.operatorNotes).toContain('support request')
        expect(mockEraseUserData).toHaveBeenCalledWith('user-1')
    })

    it('reuses an open request instead of creating a duplicate', async () => {
        mockRequestFindFirst.mockResolvedValue(request('requested') as any)

        await deleteUser('user-1', 'dup check')

        expect(mockRequestCreate).not.toHaveBeenCalled()
        const approveWrite = mockRequestUpdate.mock.calls[0]![0] as any
        expect(approveWrite.where.id).toBe('req-1')
        expect(approveWrite.data.status).toBe('approved')
    })

    it('still refuses to delete admin users', async () => {
        mockUserFind.mockResolvedValue({ email: 'root@policywallet.gr', roles: 'admin' } as any)

        await expect(deleteUser('admin-2')).rejects.toThrow('Failed to delete user')
        expect(mockEraseUserData).not.toHaveBeenCalled()
    })
})
