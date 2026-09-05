"use client"

import React, { useState } from "react"
import { SeverityCaveat } from "@/components/gaps/SeverityCaveat"
import {
    AlertTriangle,
    Calendar,
    Clock,
    RefreshCw,
    UserPlus,
    Eye,
    ChevronRight,
} from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { formatRelativeDate, formatCurrencyCompact } from "@/lib/agent/format"
import type { ActionQueueItem, ActionQueueItemType, GapsSummary, OneTapAction } from "./types"

const ACTION_ICONS: Record<ActionQueueItemType, React.ElementType> = {
    expiring_policy: Calendar,
    incomplete_profile: UserPlus,
}

const ONE_TAP_LABELS: Record<OneTapAction, { en: string; el: string }> = {
    renew: { en: "Renew", el: "Ανανέωση" },
    complete_profile: { en: "Complete", el: "Συμπλήρωση" },
}

/** Urgency tints the row's GLYPH on the status tokens — a whole tinted row per item read as five alarms. */

// Days-to-expiry urgency (the queue's own tiers) — never a finding's severity.
function getUrgencyStyles(urgency: "low" | "medium" | "high") {
    if (urgency === "high") return "text-status-danger"
    if (urgency === "medium") return "text-status-warning"
    return "text-status-info"
}

interface ActionQueueCardProps {
    items: ActionQueueItem[]
    /** Total agent commission at stake across the queue ("€X in renewals at risk"). */
    revenueAtRisk?: number
    onAction: (item: ActionQueueItem) => void
    onGapClientClick?: (clientId: string) => void
    isLoading?: boolean
    gapsSummary?: GapsSummary | null
    /** Whether the agent has any clients — drives the empty state (activation
     *  prompt vs. "all caught up"). */
    hasClients?: boolean
    /** Invite CTA used by the no-clients activation empty state. */
    onInviteClient?: () => void
}

const COLLAPSED_COUNT = 5

/**
 * Builds the queue line in the reader's language. The server ships an English
 * `description` built from the raw lob enum; rendering it directly put "motor
 * expires 25/5/2027" in front of a Greek agent on their primary work surface.
 */
function describeItem(
    item: ActionQueueItem,
    language: string,
    t: any
): string {
    const lang: "el" | "en" = language === "el" ? "el" : "en"
    if (item.type === "expiring_policy" && item.lineOfBusiness) {
        const branch = normalizeBranch(item.lineOfBusiness)
        return t.agentDashboard.queueExpiring
            .replace("{lob}", branch.label[lang])
            .replace("{date}", new Date(item.dueDate).toLocaleDateString(lang === "el" ? "el-GR" : "en-GB"))
    }
    if (item.type === "incomplete_profile") return t.agentDashboard.queueNoPolicies
    return item.description
}

