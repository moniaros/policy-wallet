import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { msFromNow, SIGNED_URL_EXPIRY_MS } from "@/lib/constants/time"
import { getPolicyAccess } from "@/lib/policy-access"

const policyDocumentParamsSchema = z.object({
    id: z.string().min(1),
})

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

            // Mock upload to object storage
            const mockUrl = `https://storage.googleapis.com/policywallet-uploads/${crypto.randomUUID()}-${file.name}`

            const document = await db.policyDocument.create({
                data: {
                    policyId: id,
                    fileUrl: mockUrl,
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

            return createApiResponse({
                id: document.id,
                policy_id: document.policyId,
                file_name: document.fileName,
                file_size: document.fileSize,
                file_url: document.fileUrl,
                signed_url: document.fileUrl, // Stub
                signed_url_expires_at: msFromNow(SIGNED_URL_EXPIRY_MS),
                processing_status: document.processingStatus,
                uploaded_at: document.uploadedAt
            })
        } catch (error) {
            console.error(error)
            return createApiError("INTERNAL_ERROR", "Upload failed", 500)
        }
    }
)
