export const runtime = "nodejs"

import { getTeamData, getTeamPipeline } from "./actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { TeamClient } from "./TeamClient"

export default async function TeamPage() {
    const [team, pipeline] = await Promise.all([
        getTeamData(),
        getTeamPipeline(),
    ])

    const { dbUser } = await getAuthenticatedUser()
    const entitlement = team ? null : await resolveAgentEntitlements(dbUser.id)
    const seats = entitlement?.limits.teamMembers
    const canCreateAgency = Boolean(entitlement && (seats === null || (seats !== undefined && seats > 1)))
    return <TeamClient team={team} pipeline={pipeline} canCreateAgency={canCreateAgency} />
}
