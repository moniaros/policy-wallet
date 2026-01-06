import { getCustomerProfile } from "../../agent/actions"
import { CustomerProfileClient } from "./CustomerProfileClient"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"

interface Props {
    params: { id: string }
}

export default async function CustomerProfilePage({ params }: Props) {
    const session = await auth()
    if (!session?.user?.id) redirect("/auth/signin")

    const customer = await getCustomerProfile(params.id)
    if (!customer) notFound()

    return <CustomerProfileClient initialCustomer={customer} />
}
