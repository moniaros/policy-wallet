"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getPendingQuestionnaires() {
    const session = await auth()
    if (!session?.user?.id) return []

    return await db.questionnaireInstance.findMany({
        where: {
            sentToUserId: session.user.id,
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

export async function submitQuestionnaireResponse(instanceId: string, answers: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Start a transaction to ensure atomic update and response creation
    return await db.$transaction(async (tx) => {
        // Create the response
        const response = await tx.questionnaireResponse.create({
            data: {
                instanceId,
                userId: session.user.id,
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
