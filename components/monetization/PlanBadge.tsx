"use client"

import { Crown } from "lucide-react"
import type { PlanTier } from "@/types/subscription-entitlements"

const TIER_STYLES: Record<PlanTier, string> = {
    free: "bg-muted text-muted-foreground",
    plus: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    pro: "bg-primary text-primary-foreground",
}

// Display labels. NOTE the relabel-in-place mapping: code key `plus` is the
// €2.99 "Starter" tier; code key `pro` is the €7.99 "Plus" (AI) tier.
const TIER_LABELS: Record<PlanTier, string> = {
    free: "Free",
    plus: "Starter",
    pro: "Plus",
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
