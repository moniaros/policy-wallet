"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { QuestionnaireAnswers } from "@/types/questionnaire"

export type ActionItem = {
    id: string
    source: 'questionnaire' | 'task'
    type: 'questionnaire' | 'reminder' | 'request' | 'recommendation' | 'general'
    title: string
    description?: string
    priority: 'high' | 'medium' | 'low'
    status: 'pending'
    createdAt: Date
    dueDate?: Date
    actionLabel?: string
    actionUrl?: string
    metadata?: any // Original object or extra data
}

export async function getPendingActionItems(): Promise<ActionItem[]> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    const userId = authResult.dbUser.id

    // 1. Fetch Pending Questionnaires
    const questionnaires = await db.questionnaireInstance.findMany({
        where: {
            sentToUserId: userId,
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

    // 2. Fetch Pending UserTasks
    // Note: Use 'findMany' with 'as any' if types aren't generated yet, 
    // or rely on the fact that we ran `db push` (or will run it)
    const tasks = await (db as any).userTask.findMany({
        where: {
            userId: userId,
            status: 'pending'
        },
        include: {
            creator: {
                select: {
                    name: true,
                    image: true
                }
            }
        },
        orderBy: { priority: 'asc' } // High priority first? 'high' < 'low' alphabetically? 
        // We handle sorting in code or rely on creating Date. 
        // Let's sort by createdAt desc for now in DB
    })

    const items: ActionItem[] = []

    // Map Questionnaires
    questionnaires.forEach((q: any) => {
        items.push({
            id: q.id,
            source: 'questionnaire',
            type: 'questionnaire',
            title: q.template.name,
            description: `Questionnaire from ${q.sender.name}`,
            priority: 'high', // Questionnaires are always important
            status: 'pending',
            createdAt: q.sentAt,
            actionLabel: "Start Assessment",
            actionUrl: `/tasks/${q.id}`,
            metadata: {
                senderName: q.sender.name,
                senderImage: q.sender.image,
                lineOfBusiness: q.template.lineOfBusiness
            }
        })
    })

    // Map Generic Tasks
    tasks.forEach((t: any) => {
        items.push({
            id: t.id,
            source: 'task',
            type: t.type as any,
            title: t.title,
            description: t.description || undefined,
            priority: t.priority as any,
            status: 'pending',
            createdAt: t.createdAt,
            dueDate: t.dueDate || undefined,
            actionLabel: t.actionLabel || "Mark as Done",
            actionUrl: t.actionUrl || undefined,
            metadata: {
                creatorName: t.creator?.name,
                creatorImage: t.creator?.image,
            }
        })
    })

    // Sort: High priority first, then by date (newest first)
    const priorityWeight: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 }

    return items.sort((a, b) => {
        const pA = priorityWeight[a.priority] || 0
        const pB = priorityWeight[b.priority] || 0
        if (pA !== pB) return pB - pA // Higher priority first
        return b.createdAt.getTime() - a.createdAt.getTime() // Newest first
    })
}

export async function submitQuestionnaireResponse(instanceId: string, answers: QuestionnaireAnswers) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")

    // Start a transaction to ensure atomic update and response creation
    return await db.$transaction(async (tx) => {
        // Ownership check: only the user the questionnaire was sent to may submit a
        // response. Without this, any authenticated user could answer (and mark
        // completed) an arbitrary questionnaire instance by id.
        const instance = await tx.questionnaireInstance.findUnique({
            where: { id: instanceId },
            select: { sentToUserId: true },
        })
        if (!instance) {
            throw new Error("Questionnaire not found")
        }
        if (instance.sentToUserId !== authResult.dbUser.id) {
            throw new Error("Unauthorized")
        }

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
