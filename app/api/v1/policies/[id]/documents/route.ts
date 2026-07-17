import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { msFromNow, SIGNED_URL_EXPIRY_MS } from "@/lib/constants/time"
import { getPolicyAccess } from "@/lib/policy-access"
import { uploadFile } from "@/lib/storage"
import { createSignedUrlForStoredObject } from "@/lib/supabase/storage-download"

const policyDocumentParamsSchema = z.object({
    id: z.string().min(1),
})

const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: policyDocumentParamsSchema },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth, params }) => `policy:document:upload:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ req, auth, params }) => {
        const authResult = auth!
        const { id } = params

        try {
            const formData = await req.formData()
            const file = formData.get("file") as File

            if (!file) {
                return createApiError("BAD_REQUEST", "No file provided", 400)
            }
            if (file.size > MAX_DOCUMENT_BYTES) {
                return createApiError("BAD_REQUEST", "File too large. Maximum size is 10MB.", 400)
            }
            if (file.type && !ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
                return createApiError("BAD_REQUEST", "Invalid file type. Only PDF and images are allowed.", 400)
            }

            const access = await getPolicyAccess(id, {
                id: authResult.dbUser.id,
                roles: authResult.dbUser.roles,
            })
            if (!access.exists) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }
            if (!access.canManageDocuments) {
                return createApiError("FORBIDDEN", "You do not have permission to add documents to this policy", 403)
            }

            const policy = await db.policy.findUnique({ where: { id } })
            if (!policy) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }

            // Derive source from the uploader's actual role in this policy —
            // never trust the form value for provenance.
            const source = access.isOwner ? "policyholder" : "agent"

            // Real upload into the private 'policies' bucket (service-role),
            // replacing a fabricated storage.googleapis.com URL that persisted a
            // phantom document record no file ever backed.
            let fileUrl: string
            try {
                fileUrl = await uploadFile(file, "policies")
            } catch (uploadError) {
                console.error("Policy document upload failed:", uploadError)
                return createApiError("INTERNAL_ERROR", "Document upload failed", 500)
            }

            const document = await db.policyDocument.create({
                data: {
                    policyId: id,
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size,
                    source: source as string,
                    uploadedByUserId: authResult.dbUser.id,
                    processingStatus: "pending"
                }
            })

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "DOCUMENT_UPLOADED",
                    description: `Uploaded document ${file.name} for policy ${policy.policyNumber}`,
                    timestamp: new Date()
                }
            })

            const signedUrl = await createSignedUrlForStoredObject(
                document.fileUrl,
                Math.floor(SIGNED_URL_EXPIRY_MS / 1000)
            )

            return createApiResponse({
                id: document.id,
                policy_id: document.policyId,
                file_name: document.fileName,
                file_size: document.fileSize,
                file_url: document.fileUrl,
                signed_url: signedUrl,
                signed_url_expires_at: signedUrl ? msFromNow(SIGNED_URL_EXPIRY_MS) : null,
                processing_status: document.processingStatus,
                uploaded_at: document.uploadedAt
            })
        } catch (error) {
            console.error(error)
            return createApiError("INTERNAL_ERROR", "Upload failed", 500)
        }
    }
)
