export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import PolicyholderHomePage from "../home/page"
import { getPrimaryRole } from "@/lib/auth/role-routing"

export default async function DashboardPage() {
    const { dbUser } = await getAuthenticatedUser()
    const role = getPrimaryRole(dbUser.roles)

    if (role === "agent") redirect("/dashboard/agent")
    if (role === "admin") redirect("/admin/dashboard")

    // Pass the already-fetched user so PolicyholderHomePage skips a second auth round-trip
    return <PolicyholderHomePage preloadedDbUser={dbUser} />
}
