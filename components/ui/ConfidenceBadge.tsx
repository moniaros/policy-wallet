import { confidenceLevel } from '@/lib/wallet/policy-review'

/**
 * Per-field AI-extraction confidence chip: high / medium / low with the
 * exact percentage, or a "not found" chip for missing fields. Shared
 * primitive (extracted from PolicyReviewScreen) — copy arrives pre-resolved.
 */
export function ConfidenceBadge({
    score,
    missing = false,
    labels,
}: {
    score: number | undefined
    missing?: boolean
    labels: { high: string; medium: string; low: string; notFound: string }
}) {
    const level = confidenceLevel(score)

    if (level === "unknown") {
        if (!missing) return null
        return (
            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-kicker font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {labels.notFound}
            </span>
        )
    }

    const styles =
        level === "high"
            ? "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
            : level === "medium"
                ? "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
    const label = level === "high" ? labels.high : level === "medium" ? labels.medium : labels.low

    return (
        <span
            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-kicker font-semibold ${styles}`}
            title={`${Math.round(score as number)}%`}
            aria-label={`${label} (${Math.round(score as number)}%)`}
        >
            {label} · {Math.round(score as number)}%
        </span>
    )
}
