import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPolicyAccess } from "@/lib/policy-access"
import { isAgentRole } from "@/lib/auth/require-agent"
import { getInsurers, getInsuranceTypes } from "../../actions"
import { buildPolicyReviewData } from "@/lib/wallet/policy-review"
import { PolicyReviewRouteClient } from "@/components/wallet/PolicyReviewRouteClient"

/** Only same-origin paths — reject absolute/protocol-relative URLs. */
function sanitizeReturnTo(raw: string | string[] | undefined): string | null {
    const value = Array.isArray(raw) ? raw[0] : raw
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null
    return value
}

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
    const access = await getPolicyAccess(id, { id: dbUser.id, roles: dbUser.roles })
    if (!access.canWrite) notFound()

    const policy = await db.policy.findUnique({
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
    })

    if (!policy) notFound()
    if (policy.status === "analyzing") redirect(`/wallet/${id}`)

    const [insurers, types] = await Promise.all([getInsurers(), getInsuranceTypes()])
    const returnTo = sanitizeReturnTo((await searchParams).returnTo)

    return (
        <PolicyReviewRouteClient
            data={buildPolicyReviewData(policy)}
            insurers={insurers}
            types={types}
            returnTo={returnTo}
        />
    )
}
