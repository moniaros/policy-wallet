export const runtime = 'nodejs'

import { getAuthenticatedUser, getIsPayingUser } from "@/lib/auth-helpers"
import { AppShell } from "@/components/shell"
import { getTranslations } from "@/lib/i18n"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { signOut } from "@/app/auth/actions"
import { db } from "@/lib/db"
import type { NavigationSection, UserRole } from "@/types/navigation"

import { Wallet, Shield, PieChart, Bell, LayoutDashboard, Users, Lightbulb, Settings, Building2, Gavel, ShieldAlert, ReceiptText, ClipboardList, Activity, RefreshCw, DollarSign, UsersRound, FileQuestion } from 'lucide-react'

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()
    const isPayingUser = await getIsPayingUser(dbUser)

    // Query unread notification count
    const unreadNotificationCount = await db.notificationEvent.count({
        where: { userId: dbUser.id, readAt: null }
    })

    // Construct navigation based on roles
    const roles = dbUser.roles?.split(",") || ["policyholder"]
    const currentRole = roles[0] as UserRole

    const navigation: NavigationSection[] = []
    const t = getTranslations(dbUser.preferredLanguage as 'en' | 'el' || 'el')
    const roleCopy = getRoleCopy((dbUser.preferredLanguage as 'en' | 'el') || 'el')

    if (currentRole === "policyholder") {
        navigation.push({
            title: t.nav.navigation,
            items: [
                { label: t.nav.home, href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.wallet, href: "/wallet", icon: <Wallet className="w-5 h-5" /> },
                {
                    label: t.nav.coverageInsights,
                    href: "/coverage-insights",
                    variant: 'plus',
                    isLocked: false,
                    icon: <Shield className="w-5 h-5" />
                },
                { label: t.nav.myAgent, href: "/agent", icon: <Users className="w-5 h-5" /> },
                { label: t.userMenu.settings, href: "/account", icon: <Settings className="w-5 h-5" /> },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotificationCount || undefined },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: roleCopy.shell.agentSection,
            items: [
                { label: t.nav.dashboard, href: "/dashboard/agent", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.customers, href: "/customers", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.opportunities, href: "/opportunities", icon: <Lightbulb className="w-5 h-5" /> },
                { label: t.nav.renewals, href: "/renewals", icon: <RefreshCw className="w-5 h-5" /> },
                { label: t.nav.commissions, href: "/commissions", icon: <DollarSign className="w-5 h-5" /> },
                { label: t.nav.questionnaires, href: "/questionnaires", icon: <FileQuestion className="w-5 h-5" /> },
                { label: t.tasks.actionCenter, href: "/tasks", icon: <ClipboardList className="w-5 h-5" /> },
                { label: t.nav.insights, href: "/insights", icon: <PieChart className="w-5 h-5" /> },
                { label: t.nav.team, href: "/team", icon: <UsersRound className="w-5 h-5" /> },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotificationCount || undefined },
                { label: roleCopy.shell.agentProfile, href: "/agent/settings", icon: <Settings className="w-5 h-5" /> },
            ]
        })
    } else if (currentRole === "admin") {
        navigation.push({
            title: t.nav.admin,
            items: [
                { label: t.nav.dashboard, href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.users, href: "/admin/users", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.dsrQueue, href: "/admin/dsr", icon: <ShieldAlert className="w-5 h-5" /> },
                { label: t.nav.billingReconciliation, href: "/admin/billing-reconciliation", icon: <ReceiptText className="w-5 h-5" /> },
                { label: t.nav.launchReadiness, href: "/admin/launch-readiness", icon: <Shield className="w-5 h-5" /> },
                { label: t.nav.insurers, href: "/admin/insurers", icon: <Building2 className="w-5 h-5" /> },
                { label: t.nav.insuranceTypes, href: "/admin/types", icon: <Gavel className="w-5 h-5" /> },
            ]
        })
    }

    if (currentRole !== "policyholder") {
        navigation.push({
            title: t.nav.account,
            items: [
                { label: t.userMenu.settings, href: "/account" }
            ]
        })
    }

    const userRoleObj = { role: currentRole, label: t.roles[currentRole] || currentRole }

    return (
        <AppShell
            user={{
                name: dbUser.name || roleCopy.defaults.userName,
                email: dbUser.email || "",
                avatarUrl: dbUser.image || undefined,
            }}
            currentRole={userRoleObj}
            availableRoles={roles.map(r => ({ role: r as UserRole, label: t.roles[r as keyof typeof t.roles] || r }))}
            navigation={navigation}
            notificationCount={unreadNotificationCount}
            onLogout={signOut}
        >
            {children}
        </AppShell>
    )
}
