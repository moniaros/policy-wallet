// ─────────────────────────────────────────────────────────────────────────
// Centralized upload-security policy (OWASP File Upload baseline).
//
// One source of truth for: which file types are allowed, how their true
// content is verified (magic bytes, not the client Content-Type), how the
// original filename is sanitized for DISPLAY, and how the opaque STORAGE key
// is generated. Every server-side upload path funnels through here so the
// rules can never drift between routes.
//
// Two hard rules this module enforces:
//   1. The client-provided filename is NEVER used as a storage name. Storage
//      keys are opaque, server-generated (crypto UUID) and reveal nothing
//      about the user, policy, or document contents.
//   2. Content is validated by magic-byte signature and cross-checked against
//      the extension — an attacker cannot rename `evil.exe` → `policy.pdf`.
// ─────────────────────────────────────────────────────────────────────────

import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/time"

export { MAX_UPLOAD_SIZE_BYTES }

/** Bytes of the file header we need to sniff every supported signature. */
export const MAGIC_HEADER_BYTES = 16

/** Max characters kept for the sanitized display name persisted to the DB. */
const MAX_DISPLAY_NAME_LENGTH = 200

type MagicMatcher = (header: Uint8Array) => boolean

interface FileTypeSpec {
    /** Canonical extension, lowercase, WITH the leading dot. */
    ext: string
    /** Acceptable client Content-Type values for this type. */
    mimeTypes: string[]
    /** Canonical Content-Type stored on the object (never the client value). */
    canonicalMime: string
    /** True when the header matches this type's file signature. */
    matchesMagic: MagicMatcher
}

const startsWith = (bytes: number[], offset = 0): MagicMatcher => {
    return (header) => {
        if (header.length < offset + bytes.length) return false
        for (let i = 0; i < bytes.length; i++) {
            if (header[offset + i] !== bytes[i]) return false
        }
        return true
    }
}

const ascii = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0))

// %PDF
const PDF = startsWith(ascii("%PDF"))
// FF D8 FF
const JPEG = startsWith([0xff, 0xd8, 0xff])
// 89 50 4E 47 0D 0A 1A 0A
const PNG = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// "RIFF" .... "WEBP"
const WEBP: MagicMatcher = (h) => startsWith(ascii("RIFF"))(h) && startsWith(ascii("WEBP"), 8)(h)
// ....ftyp — ISO-BMFF container used by HEIC/HEIF
const HEIC = startsWith(ascii("ftyp"), 4)
// D0 CF 11 E0 A1 B1 1A E1 — OLE2 compound (legacy .doc/.xls)
const OLE2 = startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
// PK\x03\x04 — ZIP local-file header (OOXML .docx). We deliberately reject the
// empty-archive EOCD signature (PK\x05\x06): a valid .docx always has entries.
const ZIP_OOXML = startsWith([0x50, 0x4b, 0x03, 0x04])

const FILE_TYPES: Record<string, FileTypeSpec> = {
    ".pdf": { ext: ".pdf", mimeTypes: ["application/pdf"], canonicalMime: "application/pdf", matchesMagic: PDF },
    ".jpg": { ext: ".jpg", mimeTypes: ["image/jpeg", "image/jpg"], canonicalMime: "image/jpeg", matchesMagic: JPEG },
    ".jpeg": { ext: ".jpeg", mimeTypes: ["image/jpeg", "image/jpg"], canonicalMime: "image/jpeg", matchesMagic: JPEG },
    ".png": { ext: ".png", mimeTypes: ["image/png"], canonicalMime: "image/png", matchesMagic: PNG },
    ".webp": { ext: ".webp", mimeTypes: ["image/webp"], canonicalMime: "image/webp", matchesMagic: WEBP },
    ".heic": { ext: ".heic", mimeTypes: ["image/heic", "image/heif"], canonicalMime: "image/heic", matchesMagic: HEIC },
    ".doc": { ext: ".doc", mimeTypes: ["application/msword"], canonicalMime: "application/msword", matchesMagic: OLE2 },
    ".docx": {
        ext: ".docx",
        mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        canonicalMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        matchesMagic: ZIP_OOXML,
    },
}

/**
 * Upload categories map a business surface to the subset of types it accepts.
 * Allowlist, never blocklist — a type absent here is rejected.
 *   - policy:   policyholder / agent policy documents (PDFs + photos of a doc)
 *   - document: collaboration attachments (adds Office docs — agents request
 *               documents customers often only have as Word files)
 *   - image:    browser-rendered assets (agency logos). No HEIC — most browsers
 *               can't display it in an <img>, and no PDFs/Office docs.
 */
export type UploadCategory = "policy" | "document" | "image"

