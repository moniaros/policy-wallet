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
                <div className="mx-auto max-w-2xl pw-card pw-pad text-sm text-muted-foreground">
                    {t.errors.somethingWentWrong}
                </div>
            </div>
        )
    }

    return (
        <NotificationsClient
            initialData={{
                // One entry per EVENT, no channel: delivery records are
                // grouped server-side (see getNotificationData) and which
                // pipe carried a notification is not customer-facing.
                history: data.history.map(e => ({
                    event_id: e.event_id,
                    event_type: e.event_type,
                    subject: e.subject,
                    message: e.message,
                    created_at: e.created_at,
                    unread: e.unread,
                    related_policy_id: e.related_policy_id,
                    related_policy_name: e.related_policy_name,
                })),
                user: dbUser
            }}
            userLanguage={dbUser.preferredLanguage || 'en'}
        />
    )
}
