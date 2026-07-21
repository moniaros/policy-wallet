import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { msFromNow, SIGNED_URL_EXPIRY_MS } from "@/lib/constants/time"
import { getPolicyAccess } from "@/lib/policy-access"
import { uploadFile, deleteFile } from "@/lib/storage"
import { createSignedUrlForStoredObject } from "@/lib/supabase/storage-download"
import {
    validateUploadFile,
    REJECTION_MESSAGES,
    MAX_DOCUMENTS_PER_POLICY,
} from "@/lib/security/file-upload"

const policyDocumentParamsSchema = z.object({
    id: z.string().min(1),
})

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
            const file = formData.get("file")

            if (!(file instanceof File)) {
                return createApiError("BAD_REQUEST", "No file provided", 400)
            }

            // Full validation: size (10MB here), extension allowlist, content-type
            // cross-check, and magic-byte signature — content, not just the header.
            const validation = await validateUploadFile(file, {
                category: "policy",
                maxBytes: MAX_DOCUMENT_BYTES,
            })
            if (!validation.ok) {
                return createApiError("BAD_REQUEST", REJECTION_MESSAGES[validation.reason], 400)
            }
            const displayName = validation.value.displayName

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

            // Abuse cap: per-minute rate limits don't bound TOTAL volume — a
            // patient caller could attach unbounded files to one policy.
            const documentCount = await db.policyDocument.count({ where: { policyId: id } })
            if (documentCount >= MAX_DOCUMENTS_PER_POLICY) {
                return createApiError("BAD_REQUEST", "Document limit reached for this policy", 400)
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

            // If the DB write fails AFTER the object landed, remove the object —
            // otherwise it sits orphaned (and unreferenced) in the bucket forever.
            let document
            try {
                document = await db.policyDocument.create({
                    data: {
                        policyId: id,
                        fileUrl,
                        fileName: displayName,
                        fileSize: file.size,
                        source: source as string,
                        uploadedByUserId: authResult.dbUser.id,
                        processingStatus: "pending"
                    }
                })
            } catch (dbError) {
                await deleteFile(fileUrl)
                throw dbError
            }

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "DOCUMENT_UPLOADED",
                    description: `Uploaded document ${displayName} for policy ${policy.policyNumber}`,
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
