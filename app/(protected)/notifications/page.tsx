export const runtime = 'nodejs'

import { cookies } from "next/headers"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { parseRoles } from "@/lib/api-auth"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role"
import { getNotificationData } from "./actions"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function NotificationsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const t = getTranslations(resolveUserLanguage(dbUser.preferredLanguage))

    // The same active-role resolution the shell uses (role cookie, else the
    // primary role): a policyholder reads this page under the menu's word for
    // it, «Υπενθυμίσεις»; an agent or admin keeps «Ειδοποιήσεις».
    const roles = parseRoles(dbUser.roles)
    const availableRoles = roles.length > 0 ? roles : ["policyholder"]
    const requestedRole = (await cookies()).get(ACTIVE_ROLE_COOKIE)?.value
    const activeRole = requestedRole && (availableRoles as string[]).includes(requestedRole) ? requestedRole : getPrimaryRole(dbUser.roles)
    const title = activeRole === "policyholder" ? t.nav.reminders : undefined

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
            userLanguage={resolveUserLanguage(dbUser.preferredLanguage)}
            title={title}
        />
    )
}
