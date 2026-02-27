export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. Authenticate user
    const { dbUser } = await getAuthenticatedUser()

    // 2. Authorization check
    // Assuming 'roles' is a string that might contain 'admin', e.g., "admin" or "policyholder,admin"
    if (!dbUser.roles.includes('admin')) {
        // Log security event could happen here
        redirect("/wallet")
    }

    return (
        <div className="flex min-h-screen flex-col">
            {children}
        </div>
    )
}
