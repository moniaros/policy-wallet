import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getNotificationData } from "./actions"
import { NotificationsClientPage } from "./NotificationsClientPage"
import { db } from "@/lib/db"

export default async function NotificationsPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/auth/signin")
    }

    const data = await getNotificationData()
    if (!data) return <div>Error loading notifications data.</div>

    // Get user roles from DB to be sure
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true }
    })

    const activeRole = user?.roles.includes('agent') ? 'agent' : 'policyholder'

    return (
        <NotificationsClientPage
            initialData={data}
            activeRole={activeRole as 'policyholder' | 'agent'}
        />
    )
}
