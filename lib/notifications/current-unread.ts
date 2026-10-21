import { db } from '@/lib/db'
import { TASK_REMINDER_TYPES } from './task-reminders'
import { collaborationDestination } from './collaboration-destination'

/** Badge counts current unread subjects; the delivery archive retains every event. */
export async function countCurrentUnreadNotifications(userId: string, roles: string) {
    const scope = { userId, channel: 'in_app', status: 'sent', readAt: null }
    const [ordinary, reminders] = await Promise.all([
        db.notificationEvent.count({ where: { ...scope, OR: [{ eventType: { notIn: [...TASK_REMINDER_TYPES] } }, { relatedObjectId: null }] } }),
        db.notificationEvent.groupBy({ by: ['eventType', 'relatedObjectId'], where: { ...scope, eventType: { in: [...TASK_REMINDER_TYPES] }, relatedObjectId: { not: null } } }),
    ])
    let count = ordinary
    for (const reminder of reminders) {
        if ((await collaborationDestination(userId, roles, reminder.eventType, reminder.relatedObjectId!)).active) count++
    }
    return count
}
