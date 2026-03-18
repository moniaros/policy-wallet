import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"

const deleteDocumentParamsSchema = z.object({
    id: z.string().min(1),
    docId: z.string().min(1),
})

export const DELETE = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: deleteDocumentParamsSchema },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:document:delete:${auth?.dbUser.id || "anonymous"}:${params.id}:${params.docId}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id, docId } = params

        try {
            // Verify policy ownership and document existence
            const document = await db.policyDocument.findFirst({
                where: {
                    id: docId,
                    policyId: id,
                    policy: { ownerUserId: authResult.dbUser.id }
                },
                include: { policy: true }
            })

            if (!document) return createApiError("NOT_FOUND", "Document not found", 404)

            await db.policyDocument.delete({
                where: { id: docId }
            })

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "DOCUMENT_DELETED",
                    description: `Deleted document ${document.fileName} from policy ${document.policy.policyNumber}`,
                    timestamp: new Date()
                }
            })

            logger('info', 'Document deleted', { docId, policyId: id, userId: authResult.dbUser.id })

            return createApiResponse({ message: "Document deleted successfully" })
        } catch (error) {
            logger('error', 'Document delete failed', { docId, policyId: id, error })
            return createApiError("INTERNAL_ERROR", "Delete failed", 500)
        }
    }
)
