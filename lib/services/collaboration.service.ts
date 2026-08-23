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
        if (relationship.status === "terminated") throw new Error("Relationship terminated")
        // An agent cannot open a thread at someone who never accepted the
        // relationship — agents create relationships unilaterally by typing an
        // email, and a thread makes the platform a message channel to any
        // registered address. Policyholder-initiated threads are fine at any
        // pre-termination status (it's their own agent they're contacting).
        if (
            relationship.agentUserId === userId &&
            relationship.policyholderUserId !== userId &&
            relationship.status !== "active"
        ) {
            throw new Error("Relationship not accepted yet")
        }

        const isAllowed =
            roles.includes("admin") ||
            relationship.agentUserId === userId ||
            relationship.policyholderUserId === userId
        if (!isAllowed) throw new Error("Forbidden")

        // The notified/emailed recipient must be a party to the relationship —
        // never an arbitrary user id from the caller. Without this clamp, a
        // caller in one relationship could direct a platform-authored email
        // (with an attacker-chosen subject) at any registered address.
        const counterparty =
            relationship.agentUserId === userId ? relationship.policyholderUserId : relationship.agentUserId
        const assignedToUserId =
            input.assignedToUserId === relationship.agentUserId ||
            input.assignedToUserId === relationship.policyholderUserId
                ? input.assignedToUserId
                : counterparty

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
            await this.notifyCollabParticipant({
                recipientId: assignedToUserId,
                eventType: "collaboration_thread_assigned",
                title: { el: "Νέα συζήτηση", en: "New conversation" },
                message: thread.subject,
                relatedObjectId: thread.relationshipId,
            })
        }

        return thread
    }

    async getThreadDetail(userId: string, rolesRaw: string, threadId: string) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) return null

        // Agent-only private notes must never leave the server for the
        // policyholder. Filtering used to live only in the browser
        // (CollaborationTimeline), so the raw API/RSC payload leaked them.
        const roles = parseRoles(rolesRaw)
        const isPrivileged = roles.includes("admin") || thread.relationship.agentUserId === userId

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
                    ...(isPrivileged ? {} : { where: { isPrivate: false } }),
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

    /**
     * @param isPrivate Agent-only internal note, hidden from the policyholder by
     *   the `isPrivate: false` filter in getThreadDetail. Only the thread's agent
     *   may set it — a policyholder-authored "private" note would be hidden from
     *   the very advisor the thread exists to reach.
     */
    async addMessage(
        userId: string,
        rolesRaw: string,
        threadId: string,
        body: string,
        isPrivate = false
    ) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        const senderRole = thread.relationship.agentUserId === userId ? "agent" : "policyholder"
        const newStatus = statusWaitingFor(senderRole === "agent" ? "policyholder" : "agent")
        const recipientId = senderRole === "agent" ? thread.relationship.policyholderUserId : thread.relationship.agentUserId

        // Fail CLOSED. Storing a note the author marked private as a public
        // message is the exact defect this parameter fixes, so a non-agent
        // asking for privacy is refused outright rather than quietly downgraded.
        if (isPrivate && senderRole !== "agent") throw new Error("Forbidden")

        const message = await db.collaborationMessage.create({
            data: {
                threadId,
                senderUserId: userId,
                body,
                messageType: "comment",
                isPrivate,
            },
        })

        // A private note is the advisor talking to themselves: it must not move
        // the thread to "waiting for the policyholder" (that is a promise to the
        // client that a reply is owed) — only touch activity.
        await db.collaborationThread.update({
            where: { id: threadId },
            data: {
                ...(isPrivate
                    ? {}
                    : {
                        status:
                            thread.status === "resolved" || thread.status === "closed"
                                ? thread.status
                                : newStatus,
                    }),
                lastActivityAt: new Date(),
            },
        })

        // ...and must not notify them. The notification body carries the first
        // 140 characters of the message, so sending it would have leaked the
        // private note's own contents to the person it was hidden from.
        if (!isPrivate) {
            await this.notifyCollabParticipant({
                recipientId,
                eventType: "collaboration_message",
                title: { el: "Νέο μήνυμα", en: "New message" },
                message: body.slice(0, 140),
                relatedObjectId: thread.relationshipId,
            })
        }

        return message
    }

    async addAction(userId: string, rolesRaw: string, threadId: string, input: CreateActionInput) {
        const thread = await this.assertThreadAccess(userId, rolesRaw, threadId)
        if (!thread) throw new Error("Forbidden")

        // The assignee (who receives an email + notification) must be a party to
        // the thread — not an arbitrary user id from the caller.
        const allowedAssignees = new Set<string>([
            thread.relationship.agentUserId,
            thread.relationship.policyholderUserId,
            ...thread.participants.map((p) => p.userId),
        ])
        if (!allowedAssignees.has(input.assigneeUserId)) {
            throw new Error("Invalid assignee")
        }

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

        await this.notifyCollabParticipant({
            recipientId: input.assigneeUserId,
            eventType: "collaboration_action_assigned",
            title: { el: "Νέα ενέργεια", en: "New action" },
            message: input.title,
            relatedObjectId: thread.relationshipId,
        })

        return action
    }

    /**
     * Collaboration notifications reach whichever party did NOT act — in an
     * advisor↔policyholder thread that is often the policyholder — so the title
     * must be in THAT recipient's language. sendNotification resolves the { el,
     * en } title to the recipient's preferred language (Greek default) and writes
     * both the in-app record and the email. The message body is user-typed content
     * passed through as-is.
     */
    private async notifyCollabParticipant(params: {
        recipientId: string
        eventType: string
        title: { el: string; en: string }
        message: string
        relatedObjectId: string
    }) {
        await sendNotification({
            userId: params.recipientId,
            eventType: params.eventType,
            title: params.title,
            // User-typed content quoted back — there is no translation of a
            // human's own words, so both arms carry the same text.
            message: { el: params.message, en: params.message },
            channels: ["email", "in_app"],
            relatedObjectType: "customer",
            relatedObjectId: params.relatedObjectId,
        })
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

        // Automation threads are an enhancement riding on a primary action
        // (questionnaire sent, policy shared, gap flagged) — the acceptance
        // gate in createThread must not fail that primary action mid-flow.
        // No thread simply means no follow-up channel yet.
        let thread
        try {
            thread = await this.createThread(userId, "agent,policyholder", {
                relationshipId: input.relationshipId,
                policyId: input.policyId || null,
                subject: input.subject,
                category: input.category,
                priority: input.priority || "medium",
                linkedGapInstanceId: input.linkedGapInstanceId || null,
                linkedQuestionnaireInstanceId: input.linkedQuestionnaireInstanceId || null,
                linkedOpportunityId: input.linkedOpportunityId || null,
            })
        } catch (error) {
            if (error instanceof Error && error.message === "Relationship not accepted yet") {
                return null
            }
            throw error
        }

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
