import { db } from "../db"
import { sendNotification } from "../notifications"

type ReminderRunSummary = {
    unreadFollowupsSent: number
    overdueActionRemindersSent: number
    dailyDigestsSent: number
}

function startOfToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export async function runCollaborationReminderJobs(): Promise<ReminderRunSummary> {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const todayStart = startOfToday()

    let unreadFollowupsSent = 0
    let overdueActionRemindersSent = 0
    let dailyDigestsSent = 0

    // 1) First unread follow-up after 2 hours
    const staleMessages = await db.collaborationMessage.findMany({
        where: {
            messageType: "comment",
            createdAt: { lte: twoHoursAgo },
            thread: {
                status: { in: ["open", "waiting_agent", "waiting_policyholder"] },
            },
        },
        include: {
            thread: {
                include: { relationship: true },
            },
            sender: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: "asc" },
        take: 300,
    })

    for (const message of staleMessages) {
        const rel = message.thread.relationship
        const senderIsAgent = message.senderUserId === rel.agentUserId
        const recipientId = senderIsAgent ? rel.policyholderUserId : rel.agentUserId

        const alreadySent = await db.notificationEvent.findFirst({
            where: {
                userId: recipientId,
                eventType: "collaboration_unread_followup",
                relatedObjectType: "customer",
                relatedObjectId: message.id,
            },
            select: { id: true },
        })
        if (alreadySent) continue

        const hasReply = await db.collaborationMessage.findFirst({
            where: {
                threadId: message.threadId,
                senderUserId: recipientId,
                createdAt: { gt: message.createdAt },
            },
            select: { id: true },
        })
        if (hasReply) continue

        const senderName = message.sender.name || message.sender.email
        await db.notificationEvent.create({
            data: {
                userId: recipientId,
                eventType: "collaboration_unread_followup",
                channel: "in_app",
                title: "Unread collaboration message",
                message: `You have an unread collaboration update from ${senderName}.`,
                relatedObjectType: "customer",
                relatedObjectId: message.id,
            },
        })
        await sendNotification({
            userId: recipientId,
            eventType: "collaboration_unread_followup",
            title: "Unread collaboration message",
            message: `You have an unread collaboration update from ${senderName}.`,
            channels: ["email"],
            relatedObjectType: "customer",
            relatedObjectId: message.id,
        })
        unreadFollowupsSent += 1
    }

    // 2) Overdue action reminders (once daily)
    const overdueActions = await db.collaborationAction.findMany({
        where: {
            status: { in: ["pending", "in_progress"] },
            dueDate: { lt: now },
        },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
            thread: { select: { id: true, subject: true, relationshipId: true } },
        },
        take: 500,
    })

    for (const action of overdueActions) {
        const sentToday = await db.notificationEvent.findFirst({
            where: {
                userId: action.assigneeUserId,
                eventType: "collaboration_action_overdue",
                relatedObjectType: "customer",
                relatedObjectId: action.id,
                createdAt: { gte: todayStart },
            },
            select: { id: true },
        })
        if (sentToday) continue

        const msg = `Action "${action.title}" is overdue in thread "${action.thread.subject}".`
        await db.notificationEvent.create({
            data: {
                userId: action.assigneeUserId,
                eventType: "collaboration_action_overdue",
                channel: "in_app",
                title: "Overdue collaboration action",
                message: msg,
                relatedObjectType: "customer",
                relatedObjectId: action.id,
            },
        })
        await sendNotification({
            userId: action.assigneeUserId,
            eventType: "collaboration_action_overdue",
            title: "Overdue collaboration action",
            message: msg,
            channels: ["email"],
            relatedObjectType: "customer",
            relatedObjectId: action.id,
        })
        overdueActionRemindersSent += 1
    }

    // 3) Daily digest for unresolved threads + overdue actions
    const participants = await db.collaborationParticipant.findMany({
        select: { userId: true },
        distinct: ["userId"],
        take: 1000,
    })

    for (const p of participants) {
        const digestSentToday = await db.notificationEvent.findFirst({
            where: {
                userId: p.userId,
                eventType: "collaboration_daily_digest",
                createdAt: { gte: todayStart },
            },
            select: { id: true },
        })
        if (digestSentToday) continue

        const unresolved = await db.collaborationThread.count({
            where: {
                participants: { some: { userId: p.userId } },
                status: { in: ["open", "waiting_agent", "waiting_policyholder"] },
            },
        })
        const overdue = await db.collaborationAction.count({
            where: {
                assigneeUserId: p.userId,
                status: { in: ["pending", "in_progress"] },
                dueDate: { lt: now },
            },
        })
        if (unresolved === 0 && overdue === 0) continue

        const digestMessage = `You have ${unresolved} unresolved thread(s) and ${overdue} overdue action(s).`
        await db.notificationEvent.create({
            data: {
                userId: p.userId,
                eventType: "collaboration_daily_digest",
                channel: "in_app",
                title: "Daily collaboration digest",
                message: digestMessage,
                relatedObjectType: "customer",
                relatedObjectId: p.userId,
            },
        })
        await sendNotification({
            userId: p.userId,
            eventType: "collaboration_daily_digest",
            title: "Daily collaboration digest",
            message: digestMessage,
            channels: ["email"],
            relatedObjectType: "customer",
            relatedObjectId: p.userId,
        })
        dailyDigestsSent += 1
    }

    return {
        unreadFollowupsSent,
        overdueActionRemindersSent,
        dailyDigestsSent,
    }
}