const CATEGORY_EXTENSIONS: Record<UploadCategory, string[]> = {
    policy: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"],
    document: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".doc", ".docx"],
    image: [".jpg", ".jpeg", ".png", ".webp"],
}


/**
 * Is this filename an image the product accepts?
 *
 * The documents card hand-wrote `/\.(jpe?g|png|gif|webp|bmp|svg)$/` — which
 * listed three formats the allowlist rejects (gif, bmp, svg) and omitted the one
 * it accepts and iPhones produce by default (heic). So a photo of a policy taken
 * on a phone was labelled "other file" instead of an image, and lost its inline
 * preview. Derived here so the display can never disagree with what the upload
 * takes.
 */
export function isAcceptedImageFile(fileName: string | null | undefined): boolean {
    const name = String(fileName || "").toLowerCase()
    return CATEGORY_EXTENSIONS.policy
        .filter((ext) => ext !== ".pdf")
        .some((ext) => name.endsWith(ext))
}

/**
 * Image formats a browser can actually paint in an <img> — jpg/jpeg/png/webp.
 * DELIBERATELY excludes HEIC: it is an accepted UPLOAD format (iPhones default to
 * it) and is correctly LABELLED an image, but Chrome, Firefox and Edge cannot
 * render it in an <img>, only Safari can. Feeding it to the preview showed a
 * broken image with no way out; a document the browser cannot render must fall to
 * the download-only fallback instead. Previewability ≠ acceptability.
 */
export function isBrowserRenderableImage(fileName: string | null | undefined): boolean {
    const name = String(fileName || "").toLowerCase()
    return [".jpg", ".jpeg", ".png", ".webp"].some((ext) => name.endsWith(ext))
}

/** Is this filename a PDF? Same source, same reason. */
export function isPdfFile(fileName: string | null | undefined): boolean {
    return String(fileName || "").toLowerCase().endsWith(".pdf")
}

/**
 * The MIME type to declare for a stored document, from its filename.
 *
 * Two AI paths resolved this with their own if-chains covering pdf/jpg/png/webp
 * and defaulting to `application/pdf`. Neither knew about HEIC — which storage
 * accepts and iPhones produce by default — so a phone photo of a policy was sent
 * to the model labelled as a PDF. The bytes did not match the declared type, so
 * the extraction had nothing to read and the policyholder was left with an
 * analysis that "did not finish cleanly" and no way to know why.
 *
 * Defaults to PDF for an unknown extension, matching the previous behaviour for
 * genuinely unrecognised files.
 */
export function documentMimeType(fileName: string | null | undefined): string {
    const name = String(fileName || "").toLowerCase()
    for (const [ext, spec] of Object.entries(FILE_TYPES)) {
        if (name.endsWith(ext)) return spec.canonicalMime
    }
    return "application/pdf"
}

/**
 * The `accept` attribute for a file input, derived from the same allowlist the
 * server enforces.
 *
 * Five upload surfaces each carried their own hand-written string and none of
 * them matched this table. The main "add a policy" flow offered
 * `.pdf,.png,.jpg,.jpeg` — so an iPhone photo of a policy, HEIC by default, was
 * greyed out in the picker on the product's primary upload path, while the batch
 * modal's `image/*` accepted it happily. The agent's add-customer modal took
 * `application/pdf` alone, so an agent could not photograph a client's policy at
 * all. A document request offered `.doc,.docx` — correct for its category, and
 * correct only by luck.
 *
 * The picker should offer exactly what the server will take. Both extensions and
 * canonical MIME types go in: Safari matches on MIME, and HEIC files often
 * arrive with an empty or wrong `type`, so the extension has to be there too.
 */
export function acceptAttribute(category: UploadCategory): string {
    const exts = CATEGORY_EXTENSIONS[category]
    const mimes = new Set<string>()
    for (const ext of exts) {
        for (const mime of FILE_TYPES[ext]?.mimeTypes ?? []) mimes.add(mime)
    }
    return [...exts, ...mimes].join(",")
}

/**
 * Extensions that must never appear ANYWHERE in a filename — including as an
 * inner segment of a double extension (`invoice.php.pdf`). The final extension
 * is already gated by the allowlist; this catches the disguised-inner-type
 * trick even though we rename to an opaque key.
 */
const DANGEROUS_EXTENSIONS = new Set([
    "exe", "dll", "scr", "bat", "cmd", "com", "cpl", "msi", "jar", "app",
    "js", "mjs", "cjs", "vbs", "vbe", "wsf", "wsh", "ps1", "psm1", "sh", "bash", "zsh",
    "php", "php3", "php4", "php5", "phtml", "phar", "asp", "aspx", "jsp", "jspx",
    "py", "rb", "pl", "cgi", "htaccess", "html", "htm", "xhtml", "svg", "xml",
    "swf", "hta", "reg", "lnk", "scf", "url", "iso", "dmg", "pkg", "deb", "rpm",
])

