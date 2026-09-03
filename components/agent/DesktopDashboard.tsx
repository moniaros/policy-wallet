"use client"

import React from "react"
import {
    Users,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Activity,
    Plus,
    UserPlus,
    FileText,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate } from "@/lib/agent/format"
import { CardHead } from "@/components/dashboard/home/CardHead"
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

/** The feed glyph's tone is a status token — never a palette literal. */
const ACTIVITY_COLORS: Record<string, string> = {
    policy_added: "text-status-success",
    customer_invited: "text-primary",
    renewal_completed: "text-muted-foreground",
    claim_filed: "text-status-warning",
}

/**
 * The advisor's home, on the app's page grammar (Direction A, 2026-09-03): the
 * page header (a greeting as the h1, the queue count as the subtitle, the one
 * primary action), the KPI strip as fact tiles, and every section a `.pw-card`
 * with the one card head — chip · sentence-case title · meta. The old header
 * band (a blurred white strip with a green icon box and a black-weight
 * greeting) and the three hand-rolled bordered cards are gone; the canvas and
 * the shell's rail are the only chrome.
 */
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

    const greeting = getGreeting(language)

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — who this is for, what is pending, the one action. */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">
                            {greeting}{agentName ? `, ${agentName}` : ""}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {data.actionQueue.length > 0
                                ? t.agentDashboard.itemsNeedAttention.replace("{count}", String(data.actionQueue.length))
                                : t.agentDashboard.noPendingItems}
                        </p>
                    </div>
                    <button type="button" onClick={onInviteCustomer} className="pw-primary-button">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        {pick(DASH_COPY.newClient, language)}
                    </button>
                </div>

                {/* ── Book-of-business KPI strip ─────────────────────────── */}
                {data.portalStats && <AgentKpiStrip stats={data.portalStats} />}

                {/* ── Above the fold: Action Queue + Revenue Pulse ──────── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <div className="pw-card pw-pad">
                            <CardHead icon={Users} title={pick(DASH_COPY.clients, language)} />
                            <div className="mt-4">
                                <ClientListGrouped
                                    clients={data.clientsByUrgency}
                                    onClientClick={onClientClick}
                                    onInviteClient={onInviteCustomer}
                                    isLoading={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 lg:col-span-4">
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
                        <div className="pw-card pw-pad">
                            <CardHead icon={Activity} title={pick(DASH_COPY.recentActivity, language)} />
                            <div className="mt-4 space-y-3">
                                {recentActivity.length === 0 && (
                                    <p className="py-4 text-center text-caption text-muted-foreground">
                                        {t.agentUi.noRecentActivity}
                                    </p>
                                )}
                                {recentActivity.slice(0, 6).map((activity) => {
                                    const Icon = ACTIVITY_ICONS[activity.type] || Activity
                                    const color = ACTIVITY_COLORS[activity.type] || "text-muted-foreground"
                                    return (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-muted" aria-hidden="true">
                                                <Icon className={`h-3.5 w-3.5 ${color}`} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {activity.customerName}
                                                </p>
                                                <p className="truncate text-caption text-muted-foreground">
                                                    {activity.details}
                                                </p>
                                                <p className="mt-0.5 text-caption text-muted-foreground">
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
                            <div className="pw-card pw-pad">
                                <CardHead icon={Plus} title={pick(DASH_COPY.quickAdd, language)} as="h3" />
                                {/* "Request" (document_request) was removed — there is
                                    no dashboard-level document-request flow to wire it
                                    to, so it did nothing on click. */}
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {[
                                        { type: "client" as const, icon: UserPlus, label: pick(DASH_COPY.quickClient, language) },
                                        { type: "policy" as const, icon: FileText, label: pick(DASH_COPY.quickPolicy, language) },
                                    ].map(({ type, icon: Icon, label }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => onQuickAdd(type)}
                                            className="pw-subcard flex min-h-11 cursor-pointer flex-col items-center gap-1.5 p-3 text-center transition-colors"
                                        >
                                            <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                                            <span className="text-caption font-medium text-foreground">
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
