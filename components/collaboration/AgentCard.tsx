"use client"

import React from "react"
import { Phone, Globe, Mail, ShieldCheck, ExternalLink } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentCardData, ViewerRole } from "./types"

interface AgentCardProps {
    agent: AgentCardData
    viewerRole: ViewerRole
    compact?: boolean
}

export function AgentCard({ agent, viewerRole, compact }: AgentCardProps) {
    const { language } = useLanguage()
    const initials = agent.name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)

    if (compact) {
        return (
            <div className="flex items-center gap-2.5">
                {agent.logoUrl ? (
                    <img src={agent.logoUrl} alt={agent.agencyName} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: agent.brandColor }}
                    >
                        {initials}
                    </div>
                )}
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</p>
                    <div className="flex items-center gap-1">
                        {agent.verificationStatus === "verified" && (
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {language === "el" ? "Πιστοποιημένος Ασφαλιστής" : "Licensed Agent"}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-5">
            <div className="flex items-start gap-4">
                {/* Avatar / Logo */}
                {agent.logoUrl ? (
                    <img
                        src={agent.logoUrl}
                        alt={agent.agencyName}
                        className="h-14 w-14 rounded-xl object-cover shadow-sm"
                    />
                ) : (
                    <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm"
                        style={{ backgroundColor: agent.brandColor }}
                    >
                        {initials}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {agent.name}
                        </h3>
                        {agent.verificationStatus === "verified" && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                <ShieldCheck className="h-3 w-3" />
                                {language === "el" ? "Πιστοποιημένος" : "Verified"}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {agent.agencyName}
                    </p>

                    {/* Contact info */}
                    <div className="mt-3 flex flex-wrap gap-3">
                        {agent.phone && (
                            <a
                                href={`tel:${agent.phone}`}
                                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                            >
                                <Phone className="h-3.5 w-3.5" />
                                {agent.phone}
                            </a>
                        )}
                        <a
                            href={`mailto:${agent.email}`}
                            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            {agent.email}
                        </a>
                        {agent.website && (
                            <a
                                href={agent.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                            >
                                <Globe className="h-3.5 w-3.5" />
                                {language === "el" ? "Ιστοσελίδα" : "Website"}
                                <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* License footer */}
            {agent.licenseNumber && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {language === "el" ? "Αρ. Μητρώου ΕΑΕΕ" : "EAEE License No."}: {agent.licenseNumber}
                    </p>
                </div>
            )}
        </div>
    )
}
