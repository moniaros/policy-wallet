import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"

type AppRole = "admin" | "agent" | "policyholder"

type CreateThreadInput = {
    relationshipId: string
    policyId?: string | null
    subject: string
    category?: "coverage_gap" | "document_request" | "renewal" | "questionnaire" | "general"
    priority?: "low" | "medium" | "high"
    assignedToUserId?: string | null
    linkedOpportunityId?: string | null
    linkedQuestionnaireInstanceId?: string | null
    linkedGapInstanceId?: string | null
}

type CreateActionInput = {
    title: string
    description?: string
    assigneeUserId: string
    dueDate?: string
}

function parseRoles(rolesRaw: string): AppRole[] {
    return rolesRaw
        .split(",")
        .map((role) => role.trim())
        .filter((role): role is AppRole => role === "admin" || role === "agent" || role === "policyholder")
}

function statusWaitingFor(role: "agent" | "policyholder") {
    return role === "agent" ? "waiting_agent" : "waiting_policyholder"
}

export class CollaborationService {
    async assertThreadAccess(userId: string, rolesRaw: string, threadId: string) {
        const roles = parseRoles(rolesRaw)
        const thread = await db.collaborationThread.findUnique({
            where: { id: threadId },
            include: {
                relationship: true,
                participants: true,
            },
        })

        if (!thread) return null
        if (roles.includes("admin")) return thread

        const isParticipant = thread.participants.some((p) => p.userId === userId)
        const inRelationship =
            thread.relationship.agentUserId === userId || thread.relationship.policyholderUserId === userId

        if (!isParticipant && !inRelationship) return null
        return thread
    }

    async listThreads(userId: string, rolesRaw: string, filters: {
        relationshipId?: string
        policyId?: string
        status?: string
        category?: string
        limit?: number
    }) {
        const roles = parseRoles(rolesRaw)
        const where: any = {
            ...(filters.relationshipId ? { relationshipId: filters.relationshipId } : {}),
            ...(filters.policyId ? { policyId: filters.policyId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.category ? { category: filters.category } : {}),
        }

        if (!roles.includes("admin")) {
            where.OR = [
                { relationship: { agentUserId: userId } },
                { relationship: { policyholderUserId: userId } },
                { participants: { some: { userId } } },
            ]
        }

        const threads = await db.collaborationThread.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                relationship: {
                    select: {
                        id: true,
                        agentUserId: true,
                        policyholderUserId: true,
                        agent: { select: { id: true, name: true, email: true } },
                        customer: { select: { id: true, name: true, email: true } },
                    },
                },
                messages: {
                    select: {
                        body: true,
                        createdAt: true,
                        senderUserId: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: { select: { messages: true, actions: true } },
            },
            orderBy: [{ lastActivityAt: "desc" }],
            take: Math.min(filters.limit ?? 30, 100),
        })

        return threads.map((thread) => {
            const viewerRole: "agent" | "policyholder" | null =
                thread.relationship.agentUserId === userId
                    ? "agent"
                    : thread.relationship.policyholderUserId === userId
                        ? "policyholder"
                        : roles.includes("agent")
                            ? "agent"
                            : roles.includes("policyholder")
                                ? "policyholder"
                                : null

            const counterpart =
                viewerRole === "agent"
                    ? thread.relationship.customer
                    : thread.relationship.agent

            const clientName =
                counterpart?.name ||
                counterpart?.email ||
                "Unknown"

            const clientId =
                counterpart?.id ||
                (viewerRole === "agent"
                    ? thread.relationship.policyholderUserId
                    : thread.relationship.agentUserId)

            const lastMessage = thread.messages[0]?.body || undefined
            const isWaitingOnYou =
                (thread.status === "waiting_agent" && viewerRole === "agent") ||
                (thread.status === "waiting_policyholder" && viewerRole === "policyholder")

            const { messages, ...base } = thread
            return {
                ...base,
                clientName,
                clientId,
                unreadCount: 0,
                lastMessage,
                isWaitingOnYou,
            }
        })
    }

