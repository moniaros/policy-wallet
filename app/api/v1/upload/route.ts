export const runtime = "nodejs"

import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { uploadFile } from "@/lib/storage"

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15MB
const ALLOWED_EXTENSIONS = new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".doc",
    ".docx",
])

function hasAllowedExtension(fileName: string): boolean {
    const lower = fileName.toLowerCase()
    for (const ext of ALLOWED_EXTENSIONS) {
        if (lower.endsWith(ext)) return true
    }
    return false
}

function normalizeFolder(raw: string | null): string {
    const value = (raw || "collaboration").toLowerCase().trim()
    if (value === "policies") return "policies"
    if (value === "documents") return "documents"
    if (value === "profile") return "profile"
    return "collaboration"
}

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth }) => `upload:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ req }) => {
        try {
            const formData = await req.formData()
            const file = formData.get("file")
            const folder = normalizeFolder(formData.get("folder")?.toString() || null)

            if (!(file instanceof File)) {
                return createApiError("BAD_REQUEST", "No file provided", 400)
            }

            if (!hasAllowedExtension(file.name)) {
                return createApiError("BAD_REQUEST", "Unsupported file type", 400)
            }

            if (file.size <= 0) {
                return createApiError("BAD_REQUEST", "File is empty", 400)
            }

            if (file.size > MAX_UPLOAD_BYTES) {
                return createApiError("BAD_REQUEST", "File exceeds 15MB limit", 400)
            }

            const fileUrl = await uploadFile(file, folder)
            return createApiResponse({
                url: fileUrl,
                fileUrl,
            })
        } catch {
            return createApiError("INTERNAL_ERROR", "Upload failed", 500)
        }
    }
)
