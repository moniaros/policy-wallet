export const runtime = 'nodejs'

import { getCustomerProfile } from "../../agent/actions"
import { CustomerProfileClient } from "./CustomerProfileClient"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { canAgentUseFeature, resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { computeRelationshipScoreFromCustomer } from "@/lib/agent/health-score"

interface Props {
    params: { id: string }
}

export default async function CustomerProfilePage({ params }: Props) {
    const { dbUser } = await getAuthenticatedUser()

    const customer = await getCustomerProfile(params.id)
    if (!customer) notFound()

    // Compute data for ClientDetailView
    const agentEntitlements = await resolveAgentEntitlements(dbUser.id)
    const canBrandedReport = await canAgentUseFeature(dbUser.id, "brandedReport")
    const healthScore = computeRelationshipScoreFromCustomer(customer)

    return (
        <>
            <CustomerProfileClient
                initialCustomer={customer}
                agentTier={agentEntitlements.tier}
                canBrandedReport={canBrandedReport}
                healthScore={healthScore}
            />
            {/* The health score, gaps and cross-sell shown here are AI-generated. */}
            <div className="mx-auto max-w-6xl px-4 pb-10">
                <AiDisclaimer />
            </div>
        </>
    )
}
