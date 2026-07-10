"use client"

import React from "react"
import {
    Briefcase,
    Users,
    Clock,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Activity,
    ArrowUpRight,
    Plus,
    UserPlus,
    FileText,
    Send,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { formatRelativeDate } from "@/lib/agent/format"
import { ActionQueueCard } from "./ActionQueueCard"
import { RevenuePulse } from "./RevenuePulse"
import { PortfolioHealth } from "./PortfolioHealth"
import { ClientListGrouped } from "./ClientCard"
import { AgentPlanGate } from "./AgentPlanGate"
import type {
    ActionQueueItem,
    RevenueMetrics,
    PortfolioHealth as PortfolioHealthData,
    ClientCardData,
    AgentDashboardData,
} from "./types"
import type { AgentTier } from "@/types/subscription-entitlements"

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
    renewal_completed: "text-slate-500",
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
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
            {/* Header */}
            <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-[1400px] mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative bg-primary text-white dark:text-[#1A2420] p-3 rounded-2xl shadow-lg shadow-primary/25">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {greeting}{agentName ? `, ${agentName}` : ""}
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {data.actionQueue.length > 0
                                        ? (language === "el"
                                            ? `${data.actionQueue.length} στοιχεία χρειάζονται την προσοχή σας`
                                            : `${data.actionQueue.length} items need your attention`)
                                        : (language === "el"
                                            ? "Κανένα εκκρεμές στοιχείο σήμερα"
                                            : "No pending items today")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onInviteCustomer}
                                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                {language === "el" ? "Νέος Πελάτης" : "New Client"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
                {/* ── Above the fold: Action Queue + Revenue Pulse ──────── */}
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-7">
                        <ActionQueueCard
                            items={data.actionQueue}
                            onAction={onActionQueueItem}
                            isLoading={isLoading}
                            gapsSummary={data.gapsSummary}
                            onGapClientClick={onClientClick}
                        />
                    </div>
                    <div className="col-span-5">
                        <AgentPlanGate
                            currentTier={agentTier}
                            requiredTier="agent_starter"
                            featureLabel={language === "el" ? "Παλμός Εσόδων" : "Revenue Pulse"}
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
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-5">
                        <PortfolioHealth
                            health={data.portfolioHealth}
                            isLoading={isLoading}
                        />
                    </div>
                    <div className="col-span-7">
                        <TodaysFollowUps
                            items={data.todaysFollowUps}
                            language={language}
                            onAction={onActionQueueItem}
                        />
                    </div>
                </div>

                {/* ── Below the fold: Clients + Activity Feed ─────────── */}
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-8">
                        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary dark:text-mint" />
                                    {language === "el" ? "Πελάτες" : "Clients"}
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

                    <div className="col-span-4 space-y-5">
                        {/* Activity Feed */}
                        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary dark:text-mint" />
                                {language === "el" ? "Πρόσφατη Δραστηριότητα" : "Recent Activity"}
                            </h2>
                            <div className="space-y-4">
                                {recentActivity.slice(0, 6).map((activity, i) => {
                                    const Icon = ACTIVITY_ICONS[activity.type] || Activity
                                    const color = ACTIVITY_COLORS[activity.type] || "text-slate-500"
                                    return (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <div className="relative mt-0.5">
                                                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                                                </div>
                                                {i < recentActivity.length - 1 && (
                                                    <div className="absolute left-1/2 top-8 -translate-x-1/2 w-px h-3 bg-slate-200 dark:bg-slate-800" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                    {activity.customerName}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                    {activity.details}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
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
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                    {language === "el" ? "Γρήγορη Προσθήκη" : "Quick Add"}
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: "client" as const, icon: UserPlus, label: language === "el" ? "Πελάτης" : "Client" },
                                        { type: "policy" as const, icon: FileText, label: language === "el" ? "Ασφαλιστήριο" : "Policy" },
                                        { type: "document_request" as const, icon: Send, label: language === "el" ? "Αίτημα" : "Request" },
                                    ].map(({ type, icon: Icon, label }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => onQuickAdd(type)}
                                            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--brand-border-subtle)] p-3 text-center transition hover:bg-[var(--brand-surface-elevated)] hover:shadow-sm cursor-pointer"
                                        >
                                            <Icon className="h-4 w-4 text-primary dark:text-mint" />
                                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
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

// ── Today's Follow-ups sub-component ──────────────────────────────────

function TodaysFollowUps({
    items,
    language,
    onAction,
}: {
    items: ActionQueueItem[]
    language: string
    onAction: (item: ActionQueueItem) => void
}) {
    return (
        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === "el" ? "Σημερινά Follow-ups" : "Today's Follow-ups"}
                </h2>
                {items.length > 0 && (
                    <span className="text-xs text-slate-400 ml-1">({items.length})</span>
                )}
            </div>
            {items.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-[#22C55E] mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {language === "el"
                            ? "Κανένα follow-up για σήμερα"
                            : "No follow-ups scheduled for today"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 p-3"
                        >
                            <Clock className="h-4 w-4 text-primary dark:text-mint shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {item.clientName}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{item.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onAction(item)}
                                className="shrink-0 rounded-lg bg-primary-soft dark:bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary dark:text-mint transition hover:bg-primary/20 dark:hover:bg-primary/25 cursor-pointer"
                            >
                                {language === "el" ? "Δράση" : "Action"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
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
