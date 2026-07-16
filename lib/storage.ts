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

// Policy PDFs are sensitive insurance documents and live in the PRIVATE
// 'policies' bucket — the same bucket the b2c client-side upload
// (components/wallet/AddPolicyClient.tsx) writes to, and the one
// downloadPolicyDocument reads from via the service role. Everything else keeps
// the legacy 'uploads' bucket. (The old code sent policy docs to 'uploads',
// which exists on no environment → "Bucket not found" → "Failed to add policy".)
const POLICY_BUCKET = "policies"
const DEFAULT_BUCKET = "uploads"

export async function uploadFile(file: File, folder: string = "policies"): Promise<string> {
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

            const isPolicyDoc = folder === "policies"
            const bucket = isPolicyDoc ? POLICY_BUCKET : DEFAULT_BUCKET

            // Generate unique filename. Policy docs go to the bucket root so the
            // stored object matches the b2c shape (…/object/public/policies/<file>);
            // other folders keep their prefix within the 'uploads' bucket.
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
            const fileName = isPolicyDoc
                ? `${timestamp}-${safeName}`
                : `${folder}/${timestamp}-${safeName}`

            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(fileName, buffer, {
                    contentType: file.type,
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
                    .getPublicUrl(fileName)

                return publicUrlData.publicUrl
            }
        }

        // Fallback: Local Public Storage (Only for dev/fallback)
        console.warn("Using local storage fallback")
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${timestamp}-${safeName}`
        const uploadDir = path.join(process.cwd(), "public", "uploads", folder)

        await fs.mkdir(uploadDir, { recursive: true })

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const filePath = path.join(uploadDir, fileName)

        await fs.writeFile(filePath, buffer)

        const publicUrl = `/uploads/${folder}/${fileName}`
        return publicUrl

    } catch (error) {
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
