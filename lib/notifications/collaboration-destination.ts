import { db } from '@/lib/db'
import { collaborationService } from '@/lib/services/collaboration.service'

/** Resolve legacy subject ids without trusting a notification as an access grant. */
export async function collaborationDestination(userId: string, roles: string, type: string, subjectId: string) {
    let threadId: string | undefined
    let active = true
    let fragment = ''
    if (type === 'collaboration_action_overdue') {
        const action = await db.collaborationAction.findFirst({ where: { id: subjectId, assigneeUserId: userId }, select: { threadId: true, status: true, dueDate: true } })
        threadId = action?.threadId
        active = !!action && ['pending', 'in_progress'].includes(action.status) && !!action.dueDate && action.dueDate < new Date()
        fragment = `#action-${encodeURIComponent(subjectId)}`
    } else if (type === 'collaboration_unread_followup') {
        const message = await db.collaborationMessage.findFirst({ where: { id: subjectId, isPrivate: false, thread: { participants: { some: { userId } } } }, select: { threadId: true, createdAt: true } })
        threadId = message?.threadId
        if (message) active = !await db.collaborationMessage.findFirst({ where: { threadId, senderUserId: userId, isPrivate: false, createdAt: { gt: message.createdAt } }, select: { id: true } })
    } else if (type === 'collaboration_daily_digest') {
        threadId = (await db.collaborationThread.findFirst({ where: { participants: { some: { userId } }, status: { in: ['open', 'waiting_agent', 'waiting_policyholder'] }, relationship: { status: { notIn: ['inactive', 'terminated'] } } }, orderBy: { lastActivityAt: 'desc' }, select: { id: true } }))?.id
    }
    if (!threadId) return { active: false, href: null }
    const thread = await collaborationService.assertThreadAccess(userId, roles, threadId)
    if (!thread) return { active: false, href: null }
    return { active: active && !['inactive', 'terminated'].includes(thread.relationship?.status) && ['open', 'waiting_agent', 'waiting_policyholder'].includes(thread.status), href: `/collaboration/threads/${encodeURIComponent(threadId)}${fragment}` }
}
