"use client"

import { Crown } from "lucide-react"
import type { PlanTier } from "@/types/subscription-entitlements"
import { planTierName } from "@/lib/subscription-copy"
import { useLanguage } from "@/contexts/LanguageContext"

const TIER_STYLES: Record<PlanTier, string> = {
    free: "bg-muted text-muted-foreground",
    plus: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    pro: "bg-primary text-primary-foreground",
}

// Labels come from `planTierName`, never from a map here. This file used to
// hold its own — free/Starter/Plus — which made «Plus» the badge for `pro`
// while every other surface calls `plus` «Plus». One word, two plans.

/** Small pill showing the user's current plan. */
export function PlanBadge({ tier, className = "" }: { tier: PlanTier; className?: string }) {
    const { language } = useLanguage()
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-widest ${TIER_STYLES[tier]} ${className}`}
        >
            {tier !== "free" && <Crown className="h-3 w-3" />}
            {planTierName(tier, language)}
        </span>
    )
}
