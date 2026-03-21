"use client"

import { MobileAppShell } from "@/components/layout/MobileAppShell"
import { useIsMobile } from "@/hooks/useResponsive"
import type { Policy } from "@/components/wallet/types"
import { Mail, MessageSquare, Phone, Globe, ShieldCheck, Building2 } from "lucide-react"

interface AgentBranding {
    agencyName?: string | null
    licenseNumber?: string | null
    logoUrl?: string | null
    brandColor: string
    website?: string | null
    verified: boolean
}

interface AgentClientProps {
    policies: Policy[]
    user: {
        id: string
        name: string
        email: string
        photoUrl?: string
    }
    agent?: {
        id: string
        name: string
        phone: string
        email: string
        company: string
        photoUrl?: string
        branding?: AgentBranding
    }
}

export function AgentClient({ policies, user, agent }: AgentClientProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <MobileAppShell
                policies={policies}
                user={user}
                agent={agent}
            />
        )
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <div className="pw-card rounded-3xl p-8">
                <p className="pw-kicker">My Agent</p>
                {agent ? (
                    <div className="mt-5 space-y-6">
                        {/* Agent branded card */}
                        <div
                            className="rounded-2xl p-6 relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${agent.branding?.brandColor || "#10b981"}15, ${agent.branding?.brandColor || "#10b981"}05)`,
                                borderLeft: `4px solid ${agent.branding?.brandColor || "#10b981"}`,
                            }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar / Logo */}
                                {agent.photoUrl ? (
                                    <img
                                        src={agent.photoUrl}
                                        alt={agent.name}
                                        className="w-14 h-14 rounded-2xl object-cover shadow-lg"
                                    />
                                ) : (
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg"
                                        style={{ backgroundColor: agent.branding?.brandColor || "#10b981" }}
                                    >
                                        {agent.name.charAt(0)}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">
                                            {agent.name}
                                        </h1>
                                        {agent.branding?.verified && (
                                            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            {agent.branding?.agencyName || agent.company || "Insurance advisor"}
                                        </p>
                                    </div>
                                    {agent.branding?.licenseNumber && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            License: {agent.branding.licenseNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <a
                                href={`tel:${agent.phone}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 shadow-lg"
                                style={{ backgroundColor: agent.branding?.brandColor || "#1FDC86" }}
                            >
                                <Phone className="h-4 w-4" />
                                Call
                            </a>
                            <a
                                href={`mailto:${agent.email}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </a>
                            <a
                                href="/help"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Message
                            </a>
                        </div>

                        {/* Website link */}
                        {agent.branding?.website && (
                            <a
                                href={agent.branding.website.startsWith("http") ? agent.branding.website : `https://${agent.branding.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
                                style={{ color: agent.branding.brandColor || "#10b981" }}
                            >
                                <Globe className="w-4 h-4" />
                                {agent.branding.website.replace(/^https?:\/\//, "")}
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-black/30 dark:border-white/30 p-6 text-sm text-black/70 dark:text-white/75">
                        No connected advisor yet. Share a policy to start collaboration.
                    </div>
                )}
            </div>
        </div>
    )
}

// Keep legacy mobile wallet shell rendering for handset experience.
export function AgentMobileClient({ policies, user, agent }: AgentClientProps) {
    return (
        <MobileAppShell
            policies={policies}
            user={user}
            agent={agent}
        />
    )
}
