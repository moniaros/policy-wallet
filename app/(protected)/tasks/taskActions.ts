"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type CreateTaskData = {
    userId: string
    title: string
    description?: string
    type?: string // 'reminder', 'request', 'recommendation', 'general'
    priority?: string // 'low', 'medium', 'high'
    dueDate?: string
    actionUrl?: string
    actionLabel?: string
}

export async function createUserTask(data: CreateTaskData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    // Ownership check: a caller may only create a task for themselves or for a user
    // they have a customer relationship with (agent↔policyholder, either direction).
    // Without this any authenticated user could create tasks for arbitrary users.
    if (data.userId !== authResult.dbUser.id) {
        const relationship = await db.customerRelationship.findFirst({
            where: {
                OR: [
                    { agentUserId: authResult.dbUser.id, policyholderUserId: data.userId },
                    { agentUserId: data.userId, policyholderUserId: authResult.dbUser.id },
                ],
            },
            select: { id: true },
        })
        if (!relationship) {
            return { success: false, error: "Unauthorized" }
        }
    }

    try {
        const task = await db.userTask.create({
            data: {
                userId: data.userId,
                creatorUserId: authResult.dbUser.id,
                title: data.title,
                description: data.description,
                type: data.type || 'general',
                priority: data.priority || 'medium',
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                actionUrl: data.actionUrl,
                actionLabel: data.actionLabel,
                status: 'pending'
            }
        })

        revalidatePath(`/tasks`)
        revalidatePath(`/customers/${data.userId}`)

        return { success: true, taskId: task.id }
    } catch (e) {
        console.error("Failed to create task", e)
        return { success: false, error: "Failed to create task" }
    }
}

export async function updateTaskStatus(taskId: string, status: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    try {
        // Evaluate permissions? 
        // Ideally check if user owns the task or is the creator/agent. 
        // For now, simple check:
        const task = await db.userTask.findUnique({ where: { id: taskId } })
        if (!task) return { success: false, error: "Task not found" }

        // Allow if user is recipient OR creator
        if (task.userId !== authResult.dbUser.id && task.creatorUserId !== authResult.dbUser.id) {
            return { success: false, error: "Unauthorized" }
        }

        await db.userTask.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === 'completed' ? new Date() : null
            }
        })

        revalidatePath(`/tasks`)
        return { success: true }
    } catch (e) {
        console.error("Failed to update task", e)
        return { success: false, error: "Failed to update task" }
    }
}
