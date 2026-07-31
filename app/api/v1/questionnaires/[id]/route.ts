import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { ensureOwnership } from "@/lib/security"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const questionnaireAnswersSchema = z.object({
    answers: z.record(z.string(), z.any()),
})

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

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
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error

    // Persists questionnaire answers; unbounded rewrites churn the record.
    const rl = await rateLimit(String(authCheck.auth.dbUser.id), 60, 3600000, `questionnaire-submit:${authCheck.auth.dbUser.id}`)
    if (!rl.success) return rl.error!
    const authResult = authCheck.auth

    const { id } = await params

    const ownership = await ensureOwnership(db.questionnaireInstance, id, authResult.dbUser.id, "sentToUserId")
    if (!ownership.success) return ownership.error!

    try {
        const { answers } = questionnaireAnswersSchema.parse(await req.json())

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
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid answers payload", 400, error.issues)
        }
        console.error(error)
        return createApiError("BAD_REQUEST", "Failed to submit questionnaire", 400)
    }
}
