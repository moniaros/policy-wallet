/**
 * The GDPR erasure engine (lib/services/gdpr-erasure.service.ts): external
 * systems first (Stripe → Supabase auth → storage), DB transaction last, so
 * any failure leaves the request retryable; and the DB pass must actually
 * cover the fields the audit found surviving (taxId, profile health fields,
 * export payload snapshots, payment methods, customer-authored content).
 * Audit: docs/audits/gdpr-deletion-erasure-2026-07.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const count = (n = 0) => ({ count: n })

const tx = {
    policy: { deleteMany: vi.fn(async (_a?: any) => count(2)) },
    account: { deleteMany: vi.fn(async (_a?: any) => count()) },
    session: { deleteMany: vi.fn(async (_a?: any) => count()) },
    activeSession: { deleteMany: vi.fn(async (_a?: any) => count()) },
    passkeyCredential: { deleteMany: vi.fn(async (_a?: any) => count()) },
    webAuthnChallenge: { deleteMany: vi.fn(async (_a?: any) => count()) },
    notificationPreference: { deleteMany: vi.fn(async (_a?: any) => count()) },
    notificationEvent: { deleteMany: vi.fn(async (_a?: any) => count()) },
    securityEvent: { deleteMany: vi.fn(async (_a?: any) => count()) },
    accessGrant: { deleteMany: vi.fn(async (_a?: any) => count()) },
    invite: { deleteMany: vi.fn(async (_a?: any) => count()) },
    paymentMethod: { deleteMany: vi.fn(async (_a?: any) => count(1)) },
    questionnaireResponse: { deleteMany: vi.fn(async (_a?: any) => count(3)) },
    userTask: { deleteMany: vi.fn(async (_a?: any) => count()) },
    protectionScore: { deleteMany: vi.fn(async (_a?: any) => count()) },
    recommendationInstance: { deleteMany: vi.fn(async (_a?: any) => count()) },
    formSubmission: { deleteMany: vi.fn(async (_a?: any) => count(1)) },
    subscription: { updateMany: vi.fn(async (_a?: any) => count(1)) },
    policyholderProfile: { updateMany: vi.fn(async (_a?: any) => count(1)) },
    agentProfile: { updateMany: vi.fn(async (_a?: any) => count()) },
    collaborationMessage: { updateMany: vi.fn(async (_a?: any) => count(4)) },
    referral: { updateMany: vi.fn(async (_a?: any) => count()) },
    consentAudit: { updateMany: vi.fn(async (_a?: any) => count()) },
    dataExportRequest: { updateMany: vi.fn(async (_a?: any) => count(1)) },
    customerRelationship: { updateMany: vi.fn(async (_a?: any) => count(1)) },
    gapInstance: { deleteMany: vi.fn(async (_a?: any) => count(1)) },
    lifeEventInstance: { deleteMany: vi.fn(async (_a?: any) => count(2)) },
    riskProfileVersion: { deleteMany: vi.fn(async (_a?: any) => count(3)) },
    user: { update: vi.fn(async (_a?: any) => ({})) },
}

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn() },
        subscription: { findMany: vi.fn(async () => []) },
        policyDocument: { findMany: vi.fn(async () => []) },
        $transaction: vi.fn(async (cb: any, _opts?: any) => cb(tx)),
    },
}))

const mockStripeCancel = vi.fn(async (..._a: any[]) => ({}))
const mockStripeCustomerDel = vi.fn(async (..._a: any[]) => ({}))
vi.mock('@/lib/stripe', () => ({
    stripe: {
        subscriptions: { cancel: (...a: unknown[]) => (mockStripeCancel as any)(...a) },
        customers: { del: (...a: unknown[]) => (mockStripeCustomerDel as any)(...a) },
    },
}))

const mockDeleteFile = vi.fn(async (..._a: any[]) => true)
vi.mock('@/lib/storage', () => ({
    deleteFile: (...a: unknown[]) => (mockDeleteFile as any)(...a),
}))

const mockDeleteBrevo = vi.fn(async (..._a: any[]) => false)
vi.mock('@/lib/brevo', () => ({
    deleteBrevoContact: (...a: unknown[]) => (mockDeleteBrevo as any)(...a),
}))

const mockListUsers = vi.fn(async (..._a: any[]): Promise<any> => ({ data: { users: [] }, error: null }))
const mockAuthDeleteUser = vi.fn(async (..._a: any[]): Promise<any> => ({ error: null }))
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        auth: {
            admin: {
                listUsers: (...a: unknown[]) => (mockListUsers as any)(...a),
                deleteUser: (...a: unknown[]) => (mockAuthDeleteUser as any)(...a),
            },
        },
    }),
}))

vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { db } from '@/lib/db'
import { eraseUserData, isAnonymizedEmail } from '@/lib/services/gdpr-erasure.service'

const mockUserFind = vi.mocked(db.user.findUnique)
const mockSubsFind = vi.mocked(db.subscription.findMany)
const mockDocsFind = vi.mocked(db.policyDocument.findMany)
const mockTransaction = vi.mocked(db.$transaction)

const USER = { id: 'user-1', email: 'maria@example.com', stripeCustomerId: null, roles: 'policyholder' }

beforeEach(() => {
    vi.clearAllMocks()
    mockUserFind.mockResolvedValue(USER as any)
    mockSubsFind.mockResolvedValue([] as any)
    mockDocsFind.mockResolvedValue([] as any)
    mockListUsers.mockResolvedValue({
        data: { users: [{ id: 'auth-uid-1', email: 'maria@example.com' }] },
        error: null,
    })
    mockAuthDeleteUser.mockResolvedValue({ error: null })
    mockDeleteFile.mockResolvedValue(true)
    mockDeleteBrevo.mockResolvedValue(false)
})

describe('eraseUserData — DB coverage', () => {
    it('clears taxId + consent fields on the user row and fully scrubs the risk/health profile', async () => {
        await eraseUserData('user-1')

        const userData = tx.user.update.mock.calls[0]![0].data
        expect(userData).toMatchObject({
            taxId: null,
            phoneNumber: null,
            aiProcessingConsentVersion: null,
            lastActiveAt: null,
            name: 'Deleted User',
        })
        expect(userData.email).toMatch(/^deleted\+user-1\..*@deleted\.policywallet\.local$/)
        expect(isAnonymizedEmail(userData.email)).toBe(true)

        // The Art. 9 fields the old eraser left behind.
        const profileData = tx.policyholderProfile.updateMany.mock.calls[0]![0].data
        for (const field of [
            'chronicConditions', 'familyMedicalHistory', 'dateOfBirth', 'gender',
            'heightCm', 'weightKg', 'smokingStatus', 'annualIncome', 'occupation',
            'drivingRecord', 'lifeEvents', 'maritalStatus', 'mortgageAmount', 'loanAmount',
        ]) {
            expect(profileData, `profile scrub must cover ${field}`).toHaveProperty(field)
        }
        expect(profileData.gender).toBeNull()
        expect(profileData.heightCm).toBeNull()
    })

    it('erases payment methods, questionnaire answers, gaps, tasks and purges export snapshots', async () => {
        const summary = await eraseUserData('user-1')

        expect(tx.paymentMethod.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
        expect(tx.questionnaireResponse.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
        expect(tx.userTask.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
        expect(tx.gapInstance.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })

        // Export request rows stay (accountability) but the PII snapshot goes.
        const exportPurge = tx.dataExportRequest.updateMany.mock.calls[0]![0]
        expect(exportPurge.where).toEqual({ userId: 'user-1' })
        expect(exportPurge.data.downloadToken).toBeNull()
        expect(exportPurge.data).toHaveProperty('payloadJson')

        // Customer-authored free text is scrubbed, not left readable.
        expect(tx.collaborationMessage.updateMany).toHaveBeenCalledWith({
            where: { senderUserId: 'user-1' },
            data: { body: '[deleted]' },
        })

        // Contact-form rows have no userId — matched by email.
        expect(tx.formSubmission.deleteMany.mock.calls[0]![0].where.email.equals).toBe('maria@example.com')

        expect(summary.deletedPaymentMethods).toBe(1)
        expect(summary.purgedDataExports).toBe(1)
    })
})

describe('eraseUserData — external systems, ordered for retry safety', () => {
    it('cancels Stripe subscriptions and deletes the Supabase auth identity resolved by email', async () => {
        mockSubsFind.mockResolvedValue([
            { stripeSubscriptionId: 'sub_1' },
            { stripeSubscriptionId: null }, // grandfathered row — skipped
        ] as any)

        const summary = await eraseUserData('user-1')

        expect(mockStripeCancel).toHaveBeenCalledTimes(1)
        expect(mockStripeCancel).toHaveBeenCalledWith('sub_1')
        expect(mockAuthDeleteUser).toHaveBeenCalledWith('auth-uid-1')
        expect(summary.stripeSubscriptionsCancelled).toBe(1)
        expect(summary.authUserDeleted).toBe(true)
    })

    it('a Stripe failure aborts BEFORE auth/storage/DB are touched (retryable)', async () => {
        mockSubsFind.mockResolvedValue([{ stripeSubscriptionId: 'sub_1' }] as any)
        mockStripeCancel.mockRejectedValue(Object.assign(new Error('rate limited'), { code: 'rate_limit' }))

        await expect(eraseUserData('user-1')).rejects.toThrow(/Stripe cancellation failed/)
        expect(mockDeleteBrevo).not.toHaveBeenCalled()
        expect(mockListUsers).not.toHaveBeenCalled()
        expect(mockDeleteFile).not.toHaveBeenCalled()
        expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('tolerates already-gone Stripe subscriptions (resource_missing)', async () => {
        mockSubsFind.mockResolvedValue([{ stripeSubscriptionId: 'sub_gone' }] as any)
        mockStripeCancel.mockRejectedValue(Object.assign(new Error('no such sub'), { code: 'resource_missing' }))

        const summary = await eraseUserData('user-1')
        expect(summary.stripeSubscriptionsCancelled).toBe(0)
        expect(mockTransaction).toHaveBeenCalledTimes(1)
    })

    it('tolerates an already-cancelled subscription on retry (invalid_request_error, not resource_missing)', async () => {
        mockSubsFind.mockResolvedValue([{ stripeSubscriptionId: 'sub_1' }] as any)
        mockStripeCancel.mockRejectedValue(
            Object.assign(new Error('This subscription has already been canceled.'), { code: 'invalid_request_error' })
        )

        const summary = await eraseUserData('user-1')
        expect(summary.stripeSubscriptionsCancelled).toBe(0)
        expect(mockTransaction).toHaveBeenCalledTimes(1)
    })

    it('a storage failure aborts before the DB transaction (file list re-derivable on retry)', async () => {
        mockDocsFind.mockResolvedValue([
            { id: 'doc-1', fileUrl: 'https://x/storage/v1/object/public/policies/a.pdf' },
        ] as any)
        mockDeleteFile.mockResolvedValue(false)

        await expect(eraseUserData('user-1')).rejects.toThrow(/Storage deletion failed/)
        expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('deletes every owned policy document from storage on the happy path', async () => {
        mockDocsFind.mockResolvedValue([
            { id: 'doc-1', fileUrl: 'url-1' },
            { id: 'doc-2', fileUrl: 'url-2' },
        ] as any)

        const summary = await eraseUserData('user-1')
        expect(mockDeleteFile).toHaveBeenCalledTimes(2)
        expect(summary.storageFilesDeleted).toBe(2)
    })

    it('proceeds when the auth identity is already absent (idempotent re-run)', async () => {
        mockListUsers.mockResolvedValue({ data: { users: [] }, error: null })

        const summary = await eraseUserData('user-1')
        expect(mockAuthDeleteUser).not.toHaveBeenCalled()
        expect(summary.authUserDeleted).toBe(false)
        expect(mockTransaction).toHaveBeenCalledTimes(1)
    })

    it('skips the auth lookup entirely for an already-anonymized row (prior partial run)', async () => {
        mockUserFind.mockResolvedValue({
            id: 'user-1',
            email: 'deleted+user-1.123@deleted.policywallet.local',
            roles: 'policyholder',
        } as any)

        const summary = await eraseUserData('user-1')
        expect(mockListUsers).not.toHaveBeenCalled()
        expect(summary.authUserDeleted).toBe(false)
    })

    it('a failed auth deletion aborts before the DB transaction', async () => {
        mockAuthDeleteUser.mockResolvedValue({ error: { message: 'boom' } } as any)

        await expect(eraseUserData('user-1')).rejects.toThrow(/auth deleteUser failed/)
        expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('deletes the Brevo contact by original email, and a Brevo failure aborts before auth/storage/DB', async () => {
        mockDeleteBrevo.mockResolvedValueOnce(true)
        const summary = await eraseUserData('user-1')
        expect(mockDeleteBrevo).toHaveBeenCalledWith('maria@example.com')
        expect(summary.brevoContactDeleted).toBe(true)

        mockDeleteBrevo.mockRejectedValueOnce(new Error('Brevo contact deletion failed (500): boom'))
        await expect(eraseUserData('user-1')).rejects.toThrow(/Brevo contact deletion failed/)
        expect(mockTransaction).toHaveBeenCalledTimes(1) // only the first, successful run
    })

    it('terminates the B2B relationships on both sides (owner decision #1)', async () => {
        await eraseUserData('user-1')
        expect(tx.customerRelationship.updateMany).toHaveBeenCalledWith({
            where: { OR: [{ policyholderUserId: 'user-1' }, { agentUserId: 'user-1' }] },
            data: { status: 'terminated' },
        })
    })

    it('deletes the Stripe customer object, tolerating already-gone (owner decision #9)', async () => {
        mockUserFind.mockResolvedValue({ ...USER, stripeCustomerId: 'cus_123' } as any)
        const summary = await eraseUserData('user-1')
        expect(mockStripeCustomerDel).toHaveBeenCalledWith('cus_123')
        expect(summary.stripeCustomerDeleted).toBe(true)

        mockUserFind.mockResolvedValue({ ...USER, stripeCustomerId: 'cus_gone' } as any)
        mockStripeCustomerDel.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'resource_missing' }))
        const retry = await eraseUserData('user-1')
        expect(retry.stripeCustomerDeleted).toBe(false)
    })

    it('skips Stripe customer deletion when no customer id exists', async () => {
        const summary = await eraseUserData('user-1')
        expect(mockStripeCustomerDel).not.toHaveBeenCalled()
        expect(summary.stripeCustomerDeleted).toBe(false)
    })

    it('throws for an unknown user', async () => {
        mockUserFind.mockResolvedValue(null)
        await expect(eraseUserData('nope')).rejects.toThrow('User not found')
    })

    it('refuses to erase an account that still holds the admin role', async () => {
        mockUserFind.mockResolvedValue({ ...USER, roles: 'policyholder,admin' } as any)

        await expect(eraseUserData('user-1')).rejects.toThrow(/admin/)
        expect(mockStripeCancel).not.toHaveBeenCalled()
        expect(mockListUsers).not.toHaveBeenCalled()
        expect(mockTransaction).not.toHaveBeenCalled()
    })
})

describe('eraseUserData — the life-event stores', () => {
    it('deletes life events and risk profile versions', async () => {
        // The erasure model is anonymize-in-place: the User row SURVIVES, so
        // `ON DELETE CASCADE` never fires. A store left off the transaction
        // outlives the request that asked for it to go — and life events are
        // marriage, divorce, births and health changes.
        mockUserFind.mockResolvedValue({ id: 'u1', email: 'a@b.gr', roles: 'policyholder' } as any)
        const summary = await eraseUserData('u1')

        expect(tx.lifeEventInstance.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
        expect(tx.riskProfileVersion.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })

        // The counts must reach the summary, because the DSR decision log is
        // what evidences the erasure. They are read POSITIONALLY out of a
        // Promise.all, so an insertion without a matching name silently shifts
        // every count after it — which is exactly what this catches.
        expect(summary.deletedLifeEvents).toBe(2)
        expect(summary.deletedRiskProfileVersions).toBe(3)
    })
})
