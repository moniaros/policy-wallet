"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { ENDED_RELATIONSHIP_STATUSES } from "@/lib/agent-visibility"
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

    // A task may only be assigned to yourself or to a customer you have an active
    // relationship with — not to an arbitrary user id. Admins are exempt.
    const isSelf = data.userId === authResult.dbUser.id
    const isAdmin = authResult.dbUser.roles?.includes("admin")
    if (!isSelf && !isAdmin) {
        const relationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: data.userId,
                // The comment above said "active" long before the code did.
                // Termination flips the status but never deletes the row, so
                // without this an agent kept assigning tasks into a former
                // customer's action list after being dismissed.
                status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] },
            },
            select: { id: true },
        })
        if (!relationship) return { success: false, error: "Unauthorized" }
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

/**
 * Create a task assigned to the caller themselves.
 *
 * `createUserTask` requires an explicit `data.userId`, which suits the agent
 * flows that assign work to a named customer. Client components creating their
 * OWN reminders (the `ctaType: 'task'` branch actions) do not reliably know
 * their database user id — it is not the Supabase auth id — and letting the
 * browser supply it would be handing the client a field the server is about to
 * authorize against. Resolving it here removes both problems; the existing
 * authorization logic in `createUserTask` is left exactly as it was and still
 * runs (this path simply always satisfies its `isSelf` branch).
 */
export async function createSelfTask(data: Omit<CreateTaskData, "userId">) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    return createUserTask({ ...data, userId: authResult.dbUser.id })
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
