import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: { collaborationAction: { findFirst: vi.fn() }, collaborationMessage: { findFirst: vi.fn() }, collaborationThread: { findFirst: vi.fn() } } }))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: { assertThreadAccess: vi.fn() } }))
import { db } from '@/lib/db'
import { collaborationService } from '@/lib/services/collaboration.service'
import { collaborationDestination } from '@/lib/notifications/collaboration-destination'
import { currentReminders } from '@/lib/notifications/task-reminders'
import { notificationActionPath } from '@/lib/notifications/links'
import { resolveStoredNotification } from '@/lib/notifications/stored-content'

describe('reminder completion and destinations', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(collaborationService.assertThreadAccess).mockResolvedValue({ status: 'open' } as any)
    })
    it.each(['done', 'cancelled'])('keeps a %s action in history but removes it from the current queue', async status => {
        vi.mocked(db.collaborationAction.findFirst).mockResolvedValue({ threadId: 'thread', status, dueDate: new Date(0) } as any)
        const result = await collaborationDestination('holder', 'policyholder', 'collaboration_action_overdue', 'action')
        expect(result).toEqual({ active: false, href: '/collaboration/threads/thread#action-action' })
        const history = [{ reminder_key: 'action', reminder_active: result.active }]
        expect(currentReminders(history)).toHaveLength(0)
        expect(history).toHaveLength(1)
    })
    it('does not call a postponed action overdue', async () => {
        vi.mocked(db.collaborationAction.findFirst).mockResolvedValue({ threadId: 'thread', status: 'pending', dueDate: new Date(Date.now() + 86400000) } as any)
        expect((await collaborationDestination('holder', 'policyholder', 'collaboration_action_overdue', 'action')).active).toBe(false)
        expect(db.collaborationAction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'action', assigneeUserId: 'holder' } }))
    })
    it('removes the destination when shared access has ended', async () => {
        vi.mocked(db.collaborationAction.findFirst).mockResolvedValue({ threadId: 'thread', status: 'pending', dueDate: new Date(0) } as any)
        vi.mocked(collaborationService.assertThreadAccess).mockResolvedValue(null)
        expect(await collaborationDestination('holder', 'policyholder', 'collaboration_action_overdue', 'action')).toEqual({ active: false, href: null })
    })
    it('does not expose private messages and closes a follow-up after a reply', async () => {
        vi.mocked(db.collaborationMessage.findFirst).mockResolvedValueOnce({ threadId: 'thread', createdAt: new Date(0) } as any).mockResolvedValueOnce({ id: 'reply' } as any)
        expect((await collaborationDestination('holder', 'policyholder', 'collaboration_unread_followup', 'message')).active).toBe(false)
        expect(vi.mocked(db.collaborationMessage.findFirst).mock.calls[0][0]?.where).toMatchObject({ isPrivate: false, thread: { participants: { some: { userId: 'holder' } } } })
    })
    it('uses authenticated destinations across notification channels', () => {
        expect(notificationActionPath('collaboration_action', 'action')).toBe('/collaboration/reminders/action/action')
        expect(notificationActionPath('collaboration_message', 'message')).toBe('/collaboration/reminders/message/message')
    })
    it('does not pretend an unanswered message is unread', () => {
        expect(resolveStoredNotification('collaboration_unread_followup', 'Unread message', 'Unread', 'en').title).toBe('Message awaiting a reply')
    })
})
