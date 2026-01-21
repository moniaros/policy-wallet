import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { AppShell } from "@/components/shell"
import { getTranslations } from "@/lib/i18n"
import { signOut } from "@/app/auth/actions"
import type { NavigationSection, UserRole } from "@/types/navigation"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()

    // Construct navigation based on roles
    const roles = dbUser.roles?.split(",") || ["policyholder"]
    const currentRole = roles[0] as UserRole

    const navigation: NavigationSection[] = []
    const t = getTranslations(dbUser.preferredLanguage as 'en' | 'el' || 'el')

    if (currentRole === "policyholder") {
        navigation.push({
            title: t.nav.wallet,
            items: [
                { label: t.nav.wallet, href: "/wallet" },
                { label: t.nav.coverage, href: "/tasks" },
                { label: t.nav.coverageInsights, href: "/coverage-insights" },
                { label: t.nav.notifications, href: "/notifications" },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: "Agency",
            items: [
                { label: t.nav.dashboard, href: "/dashboard" },
                { label: t.nav.customers, href: "/customers" },
                { label: t.nav.opportunities, href: "/opportunities" },
                { label: t.nav.insights, href: "/insights" },
                { label: t.nav.notifications, href: "/notifications" },
            ]
        })
    } else if (currentRole === "admin") {
        navigation.push({
            title: t.nav.admin,
            items: [
                { label: t.nav.dashboard, href: "/admin/dashboard" },
                { label: t.nav.users, href: "/admin/users" },
                { label: t.nav.insurers, href: "/admin/insurers" },
                { label: t.nav.insuranceTypes, href: "/admin/types" },
            ]
        })
    }

    // Common settings
    navigation.push({
        title: t.nav.account,
        items: [
            { label: t.userMenu.settings, href: "/account" }
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
            availableRoles={roles.map(r => ({ role: r as UserRole, label: r }))}
            navigation={navigation}
            onLogout={signOut}
        >
            {children}
        </AppShell>
    )
}
