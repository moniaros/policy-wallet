"use client"

import React from "react"
import {
    AlertTriangle,
    Calendar,
    Clock,
    FileText,
    RefreshCw,
    Send,
    UserPlus,
    Eye,
    UserCheck,
    ChevronRight,
} from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate } from "@/lib/agent/format"
import type { ActionQueueItem, GapsSummary, OneTapAction } from "./types"

const ACTION_ICONS: Record<string, React.ElementType> = {
    expiring_policy: Calendar,
    unsigned_document: FileText,
    unanswered_request: Clock,
    incomplete_profile: UserPlus,
    inbound_lead: UserCheck,
    scheduled_followup: Send,
}

const ONE_TAP_LABELS: Record<OneTapAction, { en: string; el: string }> = {
    renew: { en: "Renew", el: "Ανανέωση" },
    follow_up: { en: "Follow up", el: "Παρακολούθηση" },
    send_reminder: { en: "Remind", el: "Υπενθύμιση" },
    view_document: { en: "View", el: "Προβολή" },
    complete_profile: { en: "Complete", el: "Συμπλήρωση" },
    accept_lead: { en: "Accept", el: "Αποδοχή" },
}

function getUrgencyStyles(urgency: "low" | "medium" | "high") {
    if (urgency === "high")
        return "text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900/30"
    if (urgency === "medium")
        return "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/30"
    return "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/30"
}

interface ActionQueueCardProps {
    items: ActionQueueItem[]
    onAction: (item: ActionQueueItem) => void
    onViewAll?: () => void
    onGapClientClick?: (clientId: string) => void
    isLoading?: boolean
    gapsSummary?: GapsSummary | null
}

export function ActionQueueCard({ items, onAction, onViewAll, onGapClientClick, isLoading, gapsSummary }: ActionQueueCardProps) {
    const { language, t } = useLanguage()

    if (isLoading) return <ActionQueueCardSkeleton />

    const urgentCount = items.filter((i) => i.urgency === "high").length
    const totalCount = items.length

    return (
        <BrandCard className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.agentUi.actionQueue}
                    </h2>
                    {totalCount > 0 && (
                        <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                            {totalCount}
                        </span>
                    )}
                </div>
                {urgentCount > 0 && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        {urgentCount} {t.agentUi.urgent}
                    </span>
                )}
            </div>

            {/* Critical gaps summary banner */}
            {gapsSummary && gapsSummary.criticalClientsCount > 0 && (
                <GapsSummaryBanner
                    summary={gapsSummary}
                    language={language}
                    onClientClick={onGapClientClick}
                />
            )}

            {/* Items */}
            {totalCount === 0 ? (
                <ActionQueueEmpty t={t} />
            ) : (
                <div className="space-y-2">
                    {items.slice(0, 5).map((item) => {
                        const Icon = ACTION_ICONS[item.type] || Clock
                        const label = ONE_TAP_LABELS[item.oneTapAction]
                        return (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${getUrgencyStyles(item.urgency)}`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {item.clientName}
                                    </p>
                                    <p className="text-xs opacity-75 truncate">
                                        {item.description}
                                    </p>
                                </div>
                                <span className="text-[10px] opacity-60 whitespace-nowrap">
                                    {formatRelativeDate(item.dueDate, language)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onAction(item)}
                                    className="shrink-0 rounded-lg bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:shadow-md"
                                >
                                    {language === "el" ? label.el : label.en}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* View all */}
            {totalCount > 5 && onViewAll && (
                <button
                    type="button"
                    onClick={onViewAll}
                    className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-primary dark:text-mint hover:underline"
                >
                    {language === "el"
                        ? `Δείτε όλα τα ${totalCount} στοιχεία`
                        : `View all ${totalCount} items`}
                    <ChevronRight className="h-3 w-3" />
                </button>
            )}
        </BrandCard>
    )
}

function GapsSummaryBanner({
    summary,
    language,
    onClientClick,
}: {
    summary: GapsSummary
    language: string
    onClientClick?: (clientId: string) => void
}) {
    const { criticalClientsCount, highClientsCount, topClients } = summary

    return (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    {language === "el"
                        ? `${criticalClientsCount} πελάτ${criticalClientsCount === 1 ? "ης" : "ες"} με κρίσιμα κενά`
                        : `${criticalClientsCount} client${criticalClientsCount === 1 ? "" : "s"} with critical gaps`}
                    {highClientsCount > 0 && (
                        <span className="font-normal text-red-600/70 dark:text-red-400/70">
                            {" "}
                            {language === "el"
                                ? `+ ${highClientsCount} υψηλής`
                                : `+ ${highClientsCount} high`}
                        </span>
                    )}
                </p>
            </div>
            {topClients.length > 0 && (
                <div className="space-y-1">
                    {topClients.slice(0, 3).map((client) => (
                        <button
                            key={client.clientId}
                            type="button"
                            onClick={() => onClientClick?.(client.clientId)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                            <span className="font-medium text-red-900 dark:text-red-200 truncate">
                                {client.clientName}
                            </span>
                            <span className="shrink-0 ml-2 text-red-600 dark:text-red-400">
                                {client.criticalGaps > 0 && (
                                    <span className="inline-flex items-center gap-0.5">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                        {client.criticalGaps}
                                    </span>
                                )}
                                {client.highGaps > 0 && (
                                    <span className="inline-flex items-center gap-0.5 ml-2">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                                        {client.highGaps}
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function ActionQueueEmpty({ t }: { t: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft dark:bg-primary/15">
                <RefreshCw className="h-5 w-5 text-primary dark:text-mint" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.agentUi.allCaughtUp}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.agentUi.reviewClientList}
            </p>
        </div>
    )
}

export function ActionQueueCardSkeleton() {
    return (
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </BrandCard>
    )
}
