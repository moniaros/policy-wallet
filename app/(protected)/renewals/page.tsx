export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getAgentRenewals, getRenewalStats } from "./actions"
import { RenewalsClient } from "./RenewalsClient"

export default async function RenewalsPage() {
    const { dbUser } = await getAuthenticatedUser()

    const [renewals, stats] = await Promise.all([
        getAgentRenewals(),
        getRenewalStats(),
    ])

    return <RenewalsClient initialRenewals={renewals} stats={stats} />
}
