"use client"

import Link from "next/link"
import { Crown } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentTier } from "@/types/subscription-entitlements"
import { AGENT_TIER_HIERARCHY } from "@/lib/subscription-entitlements"

const TIER_LABELS: Record<AgentTier, { en: string; el: string }> = {
    agent_free: { en: "Free", el: "Δωρεάν" },
    agent_starter: { en: "Starter", el: "Starter" },
    agent_pro: { en: "Pro", el: "Pro" },
    agency: { en: "Agency", el: "Agency" },
}

interface AgentPlanGateProps {
    currentTier: AgentTier
    requiredTier: AgentTier
    featureLabel?: string
    children: React.ReactNode
}

export function AgentPlanGate({ currentTier, requiredTier, featureLabel, children }: AgentPlanGateProps) {
    const { language, t } = useLanguage()

    if (AGENT_TIER_HIERARCHY[currentTier] >= AGENT_TIER_HIERARCHY[requiredTier]) {
        return <>{children}</>
    }

    const tierLabel = language === "el"
        ? TIER_LABELS[requiredTier].el
        : TIER_LABELS[requiredTier].en

    return (
        <div className="relative">
            <div aria-hidden="true" className="select-none blur-sm pointer-events-none">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 bg-white/90 px-6 py-5 text-center shadow-lg backdrop-blur-sm dark:border-white/15 dark:bg-black/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Crown className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    </div>

                    {featureLabel && (
                        <p className="text-sm font-medium text-black/60 dark:text-white/60">
                            {featureLabel}
                        </p>
                    )}

                    <p className="text-xs text-black/60 dark:text-white/50">
                        {language === "el"
                            ? `Απαιτεί πλάνο ${tierLabel}`
                            : `Requires ${tierLabel} plan`}
                    </p>

                    <Link
                        href="/agent/pricing"
                        className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white dark:text-[#1A2420] transition-colors hover:bg-primary-hover"
                    >
                        <Crown className="h-3.5 w-3.5" />
                        {t.agentUi.upgrade}
                    </Link>
                </div>
            </div>
        </div>
    )
}
