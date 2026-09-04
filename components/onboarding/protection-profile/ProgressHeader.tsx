"use client"

import { ArrowLeft } from "lucide-react"

/**
 * «Βήμα n από m» with a continuous track, and the back control. The
 * denominator is the constant count of counted steps, so the number a person
 * sees never grows when a conditional screen appears. The skip link sits at
 * the far right so nobody is ever trapped.
 */
export function ProgressHeader({
    index,
    total,
    stepLabel,
    progressLabel,
    backLabel,
    onBack,
    skipLabel,
    onSkip,
}: {
    index: number
    total: number
    stepLabel: string
    progressLabel: string
    backLabel: string
    onBack: (() => void) | null
    skipLabel: string
    onSkip: () => void
}) {
    const pct = Math.max(0, Math.min(100, (index / total) * 100))
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    {onBack ? (
                        <button type="button" onClick={onBack} aria-label={backLabel} className="pw-soft-button h-11 w-11 shrink-0 px-0">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                    ) : null}
                    <p className="text-caption font-semibold tabular-nums text-muted-foreground">{stepLabel}</p>
                </div>
                <button type="button" onClick={onSkip} className="inline-flex min-h-11 items-center text-caption font-medium text-muted-foreground hover:text-foreground">
                    {skipLabel}
                </button>
            </div>
            <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={progressLabel}
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={index}
            >
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}
