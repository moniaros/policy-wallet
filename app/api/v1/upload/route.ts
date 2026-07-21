export const runtime = "nodejs"

import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { uploadFile } from "@/lib/storage"
import {
    validateUploadFile,
    REJECTION_MESSAGES,
    type UploadCategory,
} from "@/lib/security/file-upload"

// Server-controlled folder allowlist. Deliberately EXCLUDES "policies": policy
// documents must go through the policy-scoped routes (which check policy
// access and create the owning PolicyDocument row) — this generic route must
// not be able to write unassociated objects into the sensitive bucket.
const FOLDER_CATEGORY: Record<string, UploadCategory> = {
    documents: "document",
    profile: "document",
    collaboration: "document",
}

function normalizeFolder(raw: string | null): string {
    const value = (raw || "collaboration").toLowerCase().trim()
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

            // Single validation gate: size, filename safety, extension allowlist,
            // content-type cross-check, and magic-byte signature — all centralized.
            const validation = await validateUploadFile(file, { category: FOLDER_CATEGORY[folder] })
            if (!validation.ok) {
                return createApiError("BAD_REQUEST", REJECTION_MESSAGES[validation.reason], 400)
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
