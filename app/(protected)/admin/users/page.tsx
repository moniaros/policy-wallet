export const runtime = 'nodejs'

import { getUsers } from "../actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import UsersClient from "./UsersClient"

export default async function AdminUsersPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Verify admin role
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const params = await searchParams
    const page = parseInt((params.page as string) || "1")
    const search = params.search as string | undefined
    const roleFilter = params.role as string | undefined
    const statusFilter = params.filter as string | undefined

    // Fetch users
    const usersData = await getUsers(page, 20, search, roleFilter, statusFilter)

    return (
        <UsersClient
            initialUsers={usersData.users}
            pagination={usersData.pagination}
            initialSearch={search}
            initialRoleFilter={roleFilter}
        />
    )
}
