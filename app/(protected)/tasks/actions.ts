"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { QuestionnaireAnswers } from "@/types/questionnaire"

export async function getPendingQuestionnaires() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    return await db.questionnaireInstance.findMany({
        where: {
            sentToUserId: authResult.dbUser.id,
            status: 'pending'
        },
        include: {
            template: true,
            sender: {
                select: {
                    name: true,
                    image: true
                }
            }
        },
        orderBy: { sentAt: 'desc' }
    })
}

export async function submitQuestionnaireResponse(instanceId: string, answers: QuestionnaireAnswers) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")

    // Start a transaction to ensure atomic update and response creation
    return await db.$transaction(async (tx) => {
        // Create the response
        const response = await tx.questionnaireResponse.create({
            data: {
                instanceId,
                userId: authResult.dbUser.id,
                answers
            }
        })

        // Update instance status
        await tx.questionnaireInstance.update({
            where: { id: instanceId },
            data: {
                status: 'completed',
                completedAt: new Date()
            }
        })

        revalidatePath("/tasks")
        revalidatePath("/wallet")

        return { success: true, responseId: response.id }
    })
}
