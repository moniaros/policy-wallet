import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPolicyAccess } from "@/lib/policy-access"
import { isAgentRole } from "@/lib/auth/require-agent"
import { sanitizeReturnPath } from "@/lib/navigation/return-to"
import { getInsurers, getInsuranceTypes } from "../../actions"
import { buildPolicyReviewData } from "@/lib/wallet/policy-review"
import { PolicyReviewRouteClient } from "@/components/wallet/PolicyReviewRouteClient"

export default async function PolicyReviewPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ returnTo?: string | string[] }>
}) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()

    // The extraction review is an agent-only professional verification step:
    // agent (or admin) role plus write access (owner, or an active
    // write/manage grant on this policy). Everyone else gets a 404.
    if (!isAgentRole(dbUser.roles)) notFound()

    // The policy fetch only depends on the id — run it alongside the access
    // check and discard it on denial.
    const [access, policy, resolvedSearchParams] = await Promise.all([
        getPolicyAccess(id, { id: dbUser.id, roles: dbUser.roles }),
        db.policy.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                insurerName: true,
                lineOfBusiness: true,
                startDate: true,
                endDate: true,
                premiumAmount: true,
                premiumCurrency: true,
                policyNumber: true,
                coverageSummary: true,
                acordData: true,
            },
        }),
        searchParams,
    ])
    if (!access.canWrite) notFound()
    if (!policy) notFound()

    const rawReturnTo = resolvedSearchParams.returnTo
    const returnTo = sanitizeReturnPath(Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo)

    // Mid-analysis: bounce back to where the agent came from, not the b2c
    // wallet view of someone else's policy.
    if (policy.status === "analyzing") redirect(returnTo || `/wallet/${id}`)

    const [insurers, types] = await Promise.all([getInsurers(), getInsuranceTypes()])

    return (
        <PolicyReviewRouteClient
            data={buildPolicyReviewData(policy)}
            insurers={insurers}
            types={types}
            returnTo={returnTo}
        />
    )
}
