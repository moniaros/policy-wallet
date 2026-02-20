import fs from "fs/promises"
import path from "path"
import { env } from "./env"
import { logger } from "./logger"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

// In a real production app with k8s/serverless, 
// you MUST use S3/GCS. Local storage is ephemeral on Vercel/Run calls.
// This is a "Production-Ready" fallback for VPS/Single-Node deployments.

import { createClient } from "@/lib/supabase/server"

function resolveSupabaseUploadPathFromUrl(fileUrl: string): string | null {
    try {
        const parsed = new URL(fileUrl)
        const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/uploads\/(.+)$/)
        if (!match?.[1]) return null
        return decodeURIComponent(match[1])
    } catch {
        return null
    }
}

export async function uploadFile(file: File, folder: string = "policies"): Promise<string> {
    try {
        // Try Supabase Storage first
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            const supabase = await createClient()

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
            const fileName = `${folder}/${timestamp}-${safeName}`

            // Upload to 'uploads' bucket (ensure this bucket exists and is public/private as needed)
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { data, error } = await supabase
                .storage
                .from('uploads')
                .upload(fileName, buffer, {
                    contentType: file.type,
                    upsert: false
                })

            if (error) {
                console.error("Supabase upload error:", error)
                // Fallback to local if upload fails? Or throw?
                // For now, let's fallback to local if explicitly requested or just throw
                throw error
            }

            if (data) {
                // Get public URL
                const { data: publicUrlData } = supabase
                    .storage
                    .from('uploads')
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
            const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            const uploadPath = resolveSupabaseUploadPathFromUrl(fileUrl)

            if (supabaseUrl && serviceRoleKey && uploadPath) {
                const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                })

                const { error } = await adminClient.storage.from("uploads").remove([uploadPath])
                if (error) {
                    logger('warn', 'Supabase file delete failed', { fileUrl, uploadPath, error: error.message })
                    return false
                }

                logger('info', 'Supabase file deleted', { fileUrl, uploadPath })
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
