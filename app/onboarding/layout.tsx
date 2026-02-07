import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Ensure user is authenticated
    await getAuthenticatedUser()

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col">
            {children}
        </div>
    )
}
