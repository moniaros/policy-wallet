import { getCustomers } from "../agent/actions"
import { CustomersClient } from "./CustomersClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"

export default async function CustomersPage() {
    const { dbUser } = await getAuthenticatedUser()

    const customers = await getCustomers()

    return (
        <CustomersClient initialCustomers={customers} />
    )
}
