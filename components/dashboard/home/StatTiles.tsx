import Link from "next/link"
import { Wallet } from "lucide-react"
import { ScoreMethodology } from "@/components/coverage/ScoreMethodology"

/**
 * Active-policies + protection-score tiles on /home. Server component —
 * all copy arrives pre-resolved.
 *
 * The score tile has three states rather than one. It used to render `0` inside
 * a red ring under "Χρειάζεται προσοχή" whenever `healthScore` was 0 — including
 * for someone who had simply not uploaded a policy yet, which reads as a verdict
 * on their protection when the product knows nothing about it. `healthScore` is
 * now nullable and that case shows an invitation instead of a judgement.
 *
 * When the figure comes from the fallback formula rather than the scoring
 * engine it is labelled provisional, because the two are not the same measure
 * and can differ materially for the same portfolio.
 */
export function StatTiles({
    activeCount,
    healthScore,
    openGapCount,
    isProvisional = false,
    labels,
}: {
    activeCount: number
    /** `null` when there is nothing to score yet. */
    healthScore: number | null
    openGapCount: number
    isProvisional?: boolean
    labels: {
        activePolicies: string
        protectionScore: string
        scoreSummary: string
        gapsCount: string
        scoreUnavailable: string
        scoreUnavailableHint: string
        provisional: string
        provisionalHint: string
        methodologyTitle: string
        methodologyBody: string
        methodologyLimits: string
        methodologyNotAdvice: string
    }
}) {
    const ring =
        healthScore === null
            ? "stroke-black/15 dark:stroke-white/20"
            : healthScore >= 70
                ? "stroke-primary dark:stroke-mint"
                : healthScore >= 40
                    ? "stroke-amber-500"
                    : "stroke-red-500"

    const subLine =
        healthScore === null
            // Its own label, not scoreSummary — reusing that one made the tile
            // able to print a verdict ("Needs attention") under a score that
            // does not exist.
            ? labels.scoreUnavailableHint
            : isProvisional
                ? labels.provisionalHint
                : openGapCount > 0
                    ? labels.gapsCount
                    : null

    return (
        <>
            <Link href="/wallet" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.activePolicies}</p>
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-4xl font-semibold text-black dark:text-white">{activeCount}</p>
                    <Wallet className="h-6 w-6 text-primary dark:text-mint" aria-hidden="true" />
                </div>
            </Link>

            <div className="pw-card pw-pad">
                <Link href="/coverage-insights" className="block">
                    <p className="pw-kicker">{labels.protectionScore}</p>
                    <div className="mt-3 flex items-center gap-4">
                        <div className="relative h-14 w-14 shrink-0">
                            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" aria-hidden="true">
                                <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" className="stroke-black/10 dark:stroke-white/15" strokeWidth="3" />
                                {healthScore !== null && (
                                    <path
                                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                        fill="none"
                                        className={ring}
                                        strokeWidth="3"
                                        strokeDasharray={`${healthScore}, 100`}
                                    />
                                )}
                            </svg>
                            <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-black dark:text-white">
                                {/* An em dash, not a 0 — "no score" is not "scored zero". */}
                                {healthScore === null ? "—" : healthScore}
                            </span>
                        </div>
                        <div className="min-w-0">
                            {healthScore === null ? (
                                <p className="text-sm font-medium text-black/80 dark:text-white/80">
                                    {labels.scoreUnavailable}
                                </p>
                            ) : (
                                <>
                                    {isProvisional && (
                                        <p className="pw-kicker mb-0.5 text-amber-700 dark:text-amber-400">
                                            {labels.provisional}
                                        </p>
                                    )}
                                    <p className="text-sm font-medium text-black/80 dark:text-white/80">
                                        {labels.scoreSummary}
                                    </p>
                                </>
                            )}
                            {subLine && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{subLine}</p>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Outside the Link: <details> inside an <a> is invalid HTML, and
                    the toggle would navigate instead of expanding. */}
                {healthScore !== null && (
                    <ScoreMethodology
                        className="mt-3"
                        copy={{
                            title: labels.methodologyTitle,
                            body: labels.methodologyBody,
                            limits: labels.methodologyLimits,
                            notAdvice: labels.methodologyNotAdvice,
                        }}
                    />
                )}
            </div>
        </>
    )
}
