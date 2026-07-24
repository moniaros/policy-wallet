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
    const { language, t } = useLanguage()
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
                    <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                    <div className="flex items-center gap-1">
                        {agent.verificationStatus === "verified" && (
                            <ShieldCheck className="h-3 w-3 text-[#22C55E]" />
                        )}
                        <span className="text-kicker text-muted-foreground">
                            {t.agentUi.licensedAgent}
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
                        <h3 className="text-lg font-bold text-foreground truncate">
                            {agent.name}
                        </h3>
                        {agent.verificationStatus === "verified" && (
                            <span className="flex items-center gap-1 rounded-full bg-primary-soft dark:bg-primary/15 px-2 py-0.5 text-kicker font-medium text-[#166534] dark:text-mint">
                                <ShieldCheck className="h-3 w-3" />
                                {t.agentUi.verified}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {agent.agencyName}
                    </p>

                    {/* Contact info */}
                    <div className="mt-3 flex flex-wrap gap-3">
                        {agent.phone && (
                            <a
                                href={`tel:${agent.phone}`}
                                className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-500 hover:text-primary dark:hover:text-mint transition"
                            >
                                <Phone className="h-3.5 w-3.5" />
                                {agent.phone}
                            </a>
                        )}
                        <a
                            href={`mailto:${agent.email}`}
                            className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-500 hover:text-primary dark:hover:text-mint transition"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            {agent.email}
                        </a>
                        {agent.website && (
                            <a
                                href={agent.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-500 hover:text-primary dark:hover:text-mint transition"
                            >
                                <Globe className="h-3.5 w-3.5" />
                                {t.agentUi.website}
                                <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* License footer */}
            {agent.licenseNumber && (
                <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <p className="text-kicker text-neutral-500 dark:text-neutral-500">
                        {t.agentUi.eaeeLicenseNo}: {agent.licenseNumber}
                    </p>
                </div>
            )}
        </div>
    )
}
