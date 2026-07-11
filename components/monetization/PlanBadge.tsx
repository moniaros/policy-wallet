"use client"

import { Crown } from "lucide-react"
import type { PlanTier } from "@/types/subscription-entitlements"

const TIER_STYLES: Record<PlanTier, string> = {
    free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    plus: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    pro: "bg-[#1A2420] text-mint dark:bg-mint dark:text-[#1A2420]",
}

const TIER_LABELS: Record<PlanTier, string> = {
    free: "Free",
    plus: "Plus",
    pro: "Pro",
}

/** Small pill showing the user's current plan. */
export function PlanBadge({ tier, className = "" }: { tier: PlanTier; className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${TIER_STYLES[tier]} ${className}`}
        >
            {tier !== "free" && <Crown className="h-3 w-3" />}
            {TIER_LABELS[tier]}
        </span>
    )
}
