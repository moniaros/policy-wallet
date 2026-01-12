import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { ensureOwnership } from "@/lib/security"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.questionnaireInstance, id, authResult.dbUser.id, "sentToUserId")
    if (!ownership.success) return ownership.error!

    try {
        const questionnaire = await db.questionnaireInstance.findUnique({
            where: { id },
            include: {
                template: true,
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        if (!questionnaire) return createApiError("NOT_FOUND", "Questionnaire not found", 404)

        return createApiResponse({
            ...questionnaire,
            questions: questionnaire.template.questions ? JSON.parse(questionnaire.template.questions as string) : []
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.questionnaireInstance, id, authResult.dbUser.id, "sentToUserId")
    if (!ownership.success) return ownership.error!

    try {
        const body = await req.json()
        const { answers } = body

        if (!answers) return createApiError("BAD_REQUEST", "Answers are required", 400)

        const response = await db.questionnaireResponse.create({
            data: {
                instanceId: id,
                userId: authResult.dbUser.id,
                answers: JSON.stringify(answers)
            }
        })

        await db.questionnaireInstance.update({
            where: { id },
            data: {
                status: "completed",
                completedAt: new Date()
            }
        })

        return createApiResponse(response)
    } catch (error) {
        console.error(error)
        return createApiError("BAD_REQUEST", "Failed to submit questionnaire", 400)
    }
}