export function ActionQueueCard({ items, revenueAtRisk, onAction, onGapClientClick, isLoading, gapsSummary, hasClients = false, onInviteClient }: ActionQueueCardProps) {
    const { language, t } = useLanguage()
    const [showAll, setShowAll] = useState(false)

    if (isLoading) return <ActionQueueCardSkeleton />

    const urgentCount = items.filter((i) => i.urgency === "high").length
    const totalCount = items.length

    return (
        <BrandCard className="pw-pad">
            {/* Header — the count is a fact (a grey pill); only «N επείγοντα» carries a tone. */}
            <div className="mb-4">
                <CardHead
                    icon={AlertTriangle}
                    title={t.agentUi.actionQueue}
                    meta={
                        <>
                            {totalCount > 0 && (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular-nums text-foreground">
                                    {totalCount}
                                </span>
                            )}
                            {urgentCount > 0 && (
                                <span className="text-caption font-semibold text-status-danger">
                                    {urgentCount} {t.agentUi.urgent}
                                </span>
                            )}
                        </>
                    }
                />
                {revenueAtRisk !== undefined && revenueAtRisk > 0 && (
                    <p className="mt-2 text-caption font-semibold text-status-warning">
                        {formatCurrencyCompact(revenueAtRisk, language)} {t.agentDashboard.inRenewalsAtRisk}
                    </p>
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
                <ActionQueueEmpty t={t} hasClients={hasClients} onInviteClient={onInviteClient} />
            ) : (
                <div className="space-y-2">
                    {(showAll ? items : items.slice(0, COLLAPSED_COUNT)).map((item) => {
                        const Icon = ACTION_ICONS[item.type] || Clock
                        const label = ONE_TAP_LABELS[item.oneTapAction]
                        const description = describeItem(item, language, t)
                        return (
                            <div
                                key={item.id}
                                className="pw-subcard flex items-center gap-3 p-3"
                            >
                                <Icon className={`h-4 w-4 shrink-0 ${getUrgencyStyles(item.urgency)}`} aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {item.clientName}
                                    </p>
                                    <p className="truncate text-caption text-muted-foreground">
                                        {description}
                                    </p>
                                </div>
                                <span className="whitespace-nowrap text-caption text-muted-foreground">
                                    {formatRelativeDate(item.dueDate, language)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onAction(item)}
                                    className="pw-soft-button !min-h-9 shrink-0 !bg-card !px-3 text-caption"
                                >
                                    {language === "el" ? label.el : label.en}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* The queue rendered items.slice(0, 5) and gated its only "view all"
                control behind an onViewAll prop no caller passed. The count badge
                still showed the true total, so an agent with 12 renewals at risk
                was told there were 12, shown 5, and given no route to the other 7.
                There is no full-queue page to link to — the queue is derived on
                this dashboard — so it expands in place instead. */}
            {totalCount > COLLAPSED_COUNT && (
                <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                >
                    {showAll
                        ? t.agentDashboard.queueShowFewer
                        : t.agentDashboard.queueShowAll.replace("{count}", String(totalCount))}
                    <ChevronRight className={`h-3 w-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
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
        <div className="mb-3 rounded-xl bg-status-danger-tint p-3">
            <div className="mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-status-danger" aria-hidden="true" />
                <p className="text-sm font-semibold text-status-danger">
                    {language === "el"
                        ? `${criticalClientsCount} πελάτ${criticalClientsCount === 1 ? "ης" : "ες"} με κρίσιμα κενά`
                        : `${criticalClientsCount} client${criticalClientsCount === 1 ? "" : "s"} with critical gaps`}
                    {highClientsCount > 0 && (
                        <span className="font-normal opacity-80">
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
                            className="flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-caption transition-colors hover:bg-card/70"
                        >
                            <span className="truncate font-semibold text-foreground">
                                {client.clientName}
                            </span>
                            <span className="ml-2 shrink-0 tabular-nums text-status-danger">
                                {client.criticalGaps > 0 && (
                                    <span className="inline-flex items-center gap-0.5">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-danger" />
                                        {client.criticalGaps}
                                    </span>
                                )}
                                {client.highGaps > 0 && (
                                    <span className="ml-2 inline-flex items-center gap-0.5">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-warning" />
                                        {client.highGaps}
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {/* The loudest severity claim in the product: an ADVISOR reads
                "N clients with critical gaps" and may repeat it to a customer.
                Gate 3b is not passed, so it does not go out unqualified. */}
            <SeverityCaveat lang={language === "el" ? "el" : "en"} className="mt-2 mb-0" />
        </div>
    )
}

function ActionQueueEmpty({ t, hasClients, onInviteClient }: { t: any; hasClients: boolean; onInviteClient?: () => void }) {
    // With zero clients, "All caught up" reads as false success — the agent has
    // done nothing. Show an activation prompt to invite the first client instead.
    if (!hasClients) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                    {t.agentUi.noClientsTitle}
                </p>
                <p className="mt-1 text-caption text-muted-foreground">
                    {t.agentUi.inviteFirstClientPrompt}
                </p>
                {/* Soft, not primary: the page header already carries the one
                    primary («Νέος πελάτης»), and this is the same action. */}
                {onInviteClient && (
                    <button
                        type="button"
                        onClick={onInviteClient}
                        className="pw-soft-button mt-4"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t.agentUi.inviteClient}
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <RefreshCw className="h-5 w-5 text-status-success" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">
                {t.agentUi.allCaughtUp}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
                {t.agentUi.reviewClientList}
            </p>
        </div>
    )
}

export function ActionQueueCardSkeleton() {
    return (
        <BrandCard className="pw-pad">
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
