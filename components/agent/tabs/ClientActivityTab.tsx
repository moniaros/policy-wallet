"use client"

import React from "react"
import {
    Mail,
    Upload,
    Send,
    UserPlus,
    FileText,
    MessageSquare,
    Clock,
    StickyNote,
    Shield,
} from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate } from "@/lib/agent/format"
import type { Interaction, Customer } from "../types"

const INTERACTION_ICONS: Record<string, React.ElementType> = {
    invite_sent: Mail,
    invite_opened: UserPlus,
    policy_uploaded: Upload,
    questionnaire_sent: Send,
    opportunity_contacted: FileText,
    reminder_sent: Clock,
    message_sent: MessageSquare,
    note_added: StickyNote,
    relationship_created: Shield,
}

interface ClientActivityTabProps {
    interactions: Interaction[]
    customer: Customer
}

export function ClientActivityTab({ interactions, customer }: ClientActivityTabProps) {
    const { language, t } = useLanguage()

    if (interactions.length === 0) {
        return (
            <EmptyState
                icon={Clock}
                headline={t.emptyStates.clientActivity.headline}
                description={t.emptyStates.clientActivity.description}
            />
        )
    }

    return (
        <section className="pw-card pw-pad">
            <CardHead
                as="h3"
                icon={Clock}
                title={t.agentUi.activityHistory}
                meta={<span className="tabular-nums">{interactions.length}</span>}
            />
            {/* Rows on the sunken surface — chip · what happened · when. The chip
                stays neutral: an interaction is a record, not a verdict. */}
            <ul className="mt-4 space-y-2">
                {interactions.map((interaction) => {
                    const Icon = INTERACTION_ICONS[interaction.type] || Clock
                    return (
                        <li key={interaction.id} className="pw-subcard flex items-start gap-3 p-3">
                            <span className="pw-card-chip" aria-hidden="true">
                                <Icon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground">
                                    {interaction.message}
                                </p>
                                <p className="mt-0.5 text-caption text-muted-foreground">
                                    {formatRelativeDate(interaction.timestamp, language)}
                                </p>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
