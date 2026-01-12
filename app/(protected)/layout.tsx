import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { AppShell } from "@/components/shell"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()

    // Construct navigation based on roles
    const roles = dbUser.roles?.split(",") || ["policyholder"]
    const currentRole = roles[0] as "policyholder" | "agent" | "admin"

    const navigation = []

    if (currentRole === "policyholder") {
        navigation.push({
            title: "My Insurance",
            items: [
                { label: "Wallet", href: "/wallet" },
                { label: "Pending Tasks", href: "/tasks" },
                { label: "Coverage Insights", href: "/coverage-insights" },
                { label: "Alerts & History", href: "/notifications" },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: "Agency",
            items: [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Customers", href: "/customers" },
                { label: "Opportunities", href: "/opportunities" },
                { label: "Insights", href: "/insights" },
                { label: "Communication", href: "/notifications" },
            ]
        })
    } else if (currentRole === "admin") {
        navigation.push({
            title: "Administrative",
            items: [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Users & Roles", href: "/admin/users" },
                { label: "Insurers", href: "/admin/insurers" },
                { label: "Insurance Types", href: "/admin/types" },
            ]
        })
    }

    // Common settings
    navigation.push({
        title: "Account",
        items: [
            { label: "Settings", href: "/account" }
        ]
    })

    const userRoleObj = { role: currentRole, label: currentRole.charAt(0).toUpperCase() + currentRole.slice(1) }

    return (
        <AppShell
            user={{
                name: dbUser.name || "User",
                email: dbUser.email || "",
                avatarUrl: dbUser.image || undefined,
            }}
            currentRole={userRoleObj}
            availableRoles={roles.map(r => ({ role: r as any, label: r }))}
            navigation={navigation}
        >
            {children}
        </AppShell>
    )
}
