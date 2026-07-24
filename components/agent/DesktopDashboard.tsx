"use client"

import React from "react"
import {
    Briefcase,
    Users,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Activity,
    ArrowUpRight,
    Plus,
    UserPlus,
    FileText,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { formatRelativeDate } from "@/lib/agent/format"
import { ActionQueueCard } from "./ActionQueueCard"
import { AgentKpiStrip } from "./AgentKpiStrip"
import { RevenuePulse } from "./RevenuePulse"
import { PortfolioHealth } from "./PortfolioHealth"
import { ClientListGrouped } from "./ClientCard"
import { AgentPlanGate } from "./AgentPlanGate"
import { PendingTasksCard } from "./PendingTasksCard"
import { CrossSellCard } from "./CrossSellCard"
import type {
    ActionQueueItem,
    RevenueMetrics,
    PortfolioHealth as PortfolioHealthData,
    ClientCardData,
    AgentDashboardData,
} from "./types"
import type { AgentTier } from "@/types/subscription-entitlements"

const DASH_COPY = {
    newClient: { el: "Νέος πελάτης", en: "New Client" },
    revenuePulse: { el: "Παλμός εσόδων", en: "Revenue Pulse" },
    clients: { el: "Πελάτες", en: "Clients" },
    recentActivity: { el: "Πρόσφατη δραστηριότητα", en: "Recent Activity" },
    quickAdd: { el: "Γρήγορη προσθήκη", en: "Quick Add" },
    quickClient: { el: "Πελάτης", en: "Client" },
    quickPolicy: { el: "Ασφαλιστήριο", en: "Policy" },
    quickRequest: { el: "Αίτημα", en: "Request" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

interface DesktopDashboardProps {
    data: AgentDashboardData
    recentActivity: Array<{
        id: string
        type: string
        customerName: string
        timestamp: string
        details: string
    }>
    agentTier: AgentTier
    agentName?: string
    onActionQueueItem: (item: ActionQueueItem) => void
    onClientClick: (clientId: string) => void
    onInviteCustomer: () => void
    onQuickAdd?: (type: "client" | "policy" | "document_request") => void
    isLoading?: boolean
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
    policy_added: CheckCircle2,
    customer_invited: Users,
    renewal_completed: Calendar,
    claim_filed: AlertCircle,
}

const ACTIVITY_COLORS: Record<string, string> = {
    policy_added: "text-[#22C55E]",
    customer_invited: "text-primary dark:text-mint",
    renewal_completed: "text-neutral-500",
    claim_filed: "text-amber-500",
}

export function DesktopDashboard({
    data,
    recentActivity,
    agentTier,
    agentName,
    onActionQueueItem,
    onClientClick,
    onInviteCustomer,
    onQuickAdd,
    isLoading,
}: DesktopDashboardProps) {
    const { language, t } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const greeting = getGreeting(language)

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Header */}
            <div className="relative overflow-hidden bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60">
                <div className="max-w-page-wide mx-auto px-4 sm:px-8 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                            <div className="relative bg-primary text-white dark:text-[#1A2420] p-3 rounded-2xl shadow-lg shadow-primary/25">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-foreground tracking-tight">
                                    {greeting}{agentName ? `, ${agentName}` : ""}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {data.actionQueue.length > 0
                                        ? t.agentDashboard.itemsNeedAttention.replace("{count}", String(data.actionQueue.length))
                                        : t.agentDashboard.noPendingItems}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onInviteCustomer}
                                className="pw-primary-button group shadow-primary/25"
                            >
                                <UserPlus className="w-4 h-4" />
                                {pick(DASH_COPY.newClient, language)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-page-wide mx-auto px-4 sm:px-8 py-6 space-y-6">
                {/* ── Book-of-business KPI strip ─────────────────────────── */}
                {data.portalStats && <AgentKpiStrip stats={data.portalStats} />}

                {/* ── Above the fold: Action Queue + Revenue Pulse ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7">
                        <ActionQueueCard
                            items={data.actionQueue}
                            revenueAtRisk={data.revenueAtRiskTotal}
                            onAction={onActionQueueItem}
                            isLoading={isLoading}
                            gapsSummary={data.gapsSummary}
                            onGapClientClick={onClientClick}
                            hasClients={data.portfolioHealth.totalClients > 0}
                            onInviteClient={onInviteCustomer}
                        />
                    </div>
                    <div className="lg:col-span-5">
                        <AgentPlanGate
                            currentTier={agentTier}
                            requiredTier="agent_starter"
                            featureLabel={pick(DASH_COPY.revenuePulse, language)}
                        >
                            <RevenuePulse
                                metrics={data.revenue}
                                isLoading={isLoading}
                                isPipelineGated={agentTier === "agent_free" || agentTier === "agent_starter"}
                            />
                        </AgentPlanGate>
                    </div>
                </div>

                {/* ── Mid fold: Portfolio Health + Today's Follow-ups ──── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-5">
                        <PortfolioHealth
                            health={data.portfolioHealth}
                            isLoading={isLoading}
                        />
                    </div>
                    <div className="lg:col-span-7">
                        <PendingTasksCard items={data.pendingTasks} />
                    </div>
                </div>

                {/* ── Below the fold: Clients + Activity Feed ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8">
                        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary dark:text-mint" />
                                    {pick(DASH_COPY.clients, language)}
                                </h2>
                            </div>
                            <ClientListGrouped
                                clients={data.clientsByUrgency}
                                onClientClick={onClientClick}
                                onInviteClient={onInviteCustomer}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-5">
                        {/* Cross-sell opportunities (Pro+). Data is withheld
                            server-side for below-Pro tiers; the gate blurs the
                            empty card and shows the upgrade prompt. */}
                        <AgentPlanGate
                            currentTier={agentTier}
                            requiredTier="agent_pro"
                            featureLabel={t.agentDashboard.crossSell}
                        >
                            <CrossSellCard
                                items={data.crossSellOpportunities}
                                onClientClick={onClientClick}
                            />
                        </AgentPlanGate>

                        {/* Activity Feed */}
                        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
                            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary dark:text-mint" />
                                {pick(DASH_COPY.recentActivity, language)}
                            </h2>
                            <div className="space-y-4">
                                {recentActivity.length === 0 && (
                                    <p className="py-4 text-center text-xs text-muted-foreground">
                                        {t.agentUi.noRecentActivity}
                                    </p>
                                )}
                                {recentActivity.slice(0, 6).map((activity, i) => {
                                    const Icon = ACTIVITY_ICONS[activity.type] || Activity
                                    const color = ACTIVITY_COLORS[activity.type] || "text-neutral-500"
                                    return (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <div className="relative mt-0.5">
                                                <div className="p-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                                                </div>
                                                {i < recentActivity.length - 1 && (
                                                    <div className="absolute left-1/2 top-8 -translate-x-1/2 w-px h-3 bg-neutral-200 dark:bg-neutral-800" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                    {activity.customerName}
                                                </p>
                                                <p className="text-micro text-muted-foreground truncate">
                                                    {activity.details}
                                                </p>
                                                <p className="text-kicker text-neutral-500 mt-0.5">
                                                    {formatRelativeDate(activity.timestamp, language)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Quick Add */}
                        {onQuickAdd && (
                            <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                                    {pick(DASH_COPY.quickAdd, language)}
                                </h3>
                                {/* "Request" (document_request) was removed — there is
                                    no dashboard-level document-request flow to wire it
                                    to, so it did nothing on click. */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { type: "client" as const, icon: UserPlus, label: pick(DASH_COPY.quickClient, language) },
                                        { type: "policy" as const, icon: FileText, label: pick(DASH_COPY.quickPolicy, language) },
                                    ].map(({ type, icon: Icon, label }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => onQuickAdd(type)}
                                            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--brand-border-subtle)] p-3 text-center transition hover:bg-[var(--brand-surface-elevated)] hover:shadow-sm cursor-pointer"
                                        >
                                            <Icon className="h-4 w-4 text-primary dark:text-mint" />
                                            <span className="text-micro font-medium text-neutral-600 dark:text-neutral-300">
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Greeting helper ──────────────────────────────────────────────────

function getGreeting(language: string): string {
    const hour = new Date().getHours()
    if (language === "el") {
        if (hour < 12) return "Καλημέρα"
        if (hour < 18) return "Καλό απόγευμα"
        return "Καλό βράδυ"
    }
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}
