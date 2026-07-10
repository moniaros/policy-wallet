export const runtime = 'nodejs'

import { getCustomers } from "../agent/actions"
import { CustomersClient } from "./CustomersClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getAgentPortalData } from "@/lib/services/agent-portal.service"

export default async function CustomersPage() {
    const { dbUser } = await getAuthenticatedUser()

    const [customers, portal] = await Promise.all([
        getCustomers(),
        getAgentPortalData(dbUser.id),
    ])

    const enriched = customers.map((customer) => ({
        ...customer,
        intelligence: portal.intelligence[customer.id],
    }))

    return (
        <CustomersClient initialCustomers={enriched} portalStats={portal.stats} />
    )
}
