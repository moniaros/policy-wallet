import { getUsers } from "../actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import UsersClient from "./UsersClient"

interface PageProps {
    searchParams: Promise<{
        page?: string
        search?: string
        role?: string
        filter?: string
    }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    // Verify admin role
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const params = await searchParams
    const page = parseInt(params.page || "1")
    const search = params.search
    const roleFilter = params.role
    const statusFilter = params.filter

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
