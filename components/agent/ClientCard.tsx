"use client"

import React from "react"
import { ChevronRight, Shield, Clock, UserPlus, AlertTriangle } from "lucide-react"
import { EmptyState, CustomerPreviewRow } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { getHealthScoreDotColor } from "@/lib/agent/health-score"
import { formatRelativeDate, getUrgencyTierDisplay } from "@/lib/agent/format"
import type { ClientCardData, UrgencyTier } from "./types"

interface ClientCardProps {
    client: ClientCardData
    onClick: (clientId: string) => void
}

function getInitials(name: string, surname: string): string {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

export function ClientCard({ client, onClick }: ClientCardProps) {
    const { language, t } = useLanguage()
    const dotColor = getHealthScoreDotColor(client.healthScore)

    return (
        <button
            type="button"
            onClick={() => onClick(client.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-3 text-left transition-all hover:shadow-md hover:border-primary/40 dark:hover:border-mint/40 cursor-pointer"
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                {client.avatar ? (
                    <img
                        src={client.avatar}
                        alt={`${client.name} ${client.surname}`}
                        className="h-10 w-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary dark:bg-primary/15 dark:text-mint">
                        {getInitials(client.name, client.surname)}
                    </div>
                )}
                {/* Health score dot */}
                <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${dotColor}`}
                    title={`${t.agentUi.healthScore}: ${client.healthScore}`}
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                    {client.name} {client.surname}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        {client.policyCount} {t.agentUi.policiesAbbr}
                    </span>
                    {client.nextActionDue && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            {client.nextActionLabel || formatRelativeDate(client.nextActionDue, language)}
                        </span>
                    )}
                </div>
            </div>

            {/* Protection score badge */}
            {client.protectionScore != null && (
                <div className="shrink-0 flex flex-col items-center gap-0.5 mr-1">
                    <span
                        className={`text-xs font-bold ${
                            client.protectionScore >= 70
                                ? "text-[#166534] dark:text-mint"
                                : client.protectionScore >= 40
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                        }`}
                    >
                        {client.protectionScore}
                    </span>
                    <span className="text-[9px] text-neutral-400">/100</span>
                    {(client.gapCount ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-red-500">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {client.gapCount}
                        </span>
                    )}
                </div>
            )}

            {/* Arrow */}
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
        </button>
    )
}

// ── Grouped client list by urgency tier ────────────────────────────────

interface ClientListGroupedProps {
    clients: {
        needs_attention: ClientCardData[]
        on_track: ClientCardData[]
        inactive: ClientCardData[]
    }
    onClientClick: (clientId: string) => void
    onInviteClient?: () => void
    isLoading?: boolean
}

export function ClientListGrouped({ clients, onClientClick, onInviteClient, isLoading }: ClientListGroupedProps) {
    const { language, t } = useLanguage()

    if (isLoading) return <ClientListGroupedSkeleton />

    const tiers: UrgencyTier[] = ["needs_attention", "on_track", "inactive"]
    const allEmpty = tiers.every((tier) => clients[tier].length === 0)

    if (allEmpty) {
        return (
            <EmptyState
                icon={UserPlus}
                headline={t.emptyStates.clients.headline}
                description={t.emptyStates.clients.description}
                cta={onInviteClient ? { label: t.agentUi.inviteClient, onClick: onInviteClient } : undefined}
                previewLabel={t.emptyStates.example}
                preview={
                    <CustomerPreviewRow
                        name={t.emptyStates.clients.exampleName}
                        meta={t.emptyStates.clients.exampleMeta}
                        initial={t.emptyStates.clients.exampleName.charAt(0)}
                    />
                }
            />
        )
    }

    return (
        <div className="space-y-4">
            {tiers.map((tier) => {
                const tierClients = clients[tier]
                if (tierClients.length === 0) return null
                const display = getUrgencyTierDisplay(tier, language)
                return (
                    <div key={tier}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className={`h-2 w-2 rounded-full ${display.dotColor}`} />
                            <h3 className={`text-xs font-semibold uppercase tracking-wider ${display.color}`}>
                                {display.label}
                            </h3>
                            <span className="text-xs text-neutral-400">
                                ({tierClients.length})
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {tierClients.map((client) => (
                                <ClientCard
                                    key={client.id}
                                    client={client}
                                    onClick={onClientClick}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function ClientListGroupedSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2].map((group) => (
                <div key={group}>
                    <Skeleton className="h-3 w-28 mb-2 ml-1" />
                    <div className="space-y-1.5">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
