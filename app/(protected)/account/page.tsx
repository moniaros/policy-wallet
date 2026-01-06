import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccountData } from "./actions"
import { AccountClientPage } from "./AccountClientPage"

export default async function AccountPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/auth/signin")
    }

    const data = await getAccountData()
    if (!data) return <div>Error loading account data.</div>

    return (
        <AccountClientPage initialData={data} />
    )
}
