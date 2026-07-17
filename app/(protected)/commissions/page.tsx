export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { getCommissionDashboard } from "./actions"
import { CommissionsClient } from "./CommissionsClient"
import { CommissionsLocked } from "./CommissionsLocked"

export default async function CommissionsPage() {
    const { dbUser } = await getAuthenticatedUser()

    // commissionTracking is agent_pro / agency only. The page used to render
    // for every tier (incl. agent_free), giving away a sold Pro feature.
    if (!(await canAgentUseFeature(dbUser.id, "commissionTracking"))) {
        return <CommissionsLocked />
    }

    const data = await getCommissionDashboard()
    if (!data) return null

    return <CommissionsClient data={data} />
}
