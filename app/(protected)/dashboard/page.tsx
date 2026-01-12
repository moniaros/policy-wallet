import { getDashboardData, createAgentInvite } from "../agent/actions"
import { DashboardClient } from "./DashboardClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"

export default async function DashboardPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getDashboardData()
    if (!data) {
        // Handle non-agent access or error
        return <div>Access Denied. Agent credentials required.</div>
    }

    return (
        <DashboardClient
            initialSummary={data.summary}
            initialPriorities={data.priorities}
        />
    )
}