export type UploadRejectionReason =
    | "empty"
    | "too_large"
    | "illegal_filename"
    | "double_extension"
    | "bad_extension"
    | "mime_mismatch"
    | "content_mismatch"
    | "infected"
    /**
     * A password-protected / encrypted PDF. We cannot read it and neither can
     * the model, so accepting it buys the customer a long wait and then a
     * failure with no explanation. Rejected at the door with a message that
     * says what to do instead.
     */
    | "encrypted"

export interface ValidatedUpload {
    /** Canonical, allowlisted extension (with dot) to use for the storage key. */
    ext: string
    /** Content-Type to store on the object — derived from content, not client. */
    canonicalMime: string
    /** Sanitized original filename, safe to persist as display metadata. */
    displayName: string
}

/**
 * Cheap size-only pre-flight, safe to run in the browser before a byte is sent.
 *
 * The authoritative gate is still `validateUploadFile` on the server — this only
 * spares the user a long upload that was always going to be rejected, and it is
 * the ONLY check that can fire before Next's Server Action body limit does. A
 * file over that limit is killed by the runtime before the action body runs, so
 * the server's own "too_large" message can never reach the user for those.
 *
 * Returns the matching `UploadRejectionReason`, or null when the size is fine.
 */
export function preflightUploadSize(
    size: number,
    maxBytes: number = MAX_UPLOAD_SIZE_BYTES
): Extract<UploadRejectionReason, "empty" | "too_large"> | null {
    if (size <= 0) return "empty"
    if (size > maxBytes) return "too_large"
    return null
}

/** Human-safe, non-leaky messages. Never surface parser/internal detail. */
export const REJECTION_MESSAGES: Record<UploadRejectionReason, string> = {
    empty: "File is empty",
    too_large: "File is too large",
    illegal_filename: "Unsupported file name",
    double_extension: "Unsupported file type",
    bad_extension: "Unsupported file type",
    mime_mismatch: "Unsupported file type",
    content_mismatch: "File content does not match a supported format",
    infected: "File failed security screening",
    // Actionable, not just a refusal: the customer can fix this in a few
    // seconds if they are told how, and a failed analysis twenty minutes later
    // teaches them nothing.
    encrypted: "This PDF is password-protected. Save an unlocked copy and upload that.",
}

/** Per-policy attachment cap — bounds storage abuse a per-minute rate limit can't. */
export const MAX_DOCUMENTS_PER_POLICY = 20

/** Lowercased final extension (with dot), or "" when there is none. */
function getExtension(name: string): string {
    const dot = name.lastIndexOf(".")
    if (dot < 0 || dot === name.length - 1) return ""
    return name.slice(dot).toLowerCase()
}

/** Path separators, NUL, or control chars make a name unsafe to store/log. */
function hasIllegalFilenameChars(name: string): boolean {
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x1f\x7f/\\]/.test(name) || name.includes("..")
}

function hasDangerousInnerExtension(name: string): boolean {
    const parts = name.toLowerCase().split(".")
    // Skip the basename [0] and the final extension [last]; inspect the middle.
    for (let i = 1; i < parts.length - 1; i++) {
        if (DANGEROUS_EXTENSIONS.has(parts[i])) return true
    }
    return false
}

/**
 * Sanitize a client filename for use as DISPLAY metadata only (DB `fileName`,
 * audit-log descriptions). Preserves Unicode letters (Greek filenames are the
 * norm here) but strips path components, control chars, and length. This value
 * is NEVER used to build a storage key.
 */
export function sanitizeDisplayName(name: string | null | undefined): string {
    if (!name) return "document"
    // Drop any path prefix a client might send (basename only).
    const base = name.split(/[/\\]/).pop() || "document"
    const cleaned = base
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, "") // control chars
        .replace(/\s+/g, " ")
        .replace(/^\.+/, "") // no leading dots (hidden-file / traversal noise)
        .trim()
    const trimmed = cleaned.slice(0, MAX_DISPLAY_NAME_LENGTH).trim()
    return trimmed.length > 0 ? trimmed : "document"
}

/**
 * Server-generated opaque storage key. UUID-based, so it reveals nothing about
 * the uploader or the document and cannot collide/overwrite an existing object.
 * `folder` is an optional server-controlled prefix (never client-derived here).
 */
export function generateStorageKey(ext: string, folder?: string): string {
    const safeExt = ext && ext.startsWith(".") ? ext.toLowerCase() : ""
    const id = crypto.randomUUID()
    const base = `${id}${safeExt}`
    return folder ? `${folder.replace(/\/+$/, "")}/${base}` : base
}

