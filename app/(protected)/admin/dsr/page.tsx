export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getDsrQueue } from "../actions"
import DsrQueueClient from "./DsrQueueClient"

export default async function AdminDsrPage() {
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const queue = await getDsrQueue({ limit: 100 })

    return (
        <DsrQueueClient
            dataExports={queue.dataExports}
            deletionRequests={queue.deletionRequests}
            summary={queue.summary}
        />
    )
}
