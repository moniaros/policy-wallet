import { db } from "../db"
import { sendNotification } from "../notifications"
import { startOfAthensDay } from "@/lib/policy-status"

type ReminderRunSummary = {
    unreadFollowupsSent: number
    overdueActionRemindersSent: number
    dailyDigestsSent: number
}

/**
 * The reader's day. This was the runtime zone's midnight — UTC on Vercel — so
 * the once-a-day guard on the collaboration digest opened at 03:00 Athens: a
 * reader could receive two inside one of their days, or none.
 */
function startOfToday() {
    return startOfAthensDay(new Date())
}

/**
 * These reminders reach whichever party owes a reply or an action — in an
 * advisor↔policyholder thread that is often the policyholder — so the title and
 * message must be in THAT recipient's language (Greek default). sendNotification
 * localizes only the email shell, so we resolve the copy here and write both the
 * in-app record and the email.
 */
async function notifyReminder(params: {
    userId: string
    eventType: string
    title: { el: string; en: string }
    message: { el: string; en: string }
    relatedObjectId: string
}) {
    await sendNotification({
        userId: params.userId,
        eventType: params.eventType,
        title: params.title,
        message: params.message,
        channels: ["email", "in_app"],
        relatedObjectType: "customer",
        relatedObjectId: params.relatedObjectId,
    })
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
        await notifyReminder({
            userId: recipientId,
            eventType: "collaboration_unread_followup",
            title: { el: "Μη αναγνωσμένο μήνυμα", en: "Unread message" },
            message: {
                el: `Έχετε ένα μη αναγνωσμένο μήνυμα από ${senderName}.`,
                en: `You have an unread message from ${senderName}.`,
            },
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

        await notifyReminder({
            userId: action.assigneeUserId,
            eventType: "collaboration_action_overdue",
            title: { el: "Εκπρόθεσμη ενέργεια", en: "Overdue action" },
            message: {
                el: `Η ενέργεια «${action.title}» είναι εκπρόθεσμη στη συζήτηση «${action.thread.subject}».`,
                en: `Action "${action.title}" is overdue in thread "${action.thread.subject}".`,
            },
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

        const threadsEl = unresolved === 1 ? "ανοιχτή συζήτηση" : "ανοιχτές συζητήσεις"
        const actionsEl = overdue === 1 ? "εκπρόθεσμη ενέργεια" : "εκπρόθεσμες ενέργειες"
        await notifyReminder({
            userId: p.userId,
            eventType: "collaboration_daily_digest",
            title: { el: "Καθημερινή σύνοψη", en: "Daily digest" },
            message: {
                el: `Έχετε ${unresolved} ${threadsEl} και ${overdue} ${actionsEl}.`,
                en: `You have ${unresolved} unresolved thread(s) and ${overdue} overdue action(s).`,
            },
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
