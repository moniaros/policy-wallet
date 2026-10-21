import { notFound, redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { collaborationDestination } from '@/lib/notifications/collaboration-destination'

export default async function ReminderDestination({ params }: { params: Promise<{ kind: string; id: string }> }) {
    const { dbUser } = await getAuthenticatedUser()
    const { kind, id } = await params
    if (!['action', 'message'].includes(kind)) notFound()
    const destination = await collaborationDestination(dbUser.id, dbUser.roles, kind === 'action' ? 'collaboration_action_overdue' : 'collaboration_unread_followup', id)
    if (!destination.href) notFound()
    redirect(destination.href)
}
