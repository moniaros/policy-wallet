import { Check, Minus, X } from "lucide-react"
import { pick, type ComparisonVerdict, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * One cell of the comparison table: an icon, a word, and a tone.
 *
 * Extracted from /compare so the homepage can show an excerpt of the same
 * table without a second copy of the verdict palette. A duplicate would be
 * four more hardcoded pairs to keep in step, and the two surfaces would
 * eventually disagree about what "partly" looks like — which is the drift the
 * design system exists to prevent.
 *
 * The icon never carries the meaning alone: every cell renders its word too,
 * or a screen-reader user gets a grid of unlabelled cells and a colour-blind
 * reader gets three shapes.
 */

const VERDICT_ICON: Record<ComparisonVerdict, typeof Check> = {
    yes: Check,
    plus: Check,
    partial: Minus,
    no: X,
}

const VERDICT_TONE: Record<ComparisonVerdict, string> = {
    yes: "bg-status-success-tint text-status-success",
    plus: "bg-status-success-tint text-status-success",
    partial: "bg-status-warning-tint text-status-warning",
    no: "bg-neutral-100 text-muted-foreground dark:bg-slate-800 dark:text-slate-400",
}

const VERDICT_LABEL: Record<ComparisonVerdict, { el: string; en: string }> = {
    yes: { el: "Ναι", en: "Yes" },
    plus: { el: "Ναι, με το Plus", en: "Yes, with Plus" },
    partial: { el: "Εν μέρει", en: "Partly" },
    no: { el: "Όχι", en: "No" },
}

export function Verdict({ value, locale }: { value: ComparisonVerdict; locale: MarketingLocale }) {
    const Icon = VERDICT_ICON[value]
    const label = pick(VERDICT_LABEL[value], locale)

    return (
        <span
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-body-sm font-semibold ${VERDICT_TONE[value]}`}
        >
            <Icon aria-hidden className="h-3.5 w-3.5 flex-shrink-0" />
            {label}
        </span>
    )
}
