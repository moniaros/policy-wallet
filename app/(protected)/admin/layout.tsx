export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

/**
 * Auth gate only. The admin navigation lives in the parent (protected) layout's
 * AppShell — this layout used to nest a second sidebar AND a second <main>
 * inside AppShell's <main>, which cost ~512px of chrome on desktop and produced
 * duplicate landmarks.
 */
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

    return <>{children}</>
}
