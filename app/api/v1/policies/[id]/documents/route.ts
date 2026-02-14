import { db } from "@/lib/db"
import { requireApiUser } from "@/lib/api-auth"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        const formData = await req.formData()
        const file = formData.get("file") as File
        const source = formData.get("source") || "policyholder"

        if (!file) {
            return createApiError("BAD_REQUEST", "No file provided", 400)
        }

        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: authResult.dbUser.id
            }
        })

        if (!policy) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

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
            signed_url_expires_at: new Date(Date.now() + 3600000),
            processing_status: document.processingStatus,
            uploaded_at: document.uploadedAt
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Upload failed", 500)
    }
}
