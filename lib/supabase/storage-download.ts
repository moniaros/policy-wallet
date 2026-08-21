import { createAdminClient } from './admin'

/**
 * Server-side download of policy documents from Supabase Storage.
 *
 * Policy PDFs live in the PRIVATE 'policies' bucket (they are sensitive
 * insurance documents), but PolicyDocument.fileUrl stores the public-style
 * object URL the client got from getPublicUrl() — fetching that raw URL
 * returns 400 on a private bucket, which silently killed every analysis
 * of a real upload. Download through the service-role client instead,
 * resolving bucket + object path from the stored URL.
 */

export function resolveSupabaseStorageObject(
    fileUrl: string
): { bucket: string; objectPath: string } | null {
    try {
        const parsed = new URL(fileUrl)
        const match = parsed.pathname.match(
            /\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/]+)\/(.+)$/
        )
        if (!match) return null
        return {
            bucket: match[1],
            objectPath: decodeURIComponent(match[2]),
        }
    } catch {
        return null
    }
}

/** Buckets this app owns. A stored fileUrl must resolve to one of these. */
const OWNED_BUCKETS = new Set(["policies", "uploads"])

/** The minimum a PolicyDocument row needs to locate its bytes. */
export interface StoredObjectSource {
    /** Authoritative locator; null on rows written before the column existed. */
    storageBucket?: string | null
    storageKey?: string | null
    fileUrl: string
}

/**
 * Where a document's bytes actually live.
 *
 * Prefers the recorded bucket + key and falls back to parsing the URL, so rows
 * written before those columns existed keep resolving exactly as they did. The
 * bucket is checked against the owned set in BOTH paths — a stored value is not
 * more trustworthy than a parsed one, and a poisoned row must not become a
 * signed URL into somebody else's bucket.
 */
export function resolveStoredObject(doc: StoredObjectSource): { bucket: string; objectPath: string } | null {
    if (doc.storageBucket && doc.storageKey) {
        if (!OWNED_BUCKETS.has(doc.storageBucket)) return null
        return { bucket: doc.storageBucket, objectPath: doc.storageKey }
    }
    const parsed = resolveSupabaseStorageObject(doc.fileUrl)
    if (!parsed || !OWNED_BUCKETS.has(parsed.bucket)) return null
    return parsed
}

/**
 * The storage columns for a document whose URL is all the caller has.
 *
 * Some write paths receive a URL rather than an upload result — the b2c client
 * uploads to the bucket itself and posts the URL back. Deriving the locator ONCE
 * at write time is strictly better than re-deriving it on every read: a row
 * written today keeps working even if the parsing rule has to change later.
 * Returns nulls for anything unparseable, which simply leaves the row on the
 * legacy path.
 */
export function storageColumnsFor(fileUrl: string): {
    storageBucket: string | null
    storageKey: string | null
    storageProvider: string | null
} {
    const ref = resolveStoredObject({ fileUrl })
    if (!ref) return { storageBucket: null, storageKey: null, storageProvider: null }
    return { storageBucket: ref.bucket, storageKey: ref.objectPath, storageProvider: "supabase" }
}

/**
 * Why a document could not be handed over.
 *
 * The caller needs the distinction: a row whose object has been deleted from
 * the bucket is a DATA problem worth alerting on, while storage being
 * unconfigured is a deployment problem — and both used to surface as the same
 * opaque 500.
 */
export type SignedUrlFailure = "unresolvable" | "not_configured" | "object_missing" | "sign_failed"

export type SignedUrlOutcome =
    | { ok: true; url: string }
    | { ok: false; reason: SignedUrlFailure }

export async function signStoredObject(
    doc: StoredObjectSource,
    expirySeconds: number,
    /**
     * Name the browser saves as, via Content-Disposition.
     *
     * Without it the download lands as the storage key — a bare UUID, which is
     * useless in a downloads folder. With it the customer gets a generated,
     * descriptive name. It is never the file name they uploaded: that is not
     * stored anywhere (see lib/wallet/document-label.ts).
     */
    downloadName?: string
): Promise<SignedUrlOutcome> {
    const ref = resolveStoredObject(doc)
    if (!ref) return { ok: false, reason: "unresolvable" }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, reason: "not_configured" }

    const admin = createAdminClient()
    const { data, error } = await admin.storage
        .from(ref.bucket)
        .createSignedUrl(ref.objectPath, expirySeconds, downloadName ? { download: downloadName } : undefined)

    if (error) {
        // Supabase reports a deleted/never-written object as a 404 "not found".
        const status = Number((error as { statusCode?: unknown }).statusCode)
        const missing = status === 404 || /not\s*found/i.test(error.message || "")
        return { ok: false, reason: missing ? "object_missing" : "sign_failed" }
    }
    if (!data?.signedUrl) return { ok: false, reason: "sign_failed" }
    return { ok: true, url: data.signedUrl }
}

/**
 * True when `url` is one of OUR Supabase storage objects — same project host and
 * a bucket we own. Guards against a client persisting an arbitrary URL where a
 * storage reference is expected (SSRF / phishing / off-site content injection).
 */
export function isOwnedStorageUrl(url: string): boolean {
    const ref = resolveSupabaseStorageObject(url)
    if (!ref || !OWNED_BUCKETS.has(ref.bucket)) return false

    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!configured) return false
    try {
        return new URL(url).host === new URL(configured).host
    } catch {
        return false
    }
}

/**
 * Short-lived signed URL for a stored (private-bucket) object, resolved from the
 * stored fileUrl. Used to hand an authorized viewer a time-boxed download link
 * instead of the previous stub that returned the bare (private, un-fetchable)
 * object URL. Returns null when storage isn't configured or the URL is opaque.
 */
export async function createSignedUrlForStoredObject(
    fileUrl: string,
    expirySeconds: number,
    /** Generated save-as name; see signStoredObject. */
    downloadName?: string
): Promise<string | null> {
    const ref = resolveSupabaseStorageObject(fileUrl)
    if (!ref || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
    const admin = createAdminClient()
    const { data, error } = await admin.storage
        .from(ref.bucket)
        .createSignedUrl(ref.objectPath, expirySeconds, downloadName ? { download: downloadName } : undefined)
    if (error) return null
    return data?.signedUrl ?? null
}

export async function downloadPolicyDocument(fileUrl: string): Promise<Buffer> {
    const ref = resolveSupabaseStorageObject(fileUrl)

    if (ref && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient()
        const { data, error } = await admin.storage.from(ref.bucket).download(ref.objectPath)
        if (error || !data) {
            throw new Error(
                `Storage download failed (${ref.bucket}/${ref.objectPath}): ${error?.message || 'empty response'}`
            )
        }
        return Buffer.from(await data.arrayBuffer())
    }

    const response = await fetch(fileUrl)
    if (!response.ok) {
        const privateBucketHint =
            ref && !process.env.SUPABASE_SERVICE_ROLE_KEY
                ? ` — bucket '${ref.bucket}' is likely private and SUPABASE_SERVICE_ROLE_KEY is not configured`
                : ''
        throw new Error(
            `Failed to fetch document: ${response.status} ${response.statusText}${privateBucketHint}`
        )
    }
    return Buffer.from(await response.arrayBuffer())
}
