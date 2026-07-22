export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPoliciesForAdmin } from "../policy-actions"
import PoliciesClient from "./PoliciesClient"

export default async function AdminPoliciesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; search?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const { status, search } = await searchParams
    const { policies } = await getPoliciesForAdmin({ status, search })

    return (
        <PoliciesClient
            initialPolicies={policies}
            initialStatus={status || "all"}
            initialSearch={search || ""}
        />
    )
}
