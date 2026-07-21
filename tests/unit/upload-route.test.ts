// @vitest-environment node
// Node env: drives the route with real multipart Request/FormData/File
// (jsdom's File is not interoperable with undici's formData parser).
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireApiUser = vi.fn()
const rateLimit = vi.fn()
const uploadFile = vi.fn()

vi.mock('@/lib/api-auth', () => ({
    requireApiUser: (...args: any[]) => requireApiUser(...args),
}))
vi.mock('@/lib/rate-limit', () => ({
    rateLimit: (...args: any[]) => rateLimit(...args),
}))
vi.mock('@/lib/storage', () => ({
    uploadFile: (...args: any[]) => uploadFile(...args),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { POST } from '@/app/api/v1/upload/route'

const STORED_URL = 'https://x.supabase.co/storage/v1/object/public/uploads/collaboration/uuid.pdf'

function bytes(magic: number[], size = 128): Uint8Array<ArrayBuffer> {
    const b = new Uint8Array(new ArrayBuffer(size))
    b.set(magic, 0)
    return b
}
const PDF = [0x25, 0x50, 0x44, 0x46]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function makeRequest(file: File | null, folder?: string) {
    const form = new FormData()
    if (file) form.set('file', file)
    if (folder) form.set('folder', folder)
    return new Request('http://localhost/api/v1/upload', { method: 'POST', body: form })
}

beforeEach(() => {
    vi.clearAllMocks()
    requireApiUser.mockResolvedValue({
        auth: { dbUser: { id: 'u1', roles: 'user', email: 'u1@x.gr' } },
        roles: [],
    })
    rateLimit.mockResolvedValue({ success: true })
    uploadFile.mockResolvedValue(STORED_URL)
})

describe('POST /api/v1/upload', () => {
    it('accepts a valid PDF and returns the stored URL', async () => {
        const file = new File([bytes(PDF)], 'statement.pdf', { type: 'application/pdf' })

        const response = await POST(makeRequest(file), {} as any)
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.data.fileUrl).toBe(STORED_URL)
        expect(uploadFile).toHaveBeenCalledWith(expect.anything(), 'collaboration')
    })

    it('coerces the retired "policies" folder to the default — this route can never write into the policies bucket', async () => {
        const file = new File([bytes(PDF)], 'doc.pdf', { type: 'application/pdf' })

        const response = await POST(makeRequest(file, 'policies'), {} as any)

        expect(response.status).toBe(200)
        expect(uploadFile).toHaveBeenCalledWith(expect.anything(), 'collaboration')
    })

    it('rejects a spoofed file (PNG bytes named .pdf) with a safe message', async () => {
        const file = new File([bytes(PNG)], 'fake.pdf', { type: 'application/pdf' })

        const response = await POST(makeRequest(file), {} as any)
        const payload = await response.json()

        expect(response.status).toBe(400)
        expect(uploadFile).not.toHaveBeenCalled()
        // Safe, generic wording — no parser/scanner internals
        expect(payload.error.message).toBe('File content does not match a supported format')
    })

    it('rejects a blocked extension', async () => {
        const file = new File([bytes(PDF)], 'payload.html', { type: 'text/html' })

        const response = await POST(makeRequest(file), {} as any)

        expect(response.status).toBe(400)
        expect(uploadFile).not.toHaveBeenCalled()
    })

    it('rejects a missing file', async () => {
        const response = await POST(makeRequest(null), {} as any)
        expect(response.status).toBe(400)
    })

    it('returns a generic error when storage fails (no internals leaked)', async () => {
        uploadFile.mockRejectedValue(new Error('supabase: bucket uploads not found at https://internal'))
        const file = new File([bytes(PDF)], 'doc.pdf', { type: 'application/pdf' })

        const response = await POST(makeRequest(file), {} as any)
        const payload = await response.json()

        expect(response.status).toBe(500)
        expect(JSON.stringify(payload)).not.toContain('supabase')
        expect(JSON.stringify(payload)).not.toContain('https://internal')
    })
})
