import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "pending"

    try {
        const questionnaires = await db.questionnaireInstance.findMany({
            where: {
                sentToUserId: authResult.dbUser.id,
                status: status as any
            },
            include: {
                template: true,
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        return createApiResponse({
            questionnaires: questionnaires.map(q => ({
                id: q.id,
                template: q.template,
                sent_by: (q as any).sender,
                status: q.status,
                sent_at: (q as any).sentAt,
                completed_at: q.completedAt
            }))
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
