import Link from "next/link"
import { ArrowRight, Check, CircleAlert, TriangleAlert } from "lucide-react"

export interface MonitorSignalView {
    id: string
    /** Localised by the server from the bilingual WatchSignal. */
    label: string
    verdict: "clear" | "attention" | "action"
    verdictLabel: string
    detail: string | null
    action: string | null
}

const VERDICT_STYLE: Record<
    MonitorSignalView["verdict"],
    { chip: string; icon: typeof Check }
> = {
    clear: {
        chip: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
        icon: Check,
    },
    attention: {
        chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        icon: CircleAlert,
    },
    action: {
        chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
        icon: TriangleAlert,
    },
}

/**
 * The standing watch, rendered. All four signals ALWAYS show — clear included —
 * because a watch that only appears when something is wrong cannot be told
 * apart from a watch that is broken.
 *
 * The "last checked" line renders only from a real `ProtectionScore.computedAt`;
 * an account the engine has never scored gets the honest `notYetAssessed` line
 * instead of a fabricated timestamp.
 */
export function ProtectionMonitorCard({
    signals,
    lastCheckedLabel,
    labels,
}: {
    signals: MonitorSignalView[]
    /** "Last checked 11 Aug 2026", or null when no engine run is on record. */
    lastCheckedLabel: string | null
    labels: {
        kicker: string
        notYetAssessed: string
        detailsLink: string
    }
}) {
    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-monitor-heading">
            <div className="flex items-center justify-between">
                <p className="pw-kicker" id="protection-monitor-heading">{labels.kicker}</p>
                <p className="text-micro font-semibold text-muted-foreground">
                    {lastCheckedLabel ?? labels.notYetAssessed}
                </p>
            </div>
            <ul className="mt-3 space-y-2">
                {signals.map((signal) => {
                    const style = VERDICT_STYLE[signal.verdict]
                    const Icon = style.icon
                    return (
                        <li
                            key={signal.id}
                            className="flex items-start gap-3 rounded-xl border border-black/8 bg-black/[0.02] p-2.5 dark:border-white/10 dark:bg-white/[0.02]"
                        >
                            <span
                                className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold ${style.chip}`}
                            >
                                <Icon className="h-3 w-3" aria-hidden />
                                {signal.verdictLabel}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                    {signal.label}
                                </span>
                                {signal.detail && (
                                    <span className="mt-0.5 block text-caption leading-snug text-black/65 dark:text-white/60">
                                        {signal.detail}
                                    </span>
                                )}
                                {signal.action && (
                                    <span className="mt-0.5 block text-caption font-semibold leading-snug text-black/75 dark:text-white/75">
                                        {signal.action}
                                    </span>
                                )}
                            </span>
                        </li>
                    )
                })}
            </ul>
            <Link
                href="/insights/risk-profile"
                className="pw-inline-action mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
            >
                {labels.detailsLink}
                <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
        </section>
    )
}
