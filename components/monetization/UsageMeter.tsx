"use client"

/**
 * Generic usage meter — "2 of 3 free policies used". Green under 70%,
 * amber under 100%, red at the cap. Unlimited (limit null) renders no bar.
 */

interface UsageMeterProps {
    label: string
    used: number
    limit: number | null
    /** Short line under the bar, e.g. «Η πλήρης ανάλυση είναι διαθέσιμη στο Plus». */
    hint?: string
    className?: string
}

export function UsageMeter({ label, used, limit, hint, className = "" }: UsageMeterProps) {
    const pct = limit && limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
    const tone =
        limit === null
            ? "bg-primary dark:bg-mint"
            : pct >= 100
                ? "bg-red-500"
                : pct >= 70
                    ? "bg-amber-500"
                    : "bg-primary dark:bg-mint"

    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-black/50 dark:text-white/55">
                    {label}
                </p>
                <p className="text-xs font-bold text-black/70 dark:text-white/75" aria-live="polite">
                    {limit === null ? `${used} · ∞` : `${used} / ${limit}`}
                </p>
            </div>
            {limit !== null && (
                <div
                    role="progressbar"
                    aria-valuenow={used}
                    aria-valuemin={0}
                    aria-valuemax={limit}
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
                >
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${tone}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
            {hint && <p className="mt-1.5 text-[11px] text-black/45 dark:text-white/50">{hint}</p>}
        </div>
    )
}
