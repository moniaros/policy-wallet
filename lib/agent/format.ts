import { calendarDaysUntil } from '@/lib/policy-status'
import type { Customer } from "@/components/agent/types"
import type { UrgencyTier } from "@/components/agent/types"

/**
 * Format currency in compact K notation.
 * e.g., 50000 -> "€50K", 1200 -> "€1.2K", 500 -> "€500"
 */
export function formatCurrencyCompact(amount: number, locale: "en" | "el" = "el"): string {
    if (Math.abs(amount) >= 1_000_000) {
        const millions = amount / 1_000_000
        return `€${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
    }
    if (Math.abs(amount) >= 1_000) {
        const thousands = amount / 1_000
        return `€${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`
    }
    // toLocaleString defaults to THREE fraction digits, so a €15.7305 commission
    // rendered as "€15,731" — and in Greek the comma is the decimal separator, so
    // an agent read their renewals-at-risk as fifteen thousand euros instead of
    // fifteen. Money is always two decimals, matching formatCurrencyFull.
    return `€${amount.toLocaleString(locale === "el" ? "el-GR" : "en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

/**
 * Format currency in full notation for detail views.
 */
export function formatCurrencyFull(amount: number, locale: "en" | "el" = "el"): string {
    return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-GB", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    }).format(amount)
}

/**
 * Format a date in Greek locale.
 */
export function formatDateGreek(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString("el-GR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

/**
 * Format a date relative to now (e.g., "2 days ago", "πριν 2 ημέρες").
 */
export function formatRelativeDate(dateStr: string, locale: "en" | "el" = "el"): string {
    const now = Date.now()
    const date = new Date(dateStr).getTime()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMs / 3_600_000)
    const diffDays = Math.floor(diffMs / 86_400_000)

    if (locale === "el") {
        if (diffMins < 1) return "Μόλις τώρα"
        if (diffMins < 60) return `πριν ${diffMins} λεπτά`
        if (diffHours < 24) return `πριν ${diffHours} ώρες`
        if (diffDays < 7) return `πριν ${diffDays} ημέρες`
        return formatDateGreek(dateStr)
    }

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    })
}

/**
 * Classify a customer into an urgency tier based on their state.
 */
export function classifyUrgencyTier(customer: {
    activationStatus: string
    openGapsCount: number
    lastInteractionDate: string | null
    policyCount: number
    policies?: Array<{ endDate: string; status: string }>
}): UrgencyTier {
    // Inactive: not activated or no interaction in 90+ days
    if (customer.activationStatus === "inactive") return "inactive"
    if (customer.activationStatus === "invited") {
        const daysSinceInteraction = customer.lastInteractionDate
            ? Math.floor((Date.now() - new Date(customer.lastInteractionDate).getTime()) / 86_400_000)
            : 999
        if (daysSinceInteraction > 90) return "inactive"
    }

    // Needs Attention: has gaps, expiring policies, or no policies
    if (customer.openGapsCount > 0) return "needs_attention"
    if (customer.policyCount === 0) return "needs_attention"

    if (customer.policies?.some((p) => {
        const daysToExpiry = calendarDaysUntil(new Date(p.endDate), new Date())
        return daysToExpiry <= 30 && daysToExpiry >= 0
    })) {
        return "needs_attention"
    }

    return "on_track"
}

/**
 * Get display info for an urgency tier.
 */
export function getUrgencyTierDisplay(tier: UrgencyTier, locale: "en" | "el" = "el") {
    const tiers = {
        needs_attention: {
            label: locale === "el" ? "Χρειάζεται προσοχή" : "Needs Attention",
            color: "text-red-700 dark:text-red-400",
            bgColor: "bg-red-50 dark:bg-red-950/30",
            borderColor: "border-red-200 dark:border-red-900/30",
            dotColor: "bg-red-500",
        },
        on_track: {
            label: locale === "el" ? "Σε καλή πορεία" : "On Track",
            color: "text-emerald-700 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            borderColor: "border-emerald-200 dark:border-emerald-900/30",
            dotColor: "bg-emerald-500",
        },
        inactive: {
            label: locale === "el" ? "Ανενεργοί" : "Inactive",
            color: "text-slate-500 dark:text-slate-400",
            bgColor: "bg-slate-50 dark:bg-slate-900/30",
            borderColor: "border-slate-200 dark:border-slate-800",
            dotColor: "bg-slate-400",
        },
    }
    return tiers[tier]
}
