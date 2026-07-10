import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getInsurers, getInsuranceTypes } from "../../actions"
import { buildPolicyReviewData } from "@/lib/wallet/policy-review"
import { PolicyReviewRouteClient } from "@/components/wallet/PolicyReviewRouteClient"

export default async function PolicyReviewPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()

    const policy = await db.policy.findFirst({
        where: { id, ownerUserId: dbUser.id },
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

    return (
        <PolicyReviewRouteClient
            data={buildPolicyReviewData(policy)}
            insurers={insurers}
            types={types}
        />
    )
}
