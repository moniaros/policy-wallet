import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Storage helpers reach env + the supabase clients; mock them so uploadFile runs.
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' } }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const upload = vi.fn(async () => ({ data: { path: 'ok' }, error: null }))
const getPublicUrl = vi.fn((name: string) => ({
    data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/BUCKET/${name}` },
}))
const from = vi.fn(() => ({ upload, getPublicUrl }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ storage: { from } }) }))

const scanUploadBuffer = vi.fn()
vi.mock('@/lib/security/malware-scan', () => ({
    scanUploadBuffer: (...args: any[]) => scanUploadBuffer(...args),
}))

import { uploadFile } from '@/lib/storage'
import { UploadValidationError } from '@/lib/security/file-upload'

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]

const pdfFile = () => {
    const bytes = new Uint8Array(64)
    bytes.set(PDF_MAGIC, 0)
    return {
        name: 'policy.pdf',
        type: 'application/pdf',
        size: bytes.length,
        arrayBuffer: async () => bytes.buffer,
    } as unknown as File
}

beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    scanUploadBuffer.mockReset()
    upload.mockClear()
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('uploadFile — scan-before-store gate', () => {
    it('stores the file when the scan is clean', async () => {
        scanUploadBuffer.mockResolvedValue({ verdict: 'clean' })

        const url = await uploadFile(pdfFile(), 'policies')

        expect(scanUploadBuffer).toHaveBeenCalledTimes(1)
        expect(upload).toHaveBeenCalledTimes(1)
        expect(url).toContain('/object/public/')
    })

    it('proceeds when no scanner is configured (skipped verdict)', async () => {
        scanUploadBuffer.mockResolvedValue({ verdict: 'skipped' })

        await uploadFile(pdfFile(), 'policies')
        expect(upload).toHaveBeenCalledTimes(1)
    })

    it('an infected file is rejected and NEVER reaches storage', async () => {
        scanUploadBuffer.mockResolvedValue({ verdict: 'infected', detail: 'eicar' })

        await expect(uploadFile(pdfFile(), 'policies')).rejects.toBeInstanceOf(UploadValidationError)
        expect(upload).not.toHaveBeenCalled()
    })

    it('a scanner outage FAILS CLOSED — upload refused, nothing stored', async () => {
        scanUploadBuffer.mockResolvedValue({ verdict: 'error', detail: 'scanner_unreachable' })

        await expect(uploadFile(pdfFile(), 'policies')).rejects.toThrow('File upload failed')
        expect(upload).not.toHaveBeenCalled()
    })

    it('the scan runs on the actual bytes, after validation', async () => {
        scanUploadBuffer.mockResolvedValue({ verdict: 'clean' })

        await uploadFile(pdfFile(), 'policies')

        const scanned = scanUploadBuffer.mock.calls[0][0] as Uint8Array
        expect(scanned[0]).toBe(0x25) // %PDF — the real buffer, not metadata
    })
})
