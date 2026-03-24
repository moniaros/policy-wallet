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
    const { language } = useLanguage()

    return (
        <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-4">
            {licenseNumber && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {language === "el" ? "Αρ. ΕΑΕΕ" : "EAEE No."}: {licenseNumber}
                </p>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {language === "el" ? "Τελευταία ενημέρωση" : "Last updated"}: {formatRelativeDate(lastUpdated, language)}
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
            style: "text-slate-900 dark:text-white",
        },
        pending: {
            icon: Hourglass,
            label: { en: "Pending verification", el: "Εκκρεμεί επαλήθευση" },
            style: "text-slate-500 italic dark:text-slate-400",
        },
        agent_suggested: {
            icon: Lightbulb,
            label: { en: "Agent suggested", el: "Πρόταση ασφαλιστή" },
            style: "text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
        },
    }

    const config = configs[confidence]
    const Icon = config.icon

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${config.style} ${className || ""}`}>
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {verified && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
            {insurerName}
        </span>
    )
}
