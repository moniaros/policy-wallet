"use client"

import { MobileAppShell } from "@/components/layout/MobileAppShell"
import { useIsMobile } from "@/hooks/useResponsive"
import type { Policy } from "@/components/wallet/types"
import { Mail, MessageSquare, Phone } from "lucide-react"

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
                    <div className="mt-5 space-y-5">
                        <div>
                            <h1 className="text-3xl font-semibold text-black dark:text-white">{agent.name}</h1>
                            <p className="text-sm text-black/55 dark:text-white/65">{agent.company || "Insurance advisor"}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <a
                                href={`tel:${agent.phone}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1FDC86]/40 bg-[#1FDC86] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#19b870]"
                            >
                                <Phone className="h-4 w-4" />
                                Call
                            </a>
                            <a
                                href={`mailto:${agent.email}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 dark:border-white/20 px-4 py-3 text-sm font-semibold text-black dark:text-white transition hover:bg-black/5 dark:hover:bg-white/10"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </a>
                            <a
                                href="/help"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 dark:border-white/20 px-4 py-3 text-sm font-semibold text-black dark:text-white transition hover:bg-black/5 dark:hover:bg-white/10"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Message
                            </a>
                        </div>
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
