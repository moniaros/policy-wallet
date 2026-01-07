import fs from "fs/promises"
import path from "path"
import { env } from "./env"
import { logger } from "./logger"

// In a real production app with k8s/serverless, 
// you MUST use S3/GCS. Local storage is ephemeral on Vercel/Run calls.
// This is a "Production-Ready" fallback for VPS/Single-Node deployments.

export async function uploadFile(file: File, folder: string = "policies"): Promise<string> {
    try {
        // 1. Generate unique filename
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${timestamp}-${safeName}`

        // 2. Determine destination
        // TODO: Implement S3/GCS logic here if env.STORAGE_BUCKET is present

        // Default: Local Public Storage
        const uploadDir = path.join(process.cwd(), "public", "uploads", folder)

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true })

        // 3. Write file
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const filePath = path.join(uploadDir, fileName)

        await fs.writeFile(filePath, buffer)

        // 4. Return publicly accessible URL
        const publicUrl = `/uploads/${folder}/${fileName}`

        logger('info', 'File uploaded locally', { fileName, publicUrl })
        return publicUrl

    } catch (error) {
        logger('error', 'File upload failed', { error })
        throw new Error("File upload failed")
    }
}
