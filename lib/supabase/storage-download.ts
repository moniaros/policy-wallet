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
    expirySeconds: number
): Promise<string | null> {
    const ref = resolveSupabaseStorageObject(fileUrl)
    if (!ref || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(ref.bucket).createSignedUrl(ref.objectPath, expirySeconds)
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
