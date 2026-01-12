import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getNotificationData } from "./actions"
import { NotificationsClientPage } from "./NotificationsClientPage"

export default async function NotificationsPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getNotificationData()
    if (!data) return <div>Error loading notifications data.</div>

    const activeRole = dbUser.roles.includes('agent') ? 'agent' : 'policyholder'

    return (
        <NotificationsClientPage
            initialData={data}
            activeRole={activeRole as 'policyholder' | 'agent'}
        />
    )
}
