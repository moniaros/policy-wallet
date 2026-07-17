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
import { BrandCard } from "@/components/ui/brand/BrandCard"
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

const INTERACTION_COLORS: Record<string, string> = {
    invite_sent: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
    invite_opened: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
    policy_uploaded: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
    questionnaire_sent: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
    opportunity_contacted: "text-amber-500 bg-amber-50 dark:bg-amber-900/30",
    reminder_sent: "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
    message_sent: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
    note_added: "text-neutral-500 bg-neutral-50 dark:bg-neutral-800",
    relationship_created: "text-primary bg-primary-soft dark:bg-primary/15 dark:text-mint",
}

interface ClientActivityTabProps {
    interactions: Interaction[]
    customer: Customer
}

export function ClientActivityTab({ interactions, customer }: ClientActivityTabProps) {
    const { language, t } = useLanguage()

    if (interactions.length === 0) {
        return (
            <BrandCard className="p-8">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Clock className="h-5 w-5 text-neutral-500" />
                    </div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {language === "el"
                            ? "Δεν υπάρχει δραστηριότητα ακόμα"
                            : "No activity yet"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                        {language === "el"
                            ? "Ξεκινήστε αλληλεπιδρώντας με τον πελάτη"
                            : "Start by interacting with this client"}
                    </p>
                </div>
            </BrandCard>
        )
    }

    return (
        <BrandCard className="p-5">
            <h3 className="text-base font-bold text-foreground mb-4">
                {t.agentUi.activityHistory}
            </h3>
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />

                <div className="space-y-4">
                    {interactions.map((interaction, i) => {
                        const Icon = INTERACTION_ICONS[interaction.type] || Clock
                        const colorClass = INTERACTION_COLORS[interaction.type] || "text-neutral-500 bg-neutral-50 dark:bg-neutral-800"
                        const [textColor, bgColor] = colorClass.split(" ")

                        return (
                            <div key={interaction.id} className="relative flex items-start gap-4 pl-1">
                                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor} ${colorClass}`}>
                                    <Icon className={`h-4 w-4`} />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-sm text-foreground">
                                        {interaction.message}
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        {formatRelativeDate(interaction.timestamp, language)}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </BrandCard>
    )
}
