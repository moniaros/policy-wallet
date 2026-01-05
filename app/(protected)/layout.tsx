import { auth } from "@/auth"
import { AppShell } from "@/components/shell"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/auth/signin")
    }

    // Construct navigation based on roles
    const roles = session.user.roles?.split(",") || ["policyholder"]
    const currentRole = roles[0] as "policyholder" | "agent" | "admin"

    const navigation = []

    if (currentRole === "policyholder") {
        navigation.push({
            title: "My Insurance",
            items: [
                { label: "Wallet", href: "/wallet", isActive: true },
                { label: "Coverage", href: "/coverage" },
                { label: "Notifications", href: "/notifications" },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: "Agency",
            items: [
                { label: "Dashboard", href: "/dashboard", isActive: true },
                { label: "Customers", href: "/customers" },
                { label: "Opportunities", href: "/opportunities" },
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
                name: session.user.name || "User",
                email: session.user.email || "",
                avatarUrl: session.user.image || undefined,
            }}
            currentRole={userRoleObj}
            availableRoles={roles.map(r => ({ role: r as any, label: r }))}
            navigation={navigation}
        >
            {children}
        </AppShell>
    )
}
