import fs from "fs/promises"
import path from "path"
import { env } from "./env"
import { logger } from "./logger"

// In a real production app with k8s/serverless,
// you MUST use S3/GCS. Local storage is ephemeral on Vercel/Run calls.
// This is a "Production-Ready" fallback for VPS/Single-Node deployments.

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveSupabaseStorageObject } from "@/lib/supabase/storage-download"
import {
    generateStorageKey,
    sniffAndValidate,
    UploadValidationError,
    MAGIC_HEADER_BYTES,
    type UploadCategory,
} from "@/lib/security/file-upload"
import { scanUploadBuffer } from "@/lib/security/malware-scan"

// Policy PDFs are sensitive insurance documents and live in the PRIVATE
// 'policies' bucket — the same bucket the b2c client-side upload
// (components/wallet/AddPolicyClient.tsx) writes to, and the one
// downloadPolicyDocument reads from via the service role. Everything else keeps
// the legacy 'uploads' bucket. (The old code sent policy docs to 'uploads',
// which exists on no environment → "Bucket not found" → "Failed to add policy".)
const POLICY_BUCKET = "policies"
const DEFAULT_BUCKET = "uploads"

export async function uploadFile(file: File, folder: string = "policies"): Promise<string> {
    const isPolicyDoc = folder === "policies"
    // Central choke point: EVERY server-side upload is validated here — magic
    // bytes + extension allowlist + size + filename safety — regardless of
    // whether the calling route validated first (defense in depth).
    const category: UploadCategory = isPolicyDoc ? "policy" : "document"

    // Read the full bytes once; sniff the header from the same buffer.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const header = new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(MAGIC_HEADER_BYTES, buffer.length))

    const validation = sniffAndValidate(
        { name: file.name, type: file.type, size: file.size, header },
        { category }
    )
    if (!validation.ok) {
        // Never persist the original name; log only the safe reason code.
        logger("warn", "File upload rejected by validation", { reason: validation.reason, folder })
        throw new UploadValidationError(validation.reason)
    }

    // Malware scan — SCAN BEFORE STORE. Dormant ('skipped') until an operator
    // sets UPLOAD_SCAN_URL; once configured, 'infected' rejects and 'error'
    // FAILS CLOSED (a mandated scanner being down must not admit unscanned
    // files). A rejected file never reaches the bucket, so there is nothing
    // to clean up or quarantine on this path.
    const scan = await scanUploadBuffer(buffer)
    if (scan.verdict === "infected") {
        logger("warn", "File upload blocked by malware scan", { folder, detail: scan.detail })
        throw new UploadValidationError("infected")
    }
    if (scan.verdict === "error") {
        logger("error", "Malware scan unavailable — upload refused (fail-closed)", {
            folder,
            detail: scan.detail,
        })
        throw new Error("File upload failed")
    }

    // Opaque, server-generated key — the original filename is NEVER used as a
    // storage name (it reveals the user/policy/insurer and enables overwrite).
    // Policy docs sit at the bucket root (matches the b2c object shape); other
    // folders keep their server-controlled prefix within the 'uploads' bucket.
    const objectKey = isPolicyDoc
        ? generateStorageKey(validation.value.ext)
        : generateStorageKey(validation.value.ext, folder)

    try {
        // Try Supabase Storage first
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            // Service-role client bypasses bucket RLS and is ownership-agnostic
            // (an agent uploads a document for a customer-owned policy), matching
            // deleteFile + downloadPolicyDocument. Fall back to the request-scoped
            // client where no service key is configured.
            const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
                ? createAdminClient()
                : await createClient()

            const bucket = isPolicyDoc ? POLICY_BUCKET : DEFAULT_BUCKET

            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(objectKey, buffer, {
                    // Store the content-type derived from the VERIFIED content,
                    // not the (spoofable) client-supplied file.type.
                    contentType: validation.value.canonicalMime,
                    upsert: false
                })

            if (error) {
                console.error("Supabase upload error:", error)
                throw error
            }

            if (data) {
                // Public-style object URL (same convention b2c writes to
                // PolicyDocument.fileUrl). Readability comes from the service-role
                // download in downloadPolicyDocument, not from the bucket being public.
                const { data: publicUrlData } = supabase
                    .storage
                    .from(bucket)
                    .getPublicUrl(objectKey)

                return publicUrlData.publicUrl
            }
        }

        // Fallback: local storage under public/ — DEV ONLY. In production this
        // would place sensitive documents on an unauthenticated public path,
        // so refuse outright rather than degrade silently.
        if (process.env.NODE_ENV === "production") {
            logger("error", "Storage not configured in production — refusing local public fallback", { folder })
            throw new Error("File upload failed")
        }
        console.warn("Using local storage fallback")
        const uploadDir = path.join(process.cwd(), "public", "uploads", folder)

        await fs.mkdir(uploadDir, { recursive: true })

        // Local fallback keeps a flat opaque name inside the folder dir.
        const localName = objectKey.split("/").pop() as string
        const filePath = path.join(uploadDir, localName)

        await fs.writeFile(filePath, buffer)

        const publicUrl = `/uploads/${folder}/${localName}`
        return publicUrl

    } catch (error) {
        if (error instanceof UploadValidationError) throw error
        logger('error', 'File upload failed', { error })
        throw new Error("File upload failed")
    }
}

export async function deleteFile(fileUrl: string): Promise<boolean> {
    try {
        if (!fileUrl) return true;

        // Handle remote URLs (Supabase/S3). We only actively delete Supabase files here.
        if (fileUrl.startsWith('http')) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            // Bucket-agnostic: resolves 'policies' (b2c + agent) and 'uploads' alike.
            const ref = resolveSupabaseStorageObject(fileUrl)

            if (env.NEXT_PUBLIC_SUPABASE_URL && serviceRoleKey && ref) {
                const adminClient = createAdminClient()

                const { error } = await adminClient.storage.from(ref.bucket).remove([ref.objectPath])
                if (error) {
                    logger('warn', 'Supabase file delete failed', { fileUrl, ...ref, error: error.message })
                    return false
                }

                logger('info', 'Supabase file deleted', { fileUrl, ...ref })
                return true
            }

            logger('warn', 'Remote file delete skipped (unsupported provider or missing config)', { fileUrl })
            return true;
        }

        // Handle Local Files
        // fileUrl is like /uploads/policies/filename.ext
        // We need to resolve to system path
        // Remove leading / if present
        const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
        const filePath = path.join(process.cwd(), "public", relativePath);

        // Check availability
        try {
            await fs.access(filePath)
        } catch {
            return true; // File doesn't exist, consider deleted
        }

        await fs.unlink(filePath)
        logger('info', 'File deleted locally', { filePath })
        return true

    } catch (error) {
        logger('error', 'File deletion failed', { error, fileUrl })
        return false
    }
}
