import Link from "next/link"
import { Activity, ArrowRight, Check, CircleAlert, TriangleAlert } from "lucide-react"
import { CardHead } from "./CardHead"

export interface MonitorSignalView {
    id: string
    /** Localised by the server from the bilingual WatchSignal. */
    label: string
    verdict: "clear" | "attention" | "action"
    verdictLabel: string
    detail: string | null
    /**
     * `detail`, segmented so a part stating a count/fact carries its key
     * (WatchSignal.detailParts, localised). Joined, the parts read exactly as
     * `detail`; when absent, `detail` renders as one block.
     */
    detailParts?: Array<{ text: string; countKey?: string; factKey?: string }> | null
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
        chip: "bg-status-warning-tint text-status-warning",
        icon: CircleAlert,
    },
    action: {
        chip: "bg-status-danger-tint text-status-danger",
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
            <CardHead
                icon={Activity}
                title={labels.kicker}
                id="protection-monitor-heading"
                meta={<span>{lastCheckedLabel ?? labels.notYetAssessed}</span>}
            />
            <ul className="mt-4 space-y-2">
                {signals.map((signal) => {
                    const style = VERDICT_STYLE[signal.verdict]
                    const Icon = style.icon
                    return (
                        <li
                            key={signal.id}
                            className="pw-subcard flex items-start gap-3 p-3"
                        >
                            <span
                                className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold ${style.chip}`}
                            >
                                <Icon className="h-3 w-3" aria-hidden />
                                {signal.verdictLabel}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-foreground [overflow-wrap:anywhere]">
                                    {signal.label}
                                </span>
                                {(signal.detailParts?.length || signal.detail) && (
                                    <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">
                                        {signal.detailParts?.length
                                            ? signal.detailParts.map((part, i) => (
                                                  <span
                                                      key={i}
                                                      data-count={part.countKey}
                                                      data-fact={part.factKey}
                                                  >
                                                      {part.text}
                                                  </span>
                                              ))
                                            : signal.detail}
                                    </span>
                                )}
                                {signal.action && (
                                    <span className="mt-0.5 block text-caption font-semibold leading-snug text-foreground/80">
                                        {signal.action}
                                    </span>
                                )}
                            </span>
                        </li>
                    )
                })}
            </ul>
            <Link href="/protection?lens=risk" className="pw-soft-button mt-4 !text-caption">
                {labels.detailsLink}
                <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
        </section>
    )
}
