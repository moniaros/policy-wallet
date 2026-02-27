export const runtime = 'nodejs'

import { getDashboardMetrics, getActivityLogs, getPendingAgents } from "../actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"

export default async function AdminDashboardPage() {
    // Verify admin role
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    // Fetch dashboard data
    const [metrics, activityLogs, pendingAgents] = await Promise.all([
        getDashboardMetrics(),
        getActivityLogs(1, 10),
        getPendingAgents()
    ])

    return (
        <DashboardClient
            metrics={metrics}
            activityLogs={activityLogs.logs}
            pendingAgentsCount={pendingAgents.length}
        />
    )
}