    async createThread(userId: string, rolesRaw: string, input: CreateThreadInput) {
        const roles = parseRoles(rolesRaw)
        const relationship = await db.customerRelationship.findUnique({
            where: { id: input.relationshipId },
        })
        if (!relationship) throw new Error("Relationship not found")

        const isAllowed =
            roles.includes("admin") ||
            relationship.agentUserId === userId ||
            relationship.policyholderUserId === userId
        if (!isAllowed) throw new Error("Forbidden")

        const assignedToUserId =
            input.assignedToUserId ??
            (relationship.agentUserId === userId ? relationship.policyholderUserId : relationship.agentUserId)

        const thread = await db.collaborationThread.create({
            data: {
                relationshipId: input.relationshipId,
                policyId: input.policyId || null,
                subject: input.subject,
                category: input.category || "general",
                status: "open",
                priority: input.priority || "medium",
                createdByUserId: userId,
                assignedToUserId,
                linkedOpportunityId: input.linkedOpportunityId || null,
                linkedQuestionnaireInstanceId: input.linkedQuestionnaireInstanceId || null,
                linkedGapInstanceId: input.linkedGapInstanceId || null,
                participants: {
                    create: [
                        { userId: relationship.agentUserId, role: "agent" },
                        { userId: relationship.policyholderUserId, role: "policyholder" },
                    ],
                },
                messages: {
                    create: {
                        senderUserId: userId,
                        messageType: "system_event",
                        body: "Thread created",
                        metadata: { source: "thread_create" },
                    },
                },
            },
            include: {
                relationship: true,
            },
        })

        if (assignedToUserId) {
            await db.notificationEvent.create({
                data: {
                    userId: assignedToUserId,
                    eventType: "collaboration_thread_assigned",
                    channel: "in_app",
                    title: "New collaboration thread",
                    message: thread.subject,
                    relatedObjectType: "customer",
                    relatedObjectId: thread.relationshipId,
                },
            })
            await sendNotification({
                userId: assignedToUserId,
                eventType: "collaboration_thread_assigned",
                title: "New collaboration thread",
                message: thread.subject,
                channels: ["email"],
                relatedObjectType: "customer",
                relatedObjectId: thread.relationshipId,
            })
        }

        return thread
    }

