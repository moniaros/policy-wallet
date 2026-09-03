import { calendarDaysUntil } from '@/lib/policy-status'
import { formatDate, resolveLocale } from '@/lib/i18n/format'
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
 * Short date, in the reader's language and pinned to Athens.
 *
 * Was `formatDateGreek`, which hardcoded `el-GR` whatever language the agent had
 * chosen — so an English-speaking agent read a document-request due date as
 * "15 Ιουν 2026" — and left the timezone to the runtime, the mismatch class
 * lib/i18n/format.ts exists to end (UTC on the server, Athens in the browser).
 */
export function formatDateShort(dateStr: string, locale: "en" | "el" = "el"): string {
    return formatDate(dateStr, locale, { day: "numeric", month: "short", year: "numeric" })
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/**
 * A date relative to now — "πριν 2 ημέρες", "σε 3 ημέρες", "αύριο".
 *
 * The past-only version returned "Just now" / «Μόλις τώρα» for anything in the
 * FUTURE, because `now - date` goes negative and the first bucket is
 * `diffMins < 1`. Two callers pass future dates — the agent action queue's due
 * column (`ActionQueueCard`) and the client card's next action (`ClientCard`) —
 * so every task due next week read as due this instant. On a work queue, that is
 * the most urgent label the UI has, applied to the least urgent items.
 *
 * Intl.RelativeTimeFormat handles the sign, and with `numeric: "auto"` also the
 * Greek forms a hand-rolled version gets wrong: «χθες», «αύριο», «πριν 1 λεπτό»
 * rather than «πριν 1 λεπτά».
 */
export function formatRelativeDate(dateStr: string, locale: "en" | "el" = "el"): string {
    const target = new Date(dateStr).getTime()
    if (Number.isNaN(target)) return "—"
    const diffMs = target - Date.now()
    const abs = Math.abs(diffMs)

    // Beyond a week either way a calendar date is more use than a count.
    if (abs >= 7 * DAY_MS) return formatDateShort(dateStr, locale)

    const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: "auto" })
    if (abs < HOUR_MS) {
        const minutes = Math.round(diffMs / MINUTE_MS)
        // Rounding to zero inside the smallest unit is genuinely "now".
        if (minutes === 0) return locale === "el" ? "Μόλις τώρα" : "Just now"
        return rtf.format(minutes, "minute")
    }
    if (abs < DAY_MS) return rtf.format(Math.round(diffMs / HOUR_MS), "hour")
    return rtf.format(Math.round(diffMs / DAY_MS), "day")
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
            color: "text-status-danger",
            bgColor: "bg-status-danger-tint",
            borderColor: "border-status-danger-edge",
            dotColor: "bg-status-danger",
        },
        on_track: {
            label: locale === "el" ? "Σε καλή πορεία" : "On Track",
            color: "text-status-success",
            bgColor: "bg-status-success-tint",
            borderColor: "border-border",
            dotColor: "bg-status-success",
        },
        inactive: {
            label: locale === "el" ? "Ανενεργοί" : "Inactive",
            color: "text-muted-foreground",
            bgColor: "bg-muted",
            borderColor: "border-border",
            dotColor: "bg-muted-foreground/50",
        },
    }
    return tiers[tier]
}
