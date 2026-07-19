import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { getPlanCatalog } from "@/lib/pricing/plan-catalog"
import { AgentPricingClient } from "./AgentPricingClient"

export default async function AgentPricingPage() {
    const { dbUser } = await getAuthenticatedUser()

    // Agent pricing is agent-only; send everyone else to the consumer pricing.
    if (getPrimaryRole(dbUser.roles) !== "agent") {
        redirect("/pricing")
    }

    const entitlements = await resolveAgentEntitlements(dbUser.id)

    // Live admin-managed prices by plan id — the client's literals are only
    // the render fallback.
    const catalog = await getPlanCatalog()
    const prices = Object.fromEntries(
        catalog.filter((p) => p.planType === "agent").map((p) => [p.id, p.monthlyEur])
    )

    return <AgentPricingClient currentTier={entitlements.tier} prices={prices} />
}
