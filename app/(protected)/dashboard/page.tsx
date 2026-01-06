import { getDashboardData, createAgentInvite } from "../agent/actions"
import { DashboardClient } from "./DashboardClient"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function DashboardPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/auth/signin")

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
