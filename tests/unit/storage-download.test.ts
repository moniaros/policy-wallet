import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadPolicyDocument, resolveSupabaseStorageObject } from '@/lib/supabase/storage-download'

const mockDownload = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        storage: { from: () => ({ download: mockDownload }) },
    }),
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    mockDownload.mockReset()
})

describe('resolveSupabaseStorageObject', () => {
    it('parses public object URLs into bucket + path', () => {
        expect(
            resolveSupabaseStorageObject(
                'https://x.supabase.co/storage/v1/object/public/policies/1752-abc.pdf'
            )
        ).toEqual({ bucket: 'policies', objectPath: '1752-abc.pdf' })
    })

    it('parses signed and authenticated URLs with nested paths', () => {
        expect(
            resolveSupabaseStorageObject(
                'https://x.supabase.co/storage/v1/object/sign/policies/dir/file%20name.pdf'
            )
        ).toEqual({ bucket: 'policies', objectPath: 'dir/file name.pdf' })
        expect(
            resolveSupabaseStorageObject(
                'https://x.supabase.co/storage/v1/object/authenticated/uploads/a/b.pdf'
            )
        ).toEqual({ bucket: 'uploads', objectPath: 'a/b.pdf' })
    })

    it('returns null for non-storage or invalid URLs', () => {
        expect(resolveSupabaseStorageObject('https://example.com/some.pdf')).toBeNull()
        expect(resolveSupabaseStorageObject('not a url')).toBeNull()
    })
})

describe('downloadPolicyDocument', () => {
    const storageUrl = 'https://x.supabase.co/storage/v1/object/public/policies/doc.pdf'

    it('uses the service-role client for storage URLs when the key is set', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
        mockDownload.mockResolvedValue({
            data: { arrayBuffer: async () => Buffer.from('PDFDATA') },
            error: null,
        })

        const buffer = await downloadPolicyDocument(storageUrl)
        expect(buffer.toString()).toBe('PDFDATA')
        expect(mockDownload).toHaveBeenCalledWith('doc.pdf')
    })

    it('surfaces storage errors with bucket context', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
        mockDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

        await expect(downloadPolicyDocument(storageUrl)).rejects.toThrow(
            'Storage download failed (policies/doc.pdf): Object not found'
        )
    })

    it('falls back to plain fetch without the key and explains a 400 on a private bucket', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }))

        await expect(downloadPolicyDocument(storageUrl)).rejects.toThrow(
            /400 Bad Request — bucket 'policies' is likely private and SUPABASE_SERVICE_ROLE_KEY is not configured/
        )
    })

    it('plain-fetches non-storage URLs', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => Buffer.from('WEB').buffer.slice(0, 3),
        }))
        const buffer = await downloadPolicyDocument('https://example.com/x.pdf')
        expect(buffer.length).toBe(3)
    })
})
