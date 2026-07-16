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

const fakeFile = (name = 'My Policy.pdf') => ({
    name,
    type: 'application/pdf',
    arrayBuffer: async () => new ArrayBuffer(4),
}) as unknown as File

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
        expect(objectKey).toMatch(/-My_Policy\.pdf$/)
        expect(url).toContain('/object/public/BUCKET/')
    })

    it('keeps non-policy uploads on the legacy "uploads" bucket with a folder prefix', async () => {
        await uploadFile(fakeFile('avatar.png'), 'profile')

        expect(from).toHaveBeenCalledWith('uploads')
        expect(from).not.toHaveBeenCalledWith('policies')
        expect(upload.mock.calls[0][0] as string).toMatch(/^profile\//)
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
