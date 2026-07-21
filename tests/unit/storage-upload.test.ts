import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Storage helpers reach env + the supabase clients; mock them so uploadFile runs.
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' } }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const upload = vi.fn(async (_name: string, _buf?: unknown, _opts?: unknown) => ({ data: { path: 'ok' }, error: null }))
const getPublicUrl = vi.fn((name: string) => ({
    data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/BUCKET/${name}` },
}))
const remove = vi.fn(async (_paths: string[]) => ({ error: null }))
const from = vi.fn(() => ({ upload, getPublicUrl, remove }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ storage: { from } }) }))

import { uploadFile, deleteFile } from '@/lib/storage'

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // %PDF
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const fakeFile = (name = 'My Policy.pdf', magic: number[] = PDF_MAGIC, type = 'application/pdf') => {
    const bytes = new Uint8Array(64)
    bytes.set(magic, 0)
    return {
        name,
        type,
        size: bytes.length,
        arrayBuffer: async () => bytes.buffer,
    } as unknown as File
}

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
})

afterEach(() => {
    vi.unstubAllEnvs()
    from.mockClear(); upload.mockClear(); getPublicUrl.mockClear(); remove.mockClear()
})

describe('uploadFile', () => {
    it('routes policy documents to the private "policies" bucket at the root', async () => {
        const url = await uploadFile(fakeFile(), 'policies')

        expect(from).toHaveBeenCalledWith('policies')
        expect(from).not.toHaveBeenCalledWith('uploads')
        // Root object key (no "policies/" prefix) — matches the b2c upload shape.
        const objectKey = upload.mock.calls[0][0] as string
        expect(objectKey).not.toContain('/')
        expect(url).toContain('/object/public/BUCKET/')
    })

    it('renames to an OPAQUE key — the original filename never appears in storage', async () => {
        await uploadFile(fakeFile('John Doe Motor AXA.pdf'), 'policies')
        const objectKey = upload.mock.calls[0][0] as string
        expect(objectKey).toMatch(new RegExp(`^${UUID_RE}\\.pdf$`))
        expect(objectKey.toLowerCase()).not.toContain('john')
        expect(objectKey.toLowerCase()).not.toContain('axa')
        expect(objectKey.toLowerCase()).not.toContain('motor')
    })

    it('stores the content-type derived from content, not the client value', async () => {
        // Client sends a vague octet-stream; we store the type proven by the magic bytes.
        await uploadFile(fakeFile('doc.pdf', PDF_MAGIC, 'application/octet-stream'), 'policies')
        const opts = upload.mock.calls[0][2] as { contentType: string }
        expect(opts.contentType).toBe('application/pdf')
    })

    it('rejects a file whose content does not match its extension', async () => {
        // .pdf name but PNG magic bytes → content_mismatch
        await expect(uploadFile(fakeFile('fake.pdf', PNG_MAGIC), 'policies')).rejects.toThrow()
        expect(upload).not.toHaveBeenCalled()
    })

    it('rejects a disallowed extension before touching storage', async () => {
        await expect(uploadFile(fakeFile('malware.exe', PDF_MAGIC), 'policies')).rejects.toThrow()
        expect(upload).not.toHaveBeenCalled()
    })

    it('keeps non-policy uploads on the legacy "uploads" bucket with a folder prefix', async () => {
        await uploadFile(fakeFile('avatar.png', PNG_MAGIC, 'image/png'), 'profile')

        expect(from).toHaveBeenCalledWith('uploads')
        expect(from).not.toHaveBeenCalledWith('policies')
        expect(upload.mock.calls[0][0] as string).toMatch(new RegExp(`^profile/${UUID_RE}\\.png$`))
    })
})

describe('deleteFile', () => {
    it('removes from whichever bucket the stored URL names (policies)', async () => {
        const ok = await deleteFile('https://x.supabase.co/storage/v1/object/public/policies/1752-abc.pdf')

        expect(ok).toBe(true)
        expect(from).toHaveBeenCalledWith('policies')
        expect(remove).toHaveBeenCalledWith(['1752-abc.pdf'])
    })

    it('skips (returns true) for non-storage URLs', async () => {
        const ok = await deleteFile('https://example.com/whatever.pdf')
        expect(ok).toBe(true)
        expect(remove).not.toHaveBeenCalled()
    })
})
