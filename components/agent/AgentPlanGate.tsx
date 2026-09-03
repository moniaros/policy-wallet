"use client"

import Link from "next/link"
import { Crown } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentTier } from "@/types/subscription-entitlements"
// plan-defaults, NOT subscription-entitlements: the latter imports the Prisma
// client, which a "use client" module drags into the browser bundle.
import { isAgentTierSufficient } from "@/lib/pricing/plan-defaults"

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

    if (isAgentTierSufficient(currentTier, requiredTier)) {
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
                <div className="pw-card flex flex-col items-center gap-3 px-6 py-5 text-center shadow-lg">
                    <span className="pw-card-chip" aria-hidden="true">
                        <Crown className="h-4 w-4" strokeWidth={1.75} />
                    </span>

                    {featureLabel && (
                        <p className="text-sm font-semibold text-foreground">
                            {featureLabel}
                        </p>
                    )}

                    <p className="text-caption text-muted-foreground">
                        {language === "el"
                            ? `Απαιτεί πλάνο ${tierLabel}`
                            : `Requires ${tierLabel} plan`}
                    </p>

                    {/* Soft, not primary: an upgrade is never the page's one action. */}
                    <Link href="/agent/pricing" className="pw-soft-button mt-1">
                        <Crown className="h-4 w-4" aria-hidden="true" />
                        {t.agentUi.upgrade}
                    </Link>
                </div>
            </div>
        </div>
    )
}
