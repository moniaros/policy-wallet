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
            <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <p className="text-xs font-black uppercase tracking-widest text-stone-500">My Agent</p>
                {agent ? (
                    <div className="mt-5 space-y-5">
                        <div>
                            <h1 className="text-3xl font-black text-stone-900 dark:text-white">{agent.name}</h1>
                            <p className="text-sm text-stone-500 dark:text-stone-300">{agent.company || "Insurance advisor"}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <a
                                href={`tel:${agent.phone}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            >
                                <Phone className="h-4 w-4" />
                                Call
                            </a>
                            <a
                                href={`mailto:${agent.email}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </a>
                            <a
                                href="/help"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Message
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
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
