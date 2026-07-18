"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getTranslations } from "@/lib/i18n"
import { notifyCounterparty } from "@/lib/notifications"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
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
    // Named `tr` (not `t`) because the generic-task loop below binds `t` to the task row.
    const tr = getTranslations((authResult.dbUser.preferredLanguage as 'en' | 'el') || 'el')

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
            description: tr.tasks.questionnaireFrom.replace('{name}', q.sender.name),
            priority: 'high', // Questionnaires are always important
            status: 'pending',
            createdAt: q.sentAt,
            actionLabel: tr.tasks.startAssessment,
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
            actionLabel: t.actionLabel || tr.tasks.markAsDone,
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
    const userId = authResult.dbUser.id

    // Only the instance's intended recipient may answer it — an instance id
    // alone must not let any authenticated user submit/complete someone else's
    // questionnaire.
    const instance = await db.questionnaireInstance.findUnique({
        where: { id: instanceId },
        select: {
            sentToUserId: true,
            sentByUserId: true,
            template: { select: { name: true } },
        },
    })
    if (!instance) throw new Error("Questionnaire not found")
    if (instance.sentToUserId !== userId) throw new Error("Unauthorized")

    // Atomically record the response and complete the instance.
    const { responseId } = await db.$transaction(async (tx) => {
        const response = await tx.questionnaireResponse.create({
            data: { instanceId, userId, answers },
        })
        await tx.questionnaireInstance.update({
            where: { id: instanceId },
            data: { status: 'completed', completedAt: new Date() },
        })
        return { responseId: response.id }
    })

    revalidatePath("/tasks")
    revalidatePath("/wallet")

    // Break the silent handoff: tell the agent who sent it that it was answered
    // (they had no way to know their questionnaire came back).
    const customerName = authResult.dbUser.name || authResult.dbUser.email || 'A client'
    await notifyCounterparty({
        userId: instance.sentByUserId,
        eventType: "questionnaire_completed",
        title: {
            el: "Ο πελάτης συμπλήρωσε το ερωτηματολόγιο",
            en: "Your client completed the questionnaire",
        },
        message: {
            el: `${customerName} απάντησε στο «${instance.template.name}».`,
            en: `${customerName} answered "${instance.template.name}".`,
        },
        relatedObjectType: "customer",
        relatedObjectId: instance.sentToUserId,
    })

    // Refresh the customer's protection score so /home and /coverage-insights
    // reflect the latest picture. Questionnaire answers are free-form for the
    // agent to read and do not map to profile fields, so the score won't move on
    // their own — but this keeps the cached score fresh and returns it so the
    // form can show the customer where they stand and point them to the profile
    // wizard that *does* move it. Non-fatal: the submission already succeeded.
    let protectionScore: number | null = null
    try {
        const refreshed = await refreshProtectionScore(userId)
        protectionScore = refreshed.protectionScore.overallScore
    } catch {
        // ignore — score refresh must not fail the submission
    }

    return { success: true, responseId, protectionScore }
}
