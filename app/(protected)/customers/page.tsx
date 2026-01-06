import { getCustomers } from "../agent/actions"
import { CustomersClient } from "./CustomersClient"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function CustomersPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/auth/signin")

    const customers = await getCustomers()

    return (
        <CustomersClient initialCustomers={customers} />
    )
}
