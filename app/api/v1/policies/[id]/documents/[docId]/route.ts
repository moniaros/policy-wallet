import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, docId: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id, docId } = await params

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
