import { getAuthenticatedUser, getIsPayingUser } from "@/lib/auth-helpers"
import { AppShell } from "@/components/shell"
import { getTranslations } from "@/lib/i18n"
import { signOut } from "@/app/auth/actions"
import type { NavigationSection, UserRole } from "@/types/navigation"

import { Wallet, Shield, PieChart, Bell, LayoutDashboard, Users, Lightbulb, Settings, Building2, Gavel } from 'lucide-react'

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()
    const isPayingUser = await getIsPayingUser(dbUser)

    // Construct navigation based on roles
    const roles = dbUser.roles?.split(",") || ["policyholder"]
    const currentRole = roles[0] as UserRole

    const navigation: NavigationSection[] = []
    const t = getTranslations(dbUser.preferredLanguage as 'en' | 'el' || 'el')

    if (currentRole === "policyholder") {
        navigation.push({
            title: t.nav.wallet,
            items: [
                { label: t.nav.wallet, href: "/wallet", icon: <Wallet className="w-5 h-5" /> },
                {
                    label: t.nav.coverage,
                    href: "/coverage",
                    variant: 'pro',
                    isLocked: !isPayingUser,
                    icon: <Shield className="w-5 h-5" />
                },
                {
                    label: t.nav.coverageInsights,
                    href: "/coverage-insights",
                    variant: 'plus',
                    isLocked: !isPayingUser,
                    icon: <PieChart className="w-5 h-5" />
                },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" /> },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: "Agency",
            items: [
                { label: t.nav.dashboard, href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.customers, href: "/customers", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.opportunities, href: "/opportunities", icon: <Lightbulb className="w-5 h-5" /> },
                { label: t.nav.insights, href: "/insights", icon: <PieChart className="w-5 h-5" /> },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" /> },
            ]
        })
    } else if (currentRole === "admin") {
        navigation.push({
            title: t.nav.admin,
            items: [
                { label: t.nav.dashboard, href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.users, href: "/admin/users", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.insurers, href: "/admin/insurers", icon: <Building2 className="w-5 h-5" /> },
                { label: t.nav.insuranceTypes, href: "/admin/types", icon: <Gavel className="w-5 h-5" /> },
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
