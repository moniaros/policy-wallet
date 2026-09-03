"use client"

/**
 * Generic usage meter — "2 of 3 free policies used". Green under 70%,
 * amber under 100%, red at the cap. Unlimited (limit null) renders no bar.
 */

interface UsageMeterProps {
    label: string
    used: number
    limit: number | null
    /**
     * Registered data-count keys for the two numbers (lib/instrumentation/
     * count-keys.ts). `used` is usually a portfolio fact; `limit` is a PLAN
     * fact — separate keys keep «2/10» from reading as a contradiction of the
     * policy count elsewhere on the page.
     */
    usedCountKey?: string
    limitCountKey?: string
    /** Short line under the bar, e.g. «Η πλήρης ανάλυση είναι διαθέσιμη στο Plus». */
    hint?: string
    /**
     * What to print instead of `12 · ∞` when there is no limit. "0 · ∞" is not
     * a fact anyone can act on — a reader wants to be told the allowance is
     * unlimited, in words.
     */
    unlimitedLabel?: string
    className?: string
}

export function UsageMeter({ label, used, limit, usedCountKey, limitCountKey, hint, unlimitedLabel, className = "" }: UsageMeterProps) {
    const pct = limit && limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
    // Being OVER the cap is a real state, not an edge case: FREE_POLICY_LIMIT is
    // 1, so any free account that downgraded — or that had policies added before
    // the cap changed — renders "2 / 1". The bar was already clamped, but
    // aria-valuenow was not, so it shipped aria-valuenow="2" against
    // aria-valuemax="1" — outside the range ARIA requires. Clamp the numeric
    // value for the range and let aria-valuetext carry the honest reading.
    const ariaNow = limit !== null ? Math.min(Math.max(used, 0), limit) : used
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
                <p className="text-caption font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="text-caption font-semibold tabular-nums text-foreground" aria-live="polite">
                    {limit === null ? (
                        unlimitedLabel ?? `${used} · ∞`
                    ) : (
                        <>
                            <span data-count={usedCountKey}>{used}</span>
                            {" / "}
                            <span data-count={limitCountKey}>{limit}</span>
                        </>
                    )}
                </p>
            </div>
            {/* A progressbar with no accessible name is announced as a bare
                "2 of 5". The visible label above already says WHAT is being
                metered, so reuse it rather than invent a second string. */}
            {limit !== null && (
                <div
                    role="progressbar"
                    aria-label={label}
                    aria-valuenow={ariaNow}
                    aria-valuetext={`${used} / ${limit}`}
                    aria-valuemin={0}
                    aria-valuemax={limit}
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                >
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${tone}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
            {/* The hint says what a plan actually buys ("Plus has room for up to 10
                policies") — functional, so text-caption, the design system's
                smallest FUNCTIONAL size. The label above is a caption too since
                Direction A: the app has no eyebrows, and a CSS text-transform
                strips the tonos off Greek capitals. */}
            {hint && <p className="mt-1.5 text-caption text-muted-foreground">{hint}</p>}
        </div>
    )
}
