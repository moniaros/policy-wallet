import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { AgentPricingClient } from "./AgentPricingClient"

export default async function AgentPricingPage() {
    const { dbUser } = await getAuthenticatedUser()

    // Agent pricing is agent-only; send everyone else to the consumer pricing.
    if (getPrimaryRole(dbUser.roles) !== "agent") {
        redirect("/pricing")
    }

    const entitlements = await resolveAgentEntitlements(dbUser.id)

    return <AgentPricingClient currentTier={entitlements.tier} />
}
