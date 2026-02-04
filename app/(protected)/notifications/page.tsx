import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getNotificationData } from "./actions"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"

export default async function NotificationsPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getNotificationData()
    if (!data) return <div>Error loading notifications data.</div>

    const activeRole = dbUser.roles.includes('agent') ? 'agent' : 'policyholder'

    return (
        <NotificationsClient
            initialData={{
                history: data.history.map(e => ({
                    id: e.event_id,
                    event_type: e.event_type,
                    title: e.subject,
                    message: e.message,
                    created_at: e.created_at,
                    read_at: undefined, // Default to unread as backend doesn't support read status yet
                    priority: 'medium',
                    category: (['system_confirmation', 'reminder', 'intelligence'].includes(e.event_category) ? e.event_category : 'system_confirmation') as any,
                    related_object_type: e.related_policy_id ? 'policy' : undefined,
                    related_object_id: e.related_policy_id || undefined
                })),
                preferences: data.preferences.map(p => ({
                    event_type: p.event_type,
                    email_enabled: p.channel_email,
                    push_enabled: p.channel_push
                })),
                user: dbUser
            }}
            userLanguage={dbUser.preferredLanguage || 'en'}
        />
    )
}
