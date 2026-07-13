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
