export const runtime = 'nodejs'

import { getAuthenticatedUser, getIsPayingUser, emailVerificationRequired } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { parseRoles } from "@/lib/api-auth"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role"
import { AppShell } from "@/components/shell"
import { NotificationWatcher } from "@/components/notifications/NotificationWatcher"
import { NeedsClaim } from "@/components/needs/NeedsClaim"
import { PlanFactsProvider } from "@/components/monetization/PlanFactsProvider"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { getClientPlanFacts } from "@/lib/pricing/plan-catalog"
import { getTranslations } from "@/lib/i18n"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { signOut } from "@/app/auth/actions"
import { db } from "@/lib/db"
import type { NavigationSection, UserRole } from "@/types/navigation"

import { Wallet, Shield, PieChart, Bell, LayoutDashboard, Users, Lightbulb, Settings, Building2, Gavel, ShieldAlert, ReceiptText, ClipboardList, Activity, RefreshCw, Euro, UsersRound, FileQuestion, Flag, Handshake, FileText, Inbox, Coins, Zap, LogOut } from 'lucide-react'
import { displayInsurerName, displayPersonName, displayPolicyNumber } from "@/lib/wallet/policy-identity"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import type { CommandSearchItem } from "@/components/shell/CommandSearch"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()

    // Email-verification hard gate (opt-in via the auth.enforce_email_verification
    // feature flag, which still falls through to ENFORCE_EMAIL_VERIFICATION).
    if (await emailVerificationRequired(dbUser)) {
        redirect("/auth/signup/confirmation")
    }

    const isPayingUser = await getIsPayingUser(dbUser)

    // Live admin-managed plan facts for client price displays (UpgradeModal,
    // pricing comparison, meters). Cached under the plan-catalog tag — this
    // does not add a per-request DB round-trip.
    const planFacts = await getClientPlanFacts()

    // Unread = an IN-APP notification the user has not opened.
    //
    // This used to count `readAt: null` across every channel, so each email we
    // ever sent — every weekly digest, every drip, every renewal reminder — sat
    // on the badge as an unread notification that nothing in the UI could clear.
    // On production that read 141 against a true count of 8. The `analytics`
    // channel is excluded by the same filter: the conversion mirror shares this
    // table and its rows were being counted too.
    const unreadNotificationCount = await db.notificationEvent.count({
        where: { userId: dbUser.id, channel: "in_app", readAt: null }
    })

    // Construct navigation based on roles.
    //
    // This used to be `dbUser.roles?.split(",")` + `roles[0]` — untrimmed (so
    // "policyholder, agent" yielded " agent"), unvalidated, and order-dependent:
    // a dual-role user got whichever role happened to be first in the string and
    // had NO way to reach the other role's tools from the shell. parseRoles and
    // getPrimaryRole already existed for exactly this (getPrimaryRole is what
    // /dashboard uses to route); the active-role cookie lets the RoleSwitcher
    // actually switch. Nav only — every page and API guards itself server-side.
    const roles = parseRoles(dbUser.roles)
    const availableRoles: UserRole[] = roles.length > 0 ? roles : ["policyholder"]
    const requestedRole = (await cookies()).get(ACTIVE_ROLE_COOKIE)?.value as UserRole | undefined
    const currentRole: UserRole = requestedRole && availableRoles.includes(requestedRole)
        ? requestedRole
        : getPrimaryRole(dbUser.roles)

    const navigation: NavigationSection[] = []
    // ONE resolved locale for the whole request: the shell's server half and
    // every client component under it read this value (Goal 1).
    const language = resolveUserLanguage(dbUser.preferredLanguage)
    const t = getTranslations(language)
    const roleCopy = getRoleCopy(language)

    // The desktop top bar's search — the policyholder's own policies, the same
    // held-policy predicate the wallet and the dashboard apply. Three columns,
    // one indexed query; agents and admins get no field (their books are not
    // "my policies").
    let searchItems: CommandSearchItem[] | undefined
    if (currentRole === "policyholder") {
        const lang: 'el' | 'en' = language
        const rows = await db.policy.findMany({
            where: { ownerUserId: dbUser.id, status: { not: "deleted" } },
            select: { id: true, insurerName: true, policyNumber: true, lineOfBusiness: true },
            orderBy: { updatedAt: "desc" },
        })
        searchItems = rows.map((row) => {
            const branch = normalizeBranch(row.lineOfBusiness)
            const branchLabel = branch.label[lang] || branch.label.en
            const number = displayPolicyNumber(row.policyNumber)
            // Through the identity module, so a placeholder sentinel never
            // renders in the list — nor matches a search: the keywords are the
            // scrubbed values plus the branch in both languages, never the raw
            // columns.
            const title = displayInsurerName(row.insurerName, branchLabel)
            return {
                id: row.id,
                title,
                subtitle: number ? `${branchLabel} · ${number}` : branchLabel,
                href: `/wallet/${row.id}`,
                keywords: `${title} ${number ?? ""} ${branch.label.el} ${branch.label.en}`,
            }
        })
    }

    if (currentRole === "policyholder") {
        // §4.2 IA: five tabs plus the bell. /protection absorbed /branches,
        // /insights/risk-profile and /coverage-insights; the timeline lives
        // inside Ρυθμίσεις (/account/history); the partner-benefits entry is
        // conditional INSIDE Ρυθμίσεις (SettingsNav), not a tab.
        //
        // Direction A groups the same destinations the way the reference does:
        // the product's three surfaces, then the people and messages that
        // support them, then the account itself — sign-out included, so the
        // one action that ends a session is not hidden inside a menu.
        navigation.push({
            title: t.nav.groupProtection,
            items: [
                { label: t.nav.home, href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.wallet, href: "/wallet", icon: <Wallet className="w-5 h-5" /> },
                { label: t.nav.protection, href: "/protection", icon: <Shield className="w-5 h-5" /> },
            ]
        })
        navigation.push({
            title: t.nav.groupSupport,
            items: [
                { label: t.nav.myAgent, href: "/agent", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotificationCount || undefined },
            ]
        })
        navigation.push({
            title: t.nav.groupGeneral,
            items: [
                { label: t.userMenu.settings, href: "/account", icon: <Settings className="w-5 h-5" /> },
                { label: t.userMenu.logout, href: "#logout", icon: <LogOut className="w-5 h-5" /> },
            ]
        })
    } else if (currentRole === "agent") {
        navigation.push({
            title: roleCopy.shell.agentSection,
            items: [
                { label: t.nav.dashboard, href: "/dashboard/agent", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.advisorBook, href: "/insights/book", icon: <Activity className="w-5 h-5" /> },
                { label: t.nav.customers, href: "/customers", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.opportunities, href: "/opportunities", icon: <Lightbulb className="w-5 h-5" /> },
                { label: t.nav.renewals, href: "/renewals", icon: <RefreshCw className="w-5 h-5" /> },
                { label: t.nav.commissions, href: "/commissions", icon: <Euro className="w-5 h-5" /> },
                { label: t.nav.questionnaires, href: "/questionnaires", icon: <FileQuestion className="w-5 h-5" /> },
                { label: t.tasks.actionCenter, href: "/tasks", icon: <ClipboardList className="w-5 h-5" /> },
                { label: t.nav.insights, href: "/insights", icon: <PieChart className="w-5 h-5" /> },
                { label: t.nav.team, href: "/team", icon: <UsersRound className="w-5 h-5" /> },
                { label: t.nav.notifications, href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotificationCount || undefined },
                { label: roleCopy.shell.agentProfile, href: "/agent/settings", icon: <Settings className="w-5 h-5" /> },
            ]
        })
    } else if (currentRole === "admin") {
        // Single source of truth for admin nav. This used to be one of TWO admin
        // navs — AppShell's (10 translated items) plus a nested AdminSidebar
        // (14 hardcoded-English items), which disagreed about what exists.
        // The four AdminSidebar-only destinations are merged in here.
        navigation.push({
            title: t.nav.admin,
            items: [
                { label: t.nav.dashboard, href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: t.nav.users, href: "/admin/users", icon: <Users className="w-5 h-5" /> },
                { label: t.nav.policies, href: "/admin/policies", icon: <FileText className="w-5 h-5" /> },
                { label: t.nav.dsrQueue, href: "/admin/dsr", icon: <ShieldAlert className="w-5 h-5" /> },
                { label: t.nav.submissions, href: "/admin/submissions", icon: <Inbox className="w-5 h-5" /> },
                { label: t.nav.aiTokens, href: "/admin/tokens", icon: <Coins className="w-5 h-5" /> },
                { label: t.nav.billingReconciliation, href: "/admin/billing-reconciliation", icon: <ReceiptText className="w-5 h-5" /> },
                { label: t.nav.launchReadiness, href: "/admin/launch-readiness", icon: <Shield className="w-5 h-5" /> },
                { label: t.nav.extractionFlags, href: "/admin/extraction-flags", icon: <Flag className="w-5 h-5" /> },
                { label: t.nav.notificationAdmin, href: "/admin/notifications", icon: <Bell className="w-5 h-5" /> },
                { label: t.nav.automation, href: "/admin/automation", icon: <Zap className="w-5 h-5" /> },
                { label: t.nav.plans, href: "/admin/plans", icon: <Euro className="w-5 h-5" /> },
                { label: t.nav.partners, href: "/admin/partners", icon: <Handshake className="w-5 h-5" /> },
                { label: t.nav.insurers, href: "/admin/insurers", icon: <Building2 className="w-5 h-5" /> },
                { label: t.nav.insuranceTypes, href: "/admin/types", icon: <Gavel className="w-5 h-5" /> },
                { label: t.nav.activity, href: "/admin/activity", icon: <Activity className="w-5 h-5" /> },
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
        // Mounts the EL+EN dictionary for the whole protected tree. It wraps
        // AppShell rather than sitting inside it because the shell itself
        // (AppShell/MainNav/UserMenu) reads `t`.
        <LanguageProvider initialLanguage={language}>
        <TranslationsProvider>
        <AppShell
            user={{
                name: displayPersonName(dbUser.name) || roleCopy.defaults.userName,
                email: dbUser.email || "",
                avatarUrl: dbUser.image || undefined,
            }}
            currentRole={userRoleObj}
            availableRoles={availableRoles.map(r => ({ role: r, label: t.roles[r as keyof typeof t.roles] || r }))}
            navigation={navigation}
            notificationCount={unreadNotificationCount}
            searchItems={searchItems}
            searchLabels={searchItems ? {
                placeholder: t.nav.searchPlaceholder,
                ariaLabel: t.nav.searchPolicies,
                noResults: t.nav.searchNoResults,
                resultsLabel: t.nav.searchResultsLabel,
            } : undefined}
            onLogout={signOut}
        >
            {/* Live analysis-completion toasts for agents (b2c uses the wallet
                page's own analyzing poller). */}
            {currentRole === "agent" && <NotificationWatcher userId={dbUser.id} />}
            {/* Carries the public /needs answers into the profile on the first
                authenticated render after signup, so nobody is asked the same
                six questions twice. Policyholders only — the risk profile is a
                household, and an agent's own is not what /needs described. */}
            {currentRole !== "agent" && <NeedsClaim />}
            <PlanFactsProvider facts={planFacts}>{children}</PlanFactsProvider>
        </AppShell>
        </TranslationsProvider>
        </LanguageProvider>
    )
}
