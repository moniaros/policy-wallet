import { countCurrentUnreadNotifications } from "@/lib/notifications/current-unread"
import { currentReminders, reminderSubjectKey } from "@/lib/notifications/task-reminders"
import { collaborationDestination } from "@/lib/notifications/collaboration-destination"
import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { resolveStoredNotification } from "@/lib/notifications/stored-content"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

/**
 * The bell dropdown's feed.
 *
 * Read state is `readAt`, and only `readAt`. This route used to overload
 * `status` — `queued` meant unread, `sent` meant read — while the shell badge
 * and the /notifications page both used `readAt`, so the two disagreed about
 * the same user and neither mark-read path moved the other's number. Worse, any
 * in-app row written with `status: 'sent'` (which the dispatcher did for every
 * collaboration notification) was born already read and never appeared here at
 * all.
 *
 * `status` is now delivery state and nothing else.
 */
export async function GET(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 50)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // in_app only: an email is delivered, not read, and the analytics mirror
    // that shares this table is not a notification at all.
    const scope = { userId: authResult.dbUser.id, channel: 'in_app' as const, status: 'sent' }

    const [notifications, unreadCount] = await Promise.all([
        db.notificationEvent.findMany({
            where: { ...scope, ...(unreadOnly ? { readAt: null } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        countCurrentUnreadNotifications(authResult.dbUser.id, authResult.dbUser.roles),
    ])

    const destinations = new Map<string, Awaited<ReturnType<typeof collaborationDestination>>>()
    for (const n of notifications) {
        const key = reminderSubjectKey(n.eventType, n.relatedObjectId)
        if (key && !destinations.has(key)) destinations.set(key, await collaborationDestination(authResult.dbUser.id, authResult.dbUser.roles, n.eventType, n.relatedObjectId!))
    }
    const current = currentReminders(notifications.map(n => ({ ...n, reminder_key: reminderSubjectKey(n.eventType, n.relatedObjectId), reminder_active: destinations.get(reminderSubjectKey(n.eventType, n.relatedObjectId) ?? '')?.active }))).slice(0, limit)
    // Presented, never raw: legacy rows can carry internal English
    // documentation, which the shared presenter substitutes with the event's
    // canonical bilingual copy in this reader's language.
    const readerLang = resolveUserLanguage(authResult.dbUser.preferredLanguage)
    return NextResponse.json({
        notifications: current.map(n => {
            const presented = resolveStoredNotification(n.eventType, n.title, n.message, readerLang)
            return ({
            id: n.id,
            eventType: n.eventType,
            title: presented.title,
            message: presented.message,
            relatedObjectType: n.reminder_key ? (destinations.get(n.reminder_key)?.href ? 'thread' : null) : n.relatedObjectType,
            relatedObjectId: n.reminder_key ? (destinations.get(n.reminder_key)?.href?.replace('/collaboration/threads/', '') ?? null) : n.relatedObjectId,
            isRead: n.readAt !== null,
            createdAt: n.createdAt.toISOString()
        })}),
        unreadCount
    })
}
