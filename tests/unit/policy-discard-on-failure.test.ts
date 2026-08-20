/**
 * A failed analysis must not leave a half-created policy behind.
 *
 * Two things are pinned here, and they pull in opposite directions:
 *
 * **DISCARD.** A technical failure (provider error, unreadable document,
 * timeout, dead executor) on a policy that is nothing but placeholders removes
 * everything: the bucket object, the document rows, the policy row. The order
 * matters and is asserted — storage FIRST. An object that outlives its row is
 * personal data reachable by no GDPR export and no erasure request, which is
 * why a storage failure ABORTS the discard rather than proceeding.
 *
 * **KEEP.** A quota- or consent-blocked run, and any failure on a policy
 * somebody actually typed an insurer into, keeps everything and says why.
 * Silently deleting a quota-blocked upload makes the product look broken.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const deleteFile = vi.hoisted(() => vi.fn(async () => true))
const emit = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/notifications/dispatch', () => ({ emit }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(),
    sendPolicySharedAccessEmail: vi.fn(),
}))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))

import { classifyAnalysisFailure, discardFailedPolicy, discardOrphanedUploads } from '@/lib/services/policy-discard'

/** A policy row shaped the way the create path leaves it. */
const placeholderRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'pol-1',
    insurerName: '__PENDING_EXTRACTION__',
    policyNumber: 'PENDING-1786732800000',
    ownerUserId: 'user-1',
    documents: [
        { id: 'doc-1', fileUrl: 'https://x.supabase.co/storage/v1/object/public/policies/a.pdf' },
        { id: 'doc-2', fileUrl: 'https://x.supabase.co/storage/v1/object/public/policies/b.pdf' },
    ],
    ...overrides,
})

function makeDb(row: any) {
    return {
        policy: {
            findUnique: vi.fn(async () => row),
            delete: vi.fn(async () => ({ id: 'pol-1' })),
        },
    }
}

describe('classifyAnalysisFailure', () => {
    it('routes quota and consent to KEEP-AND-INFORM, with a stable code', () => {
        expect(classifyAnalysisFailure({ blockedReason: 'insufficient_tokens' })).toMatchObject({
            kind: 'inform',
            code: 'TOKEN_LIMIT_BLOCKED',
        })
        expect(classifyAnalysisFailure({ blockedReason: 'monthly_limit_reached' })).toMatchObject({
            kind: 'inform',
            code: 'TOKEN_LIMIT_BLOCKED',
        })
        expect(classifyAnalysisFailure({ blockedReason: 'ai_consent_missing' })).toMatchObject({
            kind: 'inform',
            code: 'AI_CONSENT_REQUIRED',
        })
        expect(classifyAnalysisFailure({ blockedReason: 'forbidden' })).toMatchObject({
            kind: 'inform',
            code: 'ANALYSIS_NOT_PERMITTED',
        })
    })

    it('catches the token gate when it surfaces as a thrown error rather than a blocked run', () => {
        expect(
            classifyAnalysisFailure({ message: 'Token budget check failed: insufficient tokens' })
        ).toMatchObject({ kind: 'inform', code: 'TOKEN_LIMIT_BLOCKED' })
    })

    it('routes every technical failure to DISCARD', () => {
        expect(classifyAnalysisFailure({ message: 'Gemini request failed: 503' })).toMatchObject({
            kind: 'discard',
            code: 'ANALYSIS_FAILED',
        })
        expect(classifyAnalysisFailure({ message: 'Request timeout after 180000ms' })).toMatchObject({
            kind: 'discard',
            code: 'TIMEOUT',
        })
        expect(classifyAnalysisFailure({ message: 'extraction_failed' })).toMatchObject({ kind: 'discard' })
    })
})

describe('discardFailedPolicy — zero rows, zero objects', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        deleteFile.mockResolvedValue(true)
    })

    it('removes every storage object AND the policy row', async () => {
        const db = makeDb(placeholderRow())

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(true)
        expect(result.objectsRemoved).toBe(2)
        expect(result.objectsFailed).toBe(0)
        expect(result.documentsRemoved).toBe(2)

        // Every object the policy referenced, and nothing else.
        expect(deleteFile).toHaveBeenCalledTimes(2)
        expect(deleteFile).toHaveBeenCalledWith('https://x.supabase.co/storage/v1/object/public/policies/a.pdf')
        expect(deleteFile).toHaveBeenCalledWith('https://x.supabase.co/storage/v1/object/public/policies/b.pdf')

        // The row is gone; the cascade takes policy_documents with it.
        expect(db.policy.delete).toHaveBeenCalledWith({ where: { id: 'pol-1' } })
    })

    it('deletes storage BEFORE the row, so a crash between the two cannot orphan an object', async () => {
        const order: string[] = []
        deleteFile.mockImplementation(async () => {
            order.push('storage')
            return true
        })
        const db = makeDb(placeholderRow())
        db.policy.delete.mockImplementation(async () => {
            order.push('row')
            return { id: 'pol-1' } as never
        })

        await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(order).toEqual(['storage', 'storage', 'row'])
    })

    it('KEEPS the row when a storage object could not be removed', async () => {
        // The row is the only thing still pointing at that object. Deleting it
        // here is precisely how the nine orphans in production were made.
        deleteFile.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        const db = makeDb(placeholderRow())

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(false)
        expect(result.keptReason).toBe('storage_delete_failed')
        expect(result.objectsFailed).toBe(1)
        expect(db.policy.delete).not.toHaveBeenCalled()
    })

    it('treats a throwing storage client as a failure, not a success', async () => {
        deleteFile.mockRejectedValueOnce(new Error('network down'))
        const db = makeDb(placeholderRow())

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(false)
        expect(db.policy.delete).not.toHaveBeenCalled()
    })

    it('never discards a policy carrying a user-supplied identity', async () => {
        const db = makeDb(placeholderRow({ insurerName: 'Interamerican' }))

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(false)
        expect(result.keptReason).toBe('user_supplied_identity')
        expect(deleteFile).not.toHaveBeenCalled()
        expect(db.policy.delete).not.toHaveBeenCalled()
    })

    it('is a no-op on a policy that is already gone', async () => {
        const db = makeDb(null)

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(false)
        expect(result.keptReason).toBe('not_found')
        expect(deleteFile).not.toHaveBeenCalled()
    })

    it('handles a policy with no documents', async () => {
        const db = makeDb(placeholderRow({ documents: [] }))

        const result = await discardFailedPolicy('pol-1', { reason: 'ANALYSIS_FAILED', db: db as any })

        expect(result.discarded).toBe(true)
        expect(result.objectsRemoved).toBe(0)
        expect(db.policy.delete).toHaveBeenCalled()
    })
})

describe('discardOrphanedUploads — the create-path rollback', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        deleteFile.mockResolvedValue(true)
    })

    it('removes every object that will never get a row', async () => {
        const result = await discardOrphanedUploads(['a', 'b', null, undefined, ''], {
            reason: 'policy_limit_reached',
        })

        expect(result).toEqual({ removed: 2, failed: 0 })
        expect(deleteFile).toHaveBeenCalledTimes(2)
    })

    it('reports failures instead of swallowing them', async () => {
        deleteFile.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

        const result = await discardOrphanedUploads(['a', 'b'], { reason: 'policy_create_failed' })

        expect(result).toEqual({ removed: 1, failed: 1 })
    })
})
