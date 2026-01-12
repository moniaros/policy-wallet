import { getCustomerProfile } from "../../agent/actions"
import { CustomerProfileClient } from "./CustomerProfileClient"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"

interface Props {
    params: { id: string }
}

export default async function CustomerProfilePage({ params }: Props) {
    const { dbUser } = await getAuthenticatedUser()

    const customer = await getCustomerProfile(params.id)
    if (!customer) notFound()

    return <CustomerProfileClient initialCustomer={customer} />
}
