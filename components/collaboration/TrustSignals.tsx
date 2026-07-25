"use client"

import React from "react"
import { ShieldCheck, Clock, Lightbulb, Hourglass, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate } from "@/lib/agent/format"
import type { DataConfidence, TrustSignalData } from "./types"

interface TrustSignalsFooterProps {
    licenseNumber?: string | null
    lastUpdated: string
}

export function TrustSignalsFooter({ licenseNumber, lastUpdated }: TrustSignalsFooterProps) {
    const { language, t } = useLanguage()

    return (
        <div className="flex items-center justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-3 mt-4">
            {licenseNumber && (
                <p className="text-kicker text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t.agentUi.eaeeNo}: {licenseNumber}
                </p>
            )}
            <p className="text-kicker text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t.agentUi.lastUpdated}: {formatRelativeDate(lastUpdated, language)}
            </p>
        </div>
    )
}

interface DataConfidenceBadgeProps {
    confidence: DataConfidence
    className?: string
}

export function DataConfidenceBadge({ confidence, className }: DataConfidenceBadgeProps) {
    const { language } = useLanguage()

    const configs: Record<DataConfidence, {
        icon: React.ElementType
        label: { en: string; el: string }
        style: string
    }> = {
        confirmed: {
            icon: CheckCircle2,
            label: { en: "Confirmed", el: "Επιβεβαιωμένο" },
            style: "text-foreground",
        },
        pending: {
            icon: Hourglass,
            label: { en: "Pending verification", el: "Εκκρεμεί επαλήθευση" },
            style: "text-neutral-500 italic dark:text-neutral-400",
        },
        agent_suggested: {
            icon: Lightbulb,
            label: { en: "Advisor suggested", el: "Πρόταση συμβούλου" },
            style: "text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
        },
    }

    const config = configs[confidence]
    const Icon = config.icon

    return (
        <span className={`inline-flex items-center gap-1 text-kicker font-medium ${config.style} ${className || ""}`}>
            <Icon className="h-3 w-3" />
            {language === "el" ? config.label.el : config.label.en}
        </span>
    )
}

interface VerifiedInsurerBadgeProps {
    insurerName: string
    verified?: boolean
}

export function VerifiedInsurerBadge({ insurerName, verified = true }: VerifiedInsurerBadgeProps) {
    const { language } = useLanguage()

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {verified && <ShieldCheck className="h-3 w-3 text-[#22C55E]" />}
            {insurerName}
        </span>
    )
}
