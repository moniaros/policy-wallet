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
import type { ActionQueueItem, OneTapAction } from "./types"

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
    isLoading?: boolean
}

export function ActionQueueCard({ items, onAction, onViewAll, isLoading }: ActionQueueCardProps) {
    const { language } = useLanguage()

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
                        {language === "el" ? "Ουρά Ενεργειών" : "Action Queue"}
                    </h2>
                    {totalCount > 0 && (
                        <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                            {totalCount}
                        </span>
                    )}
                </div>
                {urgentCount > 0 && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        {urgentCount} {language === "el" ? "επείγοντα" : "urgent"}
                    </span>
                )}
            </div>

            {/* Items */}
            {totalCount === 0 ? (
                <ActionQueueEmpty language={language} />
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
                    className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
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

function ActionQueueEmpty({ language }: { language: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === "el" ? "Όλα ενημερωμένα!" : "All caught up!"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {language === "el"
                    ? "Ελέγξτε τη λίστα πελατών σας"
                    : "Review your client list"}
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
