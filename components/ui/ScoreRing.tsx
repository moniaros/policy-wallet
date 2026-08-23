import type { ReactNode } from "react"

/**
 * The one score ring.
 *
 * Extracted from the dashboard's stat tile so every 0–100 ring in the product
 * draws the same way. Two rules travel with it:
 *
 *  - `value === null` draws NO progress arc — the track alone. "No score" is
 *    not "scored zero", and the honesty tests count `path[stroke-dasharray]`
 *    elements to enforce it.
 *  - The tone class is the CALLER's job (via `getScoreTier` or a status map);
 *    this component never picks a colour from a number, so two surfaces cannot
 *    disagree about what 68 looks like.
 */
export function ScoreRing({
    value,
    toneClass,
    trackClass = "stroke-black/10 dark:stroke-white/15",
    sizeClass = "h-14 w-14",
    strokeWidth = 3,
    children,
    label,
}: {
    /** 0–100, or null when there is nothing to draw. */
    value: number | null
    /** Stroke class for the progress arc, e.g. "stroke-primary dark:stroke-mint". */
    toneClass: string
    trackClass?: string
    /** Applied to both the wrapper and the svg, e.g. "h-24 w-24". */
    sizeClass?: string
    strokeWidth?: number
    /** Centered content — usually the number, or an em dash. */
    children?: ReactNode
    /**
     * What a screen reader should hear INSTEAD of the bare centred number.
     *
     * The arc is `aria-hidden`, so without this the whole control announces as
     * "74" — no scale, no units, no indication it is an index of cover BREADTH
     * rather than a grade. Sighted readers get the scale from the ring; nobody
     * else did. When set, the number is hidden so it is not read twice.
     */
    label?: string
}) {
    return (
        <div
            className={`relative shrink-0 ${sizeClass}`}
            {...(label ? { role: "img", "aria-label": label } : {})}
        >
            <svg viewBox="0 0 36 36" className={`${sizeClass} -rotate-90`} aria-hidden="true">
                <path
                    d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                    fill="none"
                    className={trackClass}
                    strokeWidth={strokeWidth}
                />
                {value !== null && (
                    <path
                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                        fill="none"
                        className={toneClass}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${Math.max(0, Math.min(100, value))}, 100`}
                    />
                )}
            </svg>
            <span className="absolute inset-0 grid place-items-center" aria-hidden={label ? true : undefined}>
                {children}
            </span>
        </div>
    )
}
