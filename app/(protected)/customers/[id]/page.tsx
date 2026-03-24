export const runtime = 'nodejs'

import { getCustomerProfile } from "../../agent/actions"
import { CustomerProfileClient } from "./CustomerProfileClient"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { computeHealthScoreFromCustomer } from "@/lib/agent/health-score"

interface Props {
    params: { id: string }
}

export default async function CustomerProfilePage({ params }: Props) {
    const { dbUser } = await getAuthenticatedUser()

    const customer = await getCustomerProfile(params.id)
    if (!customer) notFound()

    // Compute data for ClientDetailView
    const agentEntitlements = await resolveAgentEntitlements(dbUser.id)
    const healthScore = computeHealthScoreFromCustomer(customer)

    return (
        <CustomerProfileClient
            initialCustomer={customer}
            agentTier={agentEntitlements.tier}
            healthScore={healthScore}
        />
    )
}
