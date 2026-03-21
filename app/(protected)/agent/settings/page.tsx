export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { AgentSettingsClient } from "./AgentSettingsClient"

export default async function AgentSettingsPage() {
    const { dbUser } = await getAuthenticatedUser()

    const [profile, agentEntitlements, customerCount] = await Promise.all([
        db.agentProfile.findUnique({ where: { userId: dbUser.id } }),
        resolveAgentEntitlements(dbUser.id),
        db.customerRelationship.count({ where: { agentUserId: dbUser.id } }),
    ])

    const commissionRates = (profile?.commissionRates as Record<string, number> | null) ?? {}

    return (
        <AgentSettingsClient
            initialAgencyName={profile?.agencyName}
            initialLicenseNumber={profile?.licenseNumber}
            initialCommissionRates={commissionRates}
            verificationStatus={profile?.verificationStatus}
            subscription={{
                tier: agentEntitlements.tier,
                isPaid: agentEntitlements.isPaid,
                maxCustomers: agentEntitlements.limits.maxCustomers,
                currentCustomers: customerCount,
                aiAnalysesPerMonth: agentEntitlements.limits.aiAnalysesPerMonth,
            }}
        />
    )
}
