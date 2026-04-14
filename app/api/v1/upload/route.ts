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

// M8: Magic-byte signatures for content-type verification.
// Extension-only validation can be spoofed by renaming any file to .pdf.
const MAGIC_BYTES: Array<{ signature: Uint8Array; offset?: number }> = [
    { signature: new Uint8Array([0x25, 0x50, 0x44, 0x46]) },             // PDF: %PDF
    { signature: new Uint8Array([0xff, 0xd8, 0xff]) },                    // JPEG
    { signature: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) }, // PNG
    { signature: new Uint8Array([0x52, 0x49, 0x46, 0x46]) },              // WEBP (RIFF header)
    { signature: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]) },              // DOC (OLE compound)
    { signature: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) },              // DOCX (ZIP/OOXML)
    { signature: new Uint8Array([0x50, 0x4b, 0x05, 0x06]) },              // DOCX (empty ZIP)
]

function hasKnownMagicBytes(header: Uint8Array): boolean {
    return MAGIC_BYTES.some(({ signature, offset = 0 }) => {
        if (header.length < offset + signature.length) return false
        return signature.every((byte, i) => header[offset + i] === byte)
    })
}

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

            // M8: Verify file content matches a known format — extension alone can be spoofed
            const headerBuffer = await file.slice(0, 8).arrayBuffer()
            const header = new Uint8Array(headerBuffer)
            if (!hasKnownMagicBytes(header)) {
                return createApiError("BAD_REQUEST", "File content does not match a supported format", 400)
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
