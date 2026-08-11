import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireApiUser = vi.fn()
const rateLimit = vi.fn()
const getPolicyAccess = vi.fn()
const findFirstDocument = vi.fn()
const deleteDocument = vi.fn()
const createActivityLog = vi.fn()
const signStoredObject = vi.fn()
const deleteFile = vi.fn()

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
        policyDocument: {
            findFirst: (...args: any[]) => findFirstDocument(...args),
            delete: (...args: any[]) => deleteDocument(...args),
        },
        activityLog: {
            create: (...args: any[]) => createActivityLog(...args),
        },
    },
}))
vi.mock('@/lib/supabase/storage-download', () => ({
    signStoredObject: (...args: any[]) => signStoredObject(...args),
}))
vi.mock('@/lib/storage', () => ({
    deleteFile: (...args: any[]) => deleteFile(...args),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { GET, DELETE } from '@/app/api/v1/policies/[id]/documents/[docId]/route'

const STORED_URL = 'https://x.supabase.co/storage/v1/object/public/policies/9b2f2f2e-aaaa-bbbb-cccc-000000000001.pdf'
const SIGNED_URL = 'https://x.supabase.co/storage/v1/object/sign/policies/9b2f...?token=abc'

function makeRequest(method = 'GET') {
    return new Request('http://localhost/api/v1/policies/p1/documents/d1', { method })
}

const ctx = { params: Promise.resolve({ id: 'p1', docId: 'd1' }) }

function grantAccess(overrides: Partial<Record<string, unknown>> = {}) {
    getPolicyAccess.mockResolvedValue({
        exists: true,
        isOwner: true,
        canRead: true,
        canWrite: true,
        canManageDocuments: true,
        canDelete: true,
        ...overrides,
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    requireApiUser.mockResolvedValue({
        auth: { dbUser: { id: 'u1', roles: 'user', email: 'u1@x.gr' } },
        roles: [],
    })
    rateLimit.mockResolvedValue({ success: true })
    signStoredObject.mockResolvedValue({ ok: true, url: SIGNED_URL })
    findFirstDocument.mockResolvedValue({ id: 'd1', fileUrl: STORED_URL, storageBucket: 'policies', storageKey: '9b2f2f2e-aaaa-bbbb-cccc-000000000001.pdf' })
})

describe('GET /api/v1/policies/[id]/documents/[docId] (authorized retrieval)', () => {
    it('redirects an authorized viewer to a fresh short-lived signed URL', async () => {
        grantAccess()

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe(SIGNED_URL)
        expect(response.headers.get('cache-control')).toBe('no-store')
        // 5-minute expiry — short-lived by design
        expect(signStoredObject).toHaveBeenCalledWith(
            expect.objectContaining({ storageBucket: 'policies', storageKey: '9b2f2f2e-aaaa-bbbb-cccc-000000000001.pdf' }),
            300
        )
    })

    it('rejects an unauthenticated request before any document lookup', async () => {
        requireApiUser.mockResolvedValue({
            error: Response.json({ error: 'unauthorized' }, { status: 401 }),
        })

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(401)
        expect(findFirstDocument).not.toHaveBeenCalled()
        expect(signStoredObject).not.toHaveBeenCalled()
    })

    it('404s a cross-tenant viewer (no read access) without leaking existence', async () => {
        grantAccess({ isOwner: false, canRead: false, canWrite: false, canDelete: false })

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(404)
        expect(findFirstDocument).not.toHaveBeenCalled()
        expect(signStoredObject).not.toHaveBeenCalled()
    })

    it('404s when the policy does not exist', async () => {
        getPolicyAccess.mockResolvedValue({ exists: false, canRead: false })

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(404)
    })

    it('404s an IDOR attempt — a docId that belongs to a DIFFERENT policy', async () => {
        grantAccess()
        // The scoped findFirst({ id: docId, policyId: id }) returns null when
        // the document hangs off another policy.
        findFirstDocument.mockResolvedValue(null)

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(404)
        expect(findFirstDocument).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ id: 'd1', policyId: 'p1' }) })
        )
        expect(signStoredObject).not.toHaveBeenCalled()
    })

    it('fails safely (no raw URL leak) when signing is unavailable', async () => {
        grantAccess()
        signStoredObject.mockResolvedValue({ ok: false, reason: 'sign_failed' })

        const response = await GET(makeRequest(), ctx as any)
        const payload = await response.json()

        // 503, not 500: the document exists and storage is the thing at fault.
        expect(response.status).toBe(503)
        expect(JSON.stringify(payload)).not.toContain('supabase.co')
    })

    it('reports a deleted object as gone rather than as a server fault', async () => {
        // Metadata present, bytes missing. Distinguishing this is what lets
        // support answer "the file is gone" instead of "something broke".
        grantAccess()
        signStoredObject.mockResolvedValue({ ok: false, reason: 'object_missing' })

        const response = await GET(makeRequest(), ctx as any)

        expect(response.status).toBe(404)
    })

    it('gives a browser a readable page, not a JSON blob, when retrieval fails', async () => {
        // This endpoint is opened by an anchor and by the preview frame, so a
        // JSON error body lands in a tab as machine text.
        grantAccess()
        signStoredObject.mockResolvedValue({ ok: false, reason: 'object_missing' })

        const response = await GET(
            new Request('https://app.test/api/v1/policies/p1/documents/d1', {
                headers: { accept: 'text/html', 'accept-language': 'el-GR,el;q=0.9' },
            }) as any,
            ctx as any
        )
        const body = await response.text()

        expect(response.headers.get('content-type')).toContain('text/html')
        expect(body).toContain('Το έγγραφο δεν είναι πλέον διαθέσιμο')
        // Still no infrastructure detail, and no reason code.
        expect(body).not.toContain('supabase.co')
        expect(body).not.toContain('object_missing')
    })
})

describe('DELETE /api/v1/policies/[id]/documents/[docId] (authorization + cleanup)', () => {
    it('owner delete removes the row AND the backing storage object', async () => {
        findFirstDocument.mockResolvedValue({
            id: 'd1',
            fileUrl: STORED_URL,
            fileName: 'doc.pdf',
            policy: { policyNumber: 'PN-1' },
        })
        deleteDocument.mockResolvedValue({})
        deleteFile.mockResolvedValue(true)
        createActivityLog.mockResolvedValue({})

        const response = await DELETE(makeRequest('DELETE'), ctx as any)

        expect(response.status).toBe(200)
        expect(deleteDocument).toHaveBeenCalledWith({ where: { id: 'd1' } })
        expect(deleteFile).toHaveBeenCalledWith(STORED_URL)
    })

    it('404s a cross-tenant delete attempt (owner-scoped lookup finds nothing)', async () => {
        findFirstDocument.mockResolvedValue(null)

        const response = await DELETE(makeRequest('DELETE'), ctx as any)

        expect(response.status).toBe(404)
        expect(deleteDocument).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
        // The lookup is scoped to the caller as owner — tenancy isolation.
        expect(findFirstDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    policy: { ownerUserId: 'u1' },
                }),
            })
        )
    })
})
