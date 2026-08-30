export const runtime = 'nodejs'

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { getTranslations } from "@/lib/i18n"
import { getNotificationData } from "./actions"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"

export default async function NotificationsPage() {
    const { dbUser } = await getAuthenticatedUser()
    // Grafí G9: a policyholder's updates live at /updates (the proxy 301s first); agents keep this page.
    if (getPrimaryRole(dbUser.roles) === "policyholder") redirect("/updates")
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
                //
                // Deliberately NOT passed: the user row. The client renders
                // nothing from it, and serialising the whole dbUser (email,
                // roles, consent versions) into the RSC payload of a page
                // that never reads it is data the HTML does not need.
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
            }}
            userLanguage={dbUser.preferredLanguage || 'en'}
        />
    )
}
