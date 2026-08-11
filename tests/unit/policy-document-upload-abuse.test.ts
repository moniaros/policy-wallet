// @vitest-environment node
// Node env on purpose: this suite drives the route with real multipart
// Request/FormData/File, and jsdom's File is not interoperable with undici's
// Request.formData() parser.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireApiUser = vi.fn()
const rateLimit = vi.fn()
const getPolicyAccess = vi.fn()
const findUniquePolicy = vi.fn()
const countDocuments = vi.fn()
const createDocument = vi.fn()
const createActivityLog = vi.fn()
const uploadFileDetailed = vi.fn()
const deleteFile = vi.fn()
const createSignedUrlForStoredObject = vi.fn()

vi.mock('@/lib/api-auth', () => ({
    requireApiUser: (...args: any[]) => requireApiUser(...args),
}))
vi.mock('@/lib/rate-limit', () => ({
    rateLimit: (...args: any[]) => rateLimit(...args),
}))
vi.mock('@/lib/policy-access', () => ({
    getPolicyAccess: (...args: any[]) => getPolicyAccess(...args),
}))
vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: (...args: any[]) => findUniquePolicy(...args) },
        policyDocument: {
            count: (...args: any[]) => countDocuments(...args),
            create: (...args: any[]) => createDocument(...args),
        },
        activityLog: { create: (...args: any[]) => createActivityLog(...args) },
    },
}))
vi.mock('@/lib/storage', () => ({
    uploadFileDetailed: (...args: any[]) => uploadFileDetailed(...args),
    deleteFile: (...args: any[]) => deleteFile(...args),
}))
vi.mock('@/lib/supabase/storage-download', () => ({
    createSignedUrlForStoredObject: (...args: any[]) => createSignedUrlForStoredObject(...args),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { POST } from '@/app/api/v1/policies/[id]/documents/route'
import { MAX_DOCUMENTS_PER_POLICY } from '@/lib/security/file-upload'

const STORED_URL = 'https://x.supabase.co/storage/v1/object/public/policies/uuid.pdf'

function pdfBytes(size = 256): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(new ArrayBuffer(size))
    bytes.set([0x25, 0x50, 0x44, 0x46], 0) // %PDF
    return bytes
}

function makeUploadRequest(file: File) {
    const form = new FormData()
    form.set('file', file)
    return new Request('http://localhost/api/v1/policies/p1/documents', {
        method: 'POST',
        body: form,
    })
}

const ctx = { params: Promise.resolve({ id: 'p1' }) }

beforeEach(() => {
    vi.clearAllMocks()
    requireApiUser.mockResolvedValue({
        auth: { dbUser: { id: 'u1', roles: 'user', email: 'u1@x.gr' } },
        roles: [],
    })
    rateLimit.mockResolvedValue({ success: true })
    getPolicyAccess.mockResolvedValue({
        exists: true,
        isOwner: true,
        canRead: true,
        canManageDocuments: true,
    })
    findUniquePolicy.mockResolvedValue({ id: 'p1', policyNumber: 'PN-1' })
    countDocuments.mockResolvedValue(0)
    // The route now records the locator, not just a URL.
    uploadFileDetailed.mockResolvedValue({
        url: STORED_URL,
        bucket: 'policies',
        key: '9b2f2f2e-aaaa-bbbb-cccc-000000000001.pdf',
        mimeType: 'application/pdf',
        size: 1024,
    })
    deleteFile.mockResolvedValue(true)
    createDocument.mockResolvedValue({
        id: 'd1',
        policyId: 'p1',
        fileUrl: STORED_URL,
        fileName: 'policy.pdf',
        fileSize: 256,
        processingStatus: 'pending',
        uploadedAt: new Date(),
    })
    createActivityLog.mockResolvedValue({})
    createSignedUrlForStoredObject.mockResolvedValue('https://signed.example/x')
})

describe('POST /api/v1/policies/[id]/documents — abuse & failure handling', () => {
    it('accepts a valid PDF within limits', async () => {
        const file = new File([pdfBytes()], 'policy.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(200)
        expect(uploadFileDetailed).toHaveBeenCalledTimes(1)
    })

    it('rejects an oversized upload before it reaches storage', async () => {
        // 10MB route cap — 10MB+1 must be refused with nothing stored.
        const file = new File([pdfBytes(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(400)
        expect(uploadFileDetailed).not.toHaveBeenCalled()
        expect(createDocument).not.toHaveBeenCalled()
    })

    it('returns 429 when the caller exceeds the upload rate limit', async () => {
        rateLimit.mockResolvedValue({ success: false })
        const file = new File([pdfBytes()], 'policy.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(429)
        expect(uploadFileDetailed).not.toHaveBeenCalled()
    })

    it('enforces the per-policy document count cap', async () => {
        countDocuments.mockResolvedValue(MAX_DOCUMENTS_PER_POLICY)
        const file = new File([pdfBytes()], 'policy.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(400)
        expect(uploadFileDetailed).not.toHaveBeenCalled()
    })

    it('cleans up the stored object when the DB write fails after upload', async () => {
        createDocument.mockRejectedValue(new Error('db down'))
        const file = new File([pdfBytes()], 'policy.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(500)
        expect(uploadFileDetailed).toHaveBeenCalledTimes(1)
        // The orphan is removed — rejection leaves no residue in the bucket.
        expect(deleteFile).toHaveBeenCalledWith(STORED_URL)
    })

    it('a validation rejection stores nothing and needs no cleanup', async () => {
        // PNG bytes disguised as .pdf → content_mismatch
        const spoofed = new Uint8Array(new ArrayBuffer(64))
        spoofed.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
        const file = new File([spoofed], 'fake.pdf', { type: 'application/pdf' })

        const response = await POST(makeUploadRequest(file), ctx as any)

        expect(response.status).toBe(400)
        expect(uploadFileDetailed).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
    })
})