interface UploadMeta {
    name: string
    type?: string | null
    size: number
    /** First MAGIC_HEADER_BYTES of the file. */
    header: Uint8Array
}

/**
 * Pure, synchronous validation core — testable with a raw header buffer.
 * Applies, in order: size, filename safety, extension allowlist, content-type
 * cross-check, and magic-byte signature match tied to the extension.
 */
export function sniffAndValidate(
    meta: UploadMeta,
    opts: { category: UploadCategory; maxBytes?: number }
): { ok: true; value: ValidatedUpload } | { ok: false; reason: UploadRejectionReason } {
    const maxBytes = opts.maxBytes ?? MAX_UPLOAD_SIZE_BYTES

    if (meta.size <= 0) return { ok: false, reason: "empty" }
    if (meta.size > maxBytes) return { ok: false, reason: "too_large" }

    if (hasIllegalFilenameChars(meta.name)) return { ok: false, reason: "illegal_filename" }
    if (hasDangerousInnerExtension(meta.name)) return { ok: false, reason: "double_extension" }

    const ext = getExtension(meta.name)
    const allowed = CATEGORY_EXTENSIONS[opts.category]
    if (!ext || !allowed.includes(ext)) return { ok: false, reason: "bad_extension" }

    const spec = FILE_TYPES[ext]

    // Content-Type is advisory, but a SPECIFIC wrong value is a spoof signal.
    // Tolerate empty / octet-stream (browsers send these for unknown types).
    const claimed = (meta.type || "").toLowerCase().split(";")[0].trim()
    if (claimed && claimed !== "application/octet-stream" && !spec.mimeTypes.includes(claimed)) {
        return { ok: false, reason: "mime_mismatch" }
    }

    // The extension must be backed by real content of that exact type.
    if (!spec.matchesMagic(meta.header)) {
        return { ok: false, reason: "content_mismatch" }
    }

    return {
        ok: true,
        value: { ext: spec.ext, canonicalMime: spec.canonicalMime, displayName: sanitizeDisplayName(meta.name) },
    }
}

interface UploadFileLike {
    name: string
    type?: string
    size: number
    slice: (start: number, end: number) => { arrayBuffer: () => Promise<ArrayBuffer> }
}

/**
 * Validate a Web `File` (or File-like) by reading only its header — the full
 * bytes are never buffered here.
 */
/**
 * Bytes of the TAIL we read to spot an encrypted PDF.
 *
 * PDF encryption is declared by an `/Encrypt` entry in the trailer dictionary,
 * which lives at the end of the file. Reading the last 8 KiB catches the
 * ordinary case at a fixed, tiny cost — the whole file is never buffered, which
 * is the property this module is built around.
 */
export const PDF_TRAILER_SCAN_BYTES = 8192

/** True when a PDF declares encryption in its trailer. */
export function declaresPdfEncryption(tail: Uint8Array): boolean {
    // Latin-1 is right here: PDF syntax is ASCII, and decoding as UTF-8 could
    // mangle bytes into a false negative.
    const text = new TextDecoder("latin1").decode(tail)
    return /\/Encrypt\b/.test(text)
}

export async function validateUploadFile(
    file: UploadFileLike,
    opts: { category: UploadCategory; maxBytes?: number }
): Promise<{ ok: true; value: ValidatedUpload } | { ok: false; reason: UploadRejectionReason }> {
    const headerBuf = await file.slice(0, MAGIC_HEADER_BYTES).arrayBuffer()
    const verdict = sniffAndValidate(
        { name: file.name, type: file.type, size: file.size, header: new Uint8Array(headerBuf) },
        opts
    )
    if (!verdict.ok) return verdict

    // Only PDFs can be encrypted in a way that defeats extraction, and only
    // after the file has already passed signature validation — so this costs
    // one bounded read on the happy path and nothing on the reject path.
    if (verdict.value.canonicalMime === "application/pdf") {
        const start = Math.max(0, file.size - PDF_TRAILER_SCAN_BYTES)
        const tailBuf = await file.slice(start, file.size).arrayBuffer()
        if (declaresPdfEncryption(new Uint8Array(tailBuf))) {
            return { ok: false, reason: "encrypted" }
        }
    }

    return verdict
}

/** Thrown by `uploadFile` when a file fails the shared validation gate. */
export class UploadValidationError extends Error {
    reason: UploadRejectionReason
    constructor(reason: UploadRejectionReason) {
        super(`UPLOAD_REJECTED:${reason}`)
        this.name = "UploadValidationError"
        this.reason = reason
    }
}
