import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const questionnairesQuerySchema = z.object({
    status: z.enum(["pending", "completed"]).default("pending"),
})

export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { searchParams } = new URL(req.url)
    const queryParse = questionnairesQuerySchema.safeParse({
        status: searchParams.get("status") ?? undefined,
    })
    if (!queryParse.success) {
        return createApiError("VALIDATION_ERROR", "Invalid query parameters", 400, queryParse.error.issues)
    }
    const { status } = queryParse.data

    try {
        const questionnaires = await db.questionnaireInstance.findMany({
            where: {
                sentToUserId: authResult.dbUser.id,
                status
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
