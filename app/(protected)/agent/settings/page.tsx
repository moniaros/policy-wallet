export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AgentSettingsClient } from "./AgentSettingsClient"

export default async function AgentSettingsPage() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.agentProfile.findUnique({
        where: { userId: dbUser.id }
    })

    return (
        <AgentSettingsClient
            initialAgencyName={profile?.agencyName}
            initialLicenseNumber={profile?.licenseNumber}
            verificationStatus={profile?.verificationStatus}
        />
    )
}
