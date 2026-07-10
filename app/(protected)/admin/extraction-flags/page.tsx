export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getExtractionFlagQueue } from "../actions"
import ExtractionFlagsClient from "./ExtractionFlagsClient"

export default async function AdminExtractionFlagsPage() {
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const queue = await getExtractionFlagQueue({ limit: 100 })

    return <ExtractionFlagsClient items={queue.items} summary={queue.summary} />
}
