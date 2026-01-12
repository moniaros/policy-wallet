import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getAccountData } from "./actions"
import { AccountClientPage } from "./AccountClientPage"

export default async function AccountPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getAccountData()
    if (!data) return <div>Error loading account data.</div>

    return (
        <AccountClientPage initialData={data} />
    )
}
