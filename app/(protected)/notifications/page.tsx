export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { getNotificationData } from "./actions"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"

export default async function NotificationsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const t = getTranslations((dbUser.preferredLanguage as 'en' | 'el') || 'en')

    const data = await getNotificationData()
    if (!data) {
        return (
            <div className="pw-page-shell px-4 py-8">
                <div className="mx-auto max-w-2xl pw-card p-6 text-sm text-muted-foreground">
                    {t.errors.somethingWentWrong}
                </div>
            </div>
        )
    }

    const activeRole = dbUser.roles.includes('agent') ? 'agent' : 'policyholder'

    return (
        <NotificationsClient
            initialData={{
                history: data.history.map(e => ({
                    event_id: e.event_id,
                    event_type: e.event_type,
                    channel: e.channel,
                    subject: e.subject,
                    message: e.message,
                    created_at: e.created_at,
                    read_at: e.read_at || null,
                    related_policy_id: e.related_policy_id,
                    related_policy_name: e.related_policy_name,
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
