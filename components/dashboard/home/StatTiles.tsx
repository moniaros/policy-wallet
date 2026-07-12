import Link from "next/link"
import { Wallet } from "lucide-react"

/**
 * Active-policies + protection-score tiles on /home. Server component —
 * all copy arrives pre-resolved.
 */
export function StatTiles({
    activeCount,
    healthScore,
    openGapCount,
    labels,
}: {
    activeCount: number
    healthScore: number
    openGapCount: number
    labels: {
        activePolicies: string
        protectionScore: string
        scoreSummary: string
        gapsCount: string
    }
}) {
    return (
        <>
            <Link href="/wallet" className="pw-card p-5">
                <p className="pw-kicker">{labels.activePolicies}</p>
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-4xl font-semibold text-black dark:text-white">{activeCount}</p>
                    <Wallet className="h-6 w-6 text-primary dark:text-mint" />
                </div>
            </Link>

            <Link href="/coverage-insights" className="pw-card p-5">
                <p className="pw-kicker">{labels.protectionScore}</p>
                <div className="mt-3 flex items-center gap-4">
                    <div className="relative h-14 w-14">
                        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                            <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" className="stroke-black/10 dark:stroke-white/15" strokeWidth="3" />
                            <path
                                d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                fill="none"
                                className={healthScore >= 70 ? "stroke-primary dark:stroke-mint" : healthScore >= 40 ? "stroke-amber-500" : "stroke-red-500"}
                                strokeWidth="3"
                                strokeDasharray={`${healthScore}, 100`}
                            />
                        </svg>
                        <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-black dark:text-white">
                            {healthScore}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-black/80 dark:text-white/80 font-medium">{labels.scoreSummary}</p>
                        {openGapCount > 0 && (
                            <p className="text-xs text-black/55 dark:text-white/60 mt-0.5">{labels.gapsCount}</p>
                        )}
                    </div>
                </div>
            </Link>
        </>
    )
}
