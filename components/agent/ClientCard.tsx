"use client"

import React from "react"
import { ChevronRight, Shield, Clock, UserPlus, AlertTriangle } from "lucide-react"
import { EmptyState, CustomerPreviewRow } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRelationshipScoreDotColor } from "@/lib/agent/health-score"
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
    const dotColor = getRelationshipScoreDotColor(client.healthScore)

    return (
        <button
            type="button"
            onClick={() => onClick(client.id)}
            className="pw-subcard flex min-h-11 w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors"
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
                        {getInitials(client.name, client.surname)}
                    </div>
                )}
                {/* Health score dot */}
                {/* Reads as a risk indicator sitting on the client's face. It is a
                    book-management signal, so it says so — and it is not the
                    protection score rendered two lines below. */}
                <span
                    role="img"
                    aria-label={`${t.agentUi.healthScore}: ${client.healthScore}`}
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${dotColor}`}
                    title={`${t.agentUi.healthScore}: ${client.healthScore}`}
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                    {client.name} {client.surname}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-caption text-muted-foreground">
                        <Shield className="h-3 w-3" aria-hidden="true" />
                        {client.policyCount} {t.agentUi.policiesAbbr}
                    </span>
                    {client.nextActionDue && (
                        <span className="flex items-center gap-1 text-caption text-status-warning">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {client.nextActionLabel || formatRelativeDate(client.nextActionDue, language)}
                        </span>
                    )}
                </div>
            </div>

            {/* B1.7 (PW-TRANSPARENCY-02): the protection score is gone from this
                card. What stays is a COUNT of open findings — a number the advisor
                can open and check, not a grade — with its subject named for
                assistive tech, since «4» beside an icon has none. */}
            {(client.gapCount ?? 0) > 0 && (
                <span
                    className="mr-1 flex shrink-0 items-center gap-0.5 text-caption font-semibold tabular-nums text-status-danger"
                    data-count="client.openGapCount"
                >
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    {client.gapCount}
                    <span className="sr-only"> {t.agentUi.openFindingsLabel}</span>
                </span>
            )}

            {/* B1.5: how many of this client's policies no rule can assess yet.
                Text, not a tick's absence — a zero gap count over unassessed
                policies must not read as a clean book. */}
            {(client.unassessedPolicyCount ?? 0) > 0 && (
                <span className="mr-1 max-w-[9rem] shrink-0 text-caption leading-snug text-muted-foreground" data-count="client.unassessedPolicyCount">
                    {client.unassessedPolicyCount === 1
                        ? t.agentUi.unassessedPoliciesOne
                        : t.agentUi.unassessedPoliciesMany.replace("{count}", String(client.unassessedPolicyCount))}
                </span>
            )}

            {/* Arrow */}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                ctaVariant="soft"
                className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
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
                        <div className="mb-2 flex items-center gap-2 px-1">
                            <span className={`h-2 w-2 rounded-full ${display.dotColor}`} aria-hidden="true" />
                            <h3 className="text-caption font-semibold text-foreground">
                                {display.label}
                            </h3>
                            <span className="text-caption tabular-nums text-muted-foreground">
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
