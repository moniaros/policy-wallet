import { describe, expect, it } from 'vitest'
import {
    sniffAndValidate,
    sanitizeDisplayName,
    generateStorageKey,
    MAX_UPLOAD_SIZE_BYTES,
    type UploadCategory,
} from '@/lib/security/file-upload'

// ── Signature fixtures ──
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
const HEIC = [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]

function header(bytes: number[]): Uint8Array {
    const h = new Uint8Array(16)
    h.set(bytes.slice(0, 16), 0)
    return h
}

function check(
    name: string,
    magic: number[],
    opts: { category?: UploadCategory; type?: string; size?: number } = {}
) {
    return sniffAndValidate(
        { name, type: opts.type ?? '', size: opts.size ?? 1024, header: header(magic) },
        { category: opts.category ?? 'policy' }
    )
}

describe('sniffAndValidate — allowed types', () => {
    it.each([
        ['policy.pdf', PDF, 'application/pdf'],
        ['scan.jpg', JPEG, 'image/jpeg'],
        ['scan.jpeg', JPEG, 'image/jpeg'],
        ['photo.png', PNG, 'image/png'],
        ['photo.webp', WEBP, 'image/webp'],
        ['photo.heic', HEIC, 'image/heic'],
    ])('accepts a valid %s', (name, magic, mime) => {
        const r = check(name, magic, { type: mime })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.canonicalMime).toBe(mime)
    })

    it('accepts Office docs only in the "document" category', () => {
        expect(check('form.doc', OLE2, { category: 'document', type: 'application/msword' }).ok).toBe(true)
        expect(
            check('form.docx', ZIP, {
                category: 'document',
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }).ok
        ).toBe(true)
    })

    it('rejects Office docs in the stricter "policy" category', () => {
        const r = check('form.docx', ZIP, { category: 'policy' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('bad_extension')
    })

    it('accepts an uppercase extension when the content matches (no case bypass)', () => {
        const r = check('SCAN.PDF', PDF, { type: 'application/pdf' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.ext).toBe('.pdf')
    })

    it('"image" category (logos) accepts browser-renderable images only', () => {
        expect(check('logo.png', PNG, { category: 'image', type: 'image/png' }).ok).toBe(true)
        expect(check('logo.webp', WEBP, { category: 'image', type: 'image/webp' }).ok).toBe(true)
        // No PDFs, no Office docs, no HEIC (browsers cannot render it in <img>)
        expect(check('logo.pdf', PDF, { category: 'image' }).ok).toBe(false)
        expect(check('logo.docx', ZIP, { category: 'image' }).ok).toBe(false)
        expect(check('logo.heic', HEIC, { category: 'image' }).ok).toBe(false)
    })
})

describe('sniffAndValidate — blocked / abusive input', () => {
    it('blocks a dangerous extension', () => {
        const r = check('malware.exe', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('bad_extension')
    })

    it('blocks an SVG (script-capable image) even with image magic', () => {
        const r = check('logo.svg', PNG, { category: 'document' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('bad_extension')
    })

    it('blocks a double extension (executable inner segment)', () => {
        const r = check('invoice.php.pdf', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('double_extension')
    })

    it('blocks a mixed-case double extension (no case bypass)', () => {
        const r = check('invoice.PhP.pdf', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('double_extension')
    })

    it('rejects a malformed file (garbage bytes behind a valid name+MIME)', () => {
        const GARBAGE = [0x00, 0x01, 0x02, 0x03, 0xde, 0xad, 0xbe, 0xef]
        const r = check('policy.pdf', GARBAGE, { type: 'application/pdf' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('content_mismatch')
    })

    it('rejects a truncated header shorter than any signature', () => {
        const r = sniffAndValidate(
            { name: 'tiny.pdf', type: 'application/pdf', size: 2, header: new Uint8Array([0x25, 0x50]) },
            { category: 'policy' }
        )
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('content_mismatch')
    })

    it('detects content/extension mismatch (PNG bytes named .pdf)', () => {
        const r = check('spoof.pdf', PNG)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('content_mismatch')
    })

    it('rejects a spoofed Content-Type that contradicts the extension', () => {
        const r = check('doc.pdf', PDF, { type: 'image/png' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('mime_mismatch')
    })

    it('tolerates empty / octet-stream Content-Type', () => {
        expect(check('doc.pdf', PDF, { type: '' }).ok).toBe(true)
        expect(check('doc.pdf', PDF, { type: 'application/octet-stream' }).ok).toBe(true)
    })

    it('rejects a path-traversal filename', () => {
        const r = check('../../etc/passwd.pdf', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('illegal_filename')
    })

    it('rejects a control-character / NUL filename', () => {
        expect(check('evil\x00.pdf', PDF).ok).toBe(false)
        const r = check('evil\nname.pdf', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('illegal_filename')
    })

    it('rejects an empty file', () => {
        const r = check('doc.pdf', PDF, { size: 0 })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('empty')
    })

    it('rejects an oversized file', () => {
        const r = check('doc.pdf', PDF, { size: MAX_UPLOAD_SIZE_BYTES + 1 })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('too_large')
    })

    it('rejects an empty-archive posing as .docx (no real entries)', () => {
        const r = check('empty.docx', ZIP_EMPTY, { category: 'document' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('content_mismatch')
    })

    it('rejects a file with no extension', () => {
        const r = check('noextension', PDF)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toBe('bad_extension')
    })
})

describe('sanitizeDisplayName', () => {
    it('preserves Greek letters (the market default)', () => {
        expect(sanitizeDisplayName('Ασφαλιστήριο Αυτοκινήτου.pdf')).toBe('Ασφαλιστήριο Αυτοκινήτου.pdf')
    })

    it('strips path components down to the basename', () => {
        expect(sanitizeDisplayName('/etc/passwd')).toBe('passwd')
        expect(sanitizeDisplayName('..\\..\\secret.pdf')).toBe('secret.pdf')
    })

    it('removes control characters', () => {
        expect(sanitizeDisplayName('report\tv2\n.pdf')).toBe('reportv2.pdf')
        expect(sanitizeDisplayName('a\x00b.pdf')).toBe('ab.pdf')
    })

    it('collapses runs of whitespace', () => {
        expect(sanitizeDisplayName('my    policy.pdf')).toBe('my policy.pdf')
    })

    it('falls back for empty / nullish input', () => {
        expect(sanitizeDisplayName('')).toBe('document')
        expect(sanitizeDisplayName(null)).toBe('document')
        expect(sanitizeDisplayName('   ')).toBe('document')
    })

    it('caps runaway length', () => {
        expect(sanitizeDisplayName('a'.repeat(500)).length).toBeLessThanOrEqual(200)
    })
})

describe('generateStorageKey', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

    it('produces an opaque UUID-based key with the given extension', () => {
        const key = generateStorageKey('.pdf')
        expect(key).toMatch(UUID_RE)
        expect(key.endsWith('.pdf')).toBe(true)
        expect(key).not.toContain('/')
    })

    it('applies a server-controlled folder prefix', () => {
        const key = generateStorageKey('.png', 'profile')
        expect(key).toMatch(/^profile\/[0-9a-f]{8}-/)
    })

    it('is collision-resistant across many calls', () => {
        const keys = new Set(Array.from({ length: 2000 }, () => generateStorageKey('.pdf')))
        expect(keys.size).toBe(2000)
    })
})