    async getThreadDetail(userId: string, rolesRaw: string, threadId: string) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) return null

        return db.collaborationThread.findUnique({
            where: { id: threadId },
            include: {
                relationship: true,
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                messages: {
                    include: { sender: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: "asc" },
                },
                actions: {
                    include: { assignee: { select: { id: true, name: true, email: true } } },
                    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
                },
            },
        })
    }

    async addMessage(userId: string, rolesRaw: string, threadId: string, body: string) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        const senderRole = thread.relationship.agentUserId === userId ? "agent" : "policyholder"
        const newStatus = statusWaitingFor(senderRole === "agent" ? "policyholder" : "agent")
        const recipientId = senderRole === "agent" ? thread.relationship.policyholderUserId : thread.relationship.agentUserId

        const message = await db.collaborationMessage.create({
            data: {
                threadId,
                senderUserId: userId,
                body,
                messageType: "comment",
            },
        })

        await db.collaborationThread.update({
            where: { id: threadId },
            data: {
                status: thread.status === "resolved" || thread.status === "closed" ? thread.status : newStatus,
                lastActivityAt: new Date(),
            },
        })

        await sendNotification({
            userId: recipientId,
            eventType: "collaboration_message",
            title: "New collaboration message",
            message: body.slice(0, 140),
            channels: ["email"],
            relatedObjectType: "customer",
            relatedObjectId: thread.relationshipId,
        })
        await db.notificationEvent.create({
            data: {
                userId: recipientId,
                eventType: "collaboration_message",
                channel: "in_app",
                title: "New collaboration message",
                message: body.slice(0, 140),
                relatedObjectType: "customer",
                relatedObjectId: thread.relationshipId,
            },
        })

        return message
    }

    async addAction(userId: string, rolesRaw: string, threadId: string, input: CreateActionInput) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        const action = await db.collaborationAction.create({
            data: {
                threadId,
                title: input.title,
                description: input.description,
                assigneeUserId: input.assigneeUserId,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                status: "pending",
            },
        })

        await db.collaborationThread.update({
            where: { id: threadId },
            data: {
                lastActivityAt: new Date(),
                status: "open",
            },
        })

        await sendNotification({
            userId: input.assigneeUserId,
            eventType: "collaboration_action_assigned",
            title: "New action assigned",
            message: input.title,
            channels: ["email"],
            relatedObjectType: "customer",
            relatedObjectId: thread.relationshipId,
        })
        await db.notificationEvent.create({
            data: {
                userId: input.assigneeUserId,
                eventType: "collaboration_action_assigned",
                channel: "in_app",
                title: "New action assigned",
                message: input.title,
                relatedObjectType: "customer",
                relatedObjectId: thread.relationshipId,
            },
        })

        return action
    }

    async updateActionStatus(userId: string, rolesRaw: string, threadId: string, actionId: string, status: string) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        const target = await db.collaborationAction.findFirst({
            where: { id: actionId, threadId },
            select: { id: true },
        })
        if (!target) throw new Error("Action not found")

        const updated = await db.collaborationAction.update({
            where: { id: target.id },
            data: {
                status,
                completedAt: status === "done" ? new Date() : null,
            },
        })

        const openActions = await db.collaborationAction.count({
            where: {
                threadId,
                status: { in: ["pending", "in_progress"] },
            },
        })

        await db.collaborationThread.update({
            where: { id: threadId },
            data: {
                status: openActions === 0 && thread.status === "open" ? "resolved" : thread.status,
                resolvedAt: openActions === 0 ? new Date() : null,
                lastActivityAt: new Date(),
            },
        })

        return updated
    }

    async updateThreadStatus(userId: string, rolesRaw: string, threadId: string, status: string) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        return db.collaborationThread.update({
            where: { id: threadId },
            data: {
                status,
                resolvedAt: status === "resolved" || status === "closed" ? new Date() : null,
                lastActivityAt: new Date(),
            },
        })
    }

    async ensureAutomationThread(userId: string, input: {
        relationshipId: string
        policyId?: string | null
        subject: string
        category: "coverage_gap" | "document_request" | "renewal" | "questionnaire" | "general"
        linkedGapInstanceId?: string | null
        linkedQuestionnaireInstanceId?: string | null
        linkedOpportunityId?: string | null
        priority?: "low" | "medium" | "high"
        initialMessage?: string
    }) {
        const existing = await db.collaborationThread.findFirst({
            where: {
                relationshipId: input.relationshipId,
                category: input.category,
                ...(input.linkedGapInstanceId ? { linkedGapInstanceId: input.linkedGapInstanceId } : {}),
                ...(input.linkedQuestionnaireInstanceId ? { linkedQuestionnaireInstanceId: input.linkedQuestionnaireInstanceId } : {}),
                status: { in: ["open", "waiting_agent", "waiting_policyholder"] },
            },
        })

        if (existing) return existing

        const thread = await this.createThread(userId, "agent,policyholder", {
            relationshipId: input.relationshipId,
            policyId: input.policyId || null,
            subject: input.subject,
            category: input.category,
            priority: input.priority || "medium",
            linkedGapInstanceId: input.linkedGapInstanceId || null,
            linkedQuestionnaireInstanceId: input.linkedQuestionnaireInstanceId || null,
            linkedOpportunityId: input.linkedOpportunityId || null,
        })

        if (input.initialMessage) {
            await db.collaborationMessage.create({
                data: {
                    threadId: thread.id,
                    senderUserId: userId,
                    messageType: "system_event",
                    body: input.initialMessage,
                },
            })
        }

        return thread
    }
}

export const collaborationService = new CollaborationService()
