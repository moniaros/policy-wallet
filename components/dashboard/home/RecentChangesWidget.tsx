import Link from "next/link"
import { History } from "lucide-react"

export interface RecentChange {
    id: string
    /** Already localised by the server — this widget takes no language prop. */
    title: string
    at: string
    /** Score movement, when the entry is a score change. */
    delta?: number | null
    /** True when we can say what caused it — drives the "why" affordance. */
    explained: boolean
}

/**
 * The last few things that changed, and whether we can explain them.
 *
 * The dashboard could previously show a score and a list of recommendations with
 * no account of how either got there. This is the entry point to that account;
 * the three most recent entries are enough to make a reader curious, and the
 * full reasoning lives on the timeline.
 */
export function RecentChangesWidget({
    changes,
    labels,
}: {
    changes: RecentChange[]
    labels: {
        kicker: string
        empty: string
        viewAll: string
        /** Suffix shown on entries whose cause we recorded. */
        explained: string
    }
}) {
    return (
        <Link href="/account/history" className="pw-card pw-pad">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>

            {changes.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{labels.empty}</p>
            ) : (
                <>
                    <ul className="mt-3 space-y-2">
                        {changes.map((change) => (
                            <li key={change.id} className="flex items-start gap-2">
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black/25 dark:bg-white/30"
                                    aria-hidden
                                />
                                <span className="min-w-0">
                                    <span className="block text-xs leading-snug text-black/75 dark:text-white/75 [overflow-wrap:anywhere]">
                                        {/* NO DELTA BADGE. A delta is a derivative of
                                            the score, and the score is not in this card
                                            — nor reachable from it in one tap. A number
                                            like «-9» with nothing to be nine of is a
                                            claim the reader cannot check, and it
                                            disagreed with the «πτώση 20 μονάδων» the
                                            hero was showing at the same time. The
                                            direction is in the title; the magnitude
                                            lives with the value it derives from. */}
                                        {change.title}
                                    </span>
                                    {change.explained && (
                                        <span className="mt-0.5 block text-micro text-muted-foreground">
                                            {labels.explained}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-caption font-semibold text-primary dark:text-mint">
                        {labels.viewAll}
                    </p>
                </>
            )}
        </Link>
    )
}
