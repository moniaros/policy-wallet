import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Where a document's bytes live, and who is allowed to be told.
 *
 * Until now the ONLY pointer was `file_url` — a public-STYLE URL into a bucket
 * that is actually private — and every read re-derived the bucket and object key
 * by regex over it. That is a single point of failure between a customer and
 * their insurance contract: change the project host, write one `/sign/` variant,
 * and there is nothing else on the row to recover from. `storage_bucket` and
 * `storage_key` are that something else, and legacy rows must keep working.
 */

const createSignedUrl = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        storage: { from: (bucket: string) => ({ createSignedUrl: (path: string, exp: number) => createSignedUrl(bucket, path, exp) }) },
    }),
}))

import { resolveStoredObject, signStoredObject } from '@/lib/supabase/storage-download'

const LEGACY_URL =
    'https://cquudefwfwrmvpftuhyl.supabase.co/storage/v1/object/public/policies/ae1c5683-7466-4c09-934c-c541a7100fa6.pdf'

beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
})

afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

describe('resolving a document to its stored object', () => {
    it('prefers the recorded bucket and key', () => {
        expect(
            resolveStoredObject({
                storageBucket: 'policies',
                storageKey: 'abc-123.pdf',
                fileUrl: LEGACY_URL,
            })
        ).toEqual({ bucket: 'policies', objectPath: 'abc-123.pdf' })
    })

    it('falls back to parsing the URL for rows written before the columns existed', () => {
        // This is the shape of every document currently in production.
        expect(resolveStoredObject({ fileUrl: LEGACY_URL })).toEqual({
            bucket: 'policies',
            objectPath: 'ae1c5683-7466-4c09-934c-c541a7100fa6.pdf',
        })
    })

    it('falls back when only one of the two columns was written', () => {
        expect(resolveStoredObject({ storageBucket: 'policies', storageKey: null, fileUrl: LEGACY_URL }))
            .toEqual({ bucket: 'policies', objectPath: 'ae1c5683-7466-4c09-934c-c541a7100fa6.pdf' })
    })

    it('refuses a bucket this app does not own, however it was supplied', () => {
        // A stored value is not more trustworthy than a parsed one. Both paths
        // are checked, or a poisoned row becomes a signed URL into a bucket that
        // is not ours to read.
        expect(resolveStoredObject({ storageBucket: 'secrets', storageKey: 'k.pdf', fileUrl: LEGACY_URL })).toBeNull()
        expect(
            resolveStoredObject({
                fileUrl: 'https://cquudefwfwrmvpftuhyl.supabase.co/storage/v1/object/public/secrets/k.pdf',
            })
        ).toBeNull()
    })

    it('returns null for a local-dev path rather than inventing a bucket', () => {
        expect(resolveStoredObject({ fileUrl: '/uploads/policies/local.pdf' })).toBeNull()
    })
})

describe('signing, and saying why it failed', () => {
    it('signs the object the columns point at', async () => {
        createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/x' }, error: null })

        const outcome = await signStoredObject(
            { storageBucket: 'policies', storageKey: 'abc-123.pdf', fileUrl: LEGACY_URL },
            60
        )

        expect(outcome).toEqual({ ok: true, url: 'https://signed.example/x' })
        expect(createSignedUrl).toHaveBeenCalledWith('policies', 'abc-123.pdf', 60)
    })

    it('reports a deleted object distinctly from any other failure', async () => {
        // Metadata present, bytes gone. That is a data-integrity incident worth
        // alerting on — it used to arrive as the same opaque 500 as a missing
        // env var.
        createSignedUrl.mockResolvedValue({
            data: null,
            error: Object.assign(new Error('Object not found'), { statusCode: '404' }),
        })

        expect(await signStoredObject({ storageBucket: 'policies', storageKey: 'gone.pdf', fileUrl: LEGACY_URL }, 60))
            .toEqual({ ok: false, reason: 'object_missing' })
    })

    it('reports a genuine signing failure as such', async () => {
        createSignedUrl.mockResolvedValue({ data: null, error: new Error('boom') })
        expect(await signStoredObject({ storageBucket: 'policies', storageKey: 'x.pdf', fileUrl: LEGACY_URL }, 60))
            .toEqual({ ok: false, reason: 'sign_failed' })
    })

    it('reports unconfigured storage as a deployment fault, not a missing document', async () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY
        expect(await signStoredObject({ storageBucket: 'policies', storageKey: 'x.pdf', fileUrl: LEGACY_URL }, 60))
            .toEqual({ ok: false, reason: 'not_configured' })
        expect(createSignedUrl).not.toHaveBeenCalled()
    })

    it('reports an unresolvable row without calling storage at all', async () => {
        expect(await signStoredObject({ fileUrl: 'not-a-url' }, 60)).toEqual({ ok: false, reason: 'unresolvable' })
        expect(createSignedUrl).not.toHaveBeenCalled()
    })
})

describe('the storage key is never derived from what the user named the file', () => {
    it('generates an opaque key that survives duplicate and Greek filenames', async () => {
        const { generateStorageKey } = await import('@/lib/security/file-upload')

        // Two uploads of a file with the SAME name must never collide: the key
        // is a UUID, and nothing about the original name reaches it.
        const a = generateStorageKey('.pdf')
        const b = generateStorageKey('.pdf')
        expect(a).not.toBe(b)
        expect(a).toMatch(/^[0-9a-f-]{36}\.pdf$/)

        // A Greek name — or one with spaces, slashes, or a second extension —
        // cannot influence the key, so it cannot escape the bucket prefix or
        // overwrite a neighbour.
        for (const key of [generateStorageKey('.pdf'), generateStorageKey('.pdf', 'agent/u1')]) {
            expect(key).not.toMatch(/[Α-Ωα-ωίϊΐόάέύϋΰήώ]/)
            expect(key).not.toContain(' ')
            expect(key).not.toContain('..')
        }
    })
})
