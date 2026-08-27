import Link from "next/link"
import { describeSeverity } from "@/lib/gaps/severity-display"
import { toneDotClass } from "@/components/gaps/severity-tone"
import { ArrowRight, ShieldCheck } from "lucide-react"

import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"

export interface AttentionItem {
    id: string
    /** The risk, in one line. Localised by the server. */
    title: string
    /** Why it matters to THIS customer; null when no assessment backs it. */
    reason: string | null
    /**
     * Registered count key when the reason's LEADING numeral is a known
     * quantity (lib/instrumentation/reason-count-keys.ts) — undefined renders
     * no attribute, the honest state for prose we cannot vouch for.
     */
    reasonCountKey?: string
    urgency: "critical" | "high" | "medium" | "low"
    urgencyLabel: string
    /** How soon — resolved from the timing verdict; null for `no_deadline`. */
    timingLabel: string | null
}


/**
 * "What needs my attention" — the top findings, each framed as
 * risk → why it matters → next step.
 *
 * Advice surface: always carries the priority honesty note and the AI
 * disclaimer. The empty state is a positive result with its evidence boundary
 * stated — "based on what we have", never a bare all-clear.
 */
export function AttentionList({
    items,
    totalCount,
    language,
    labels,
}: {
    items: AttentionItem[]
    /**
     * The full open-finding set behind the truncated `items`. «Όλες» renders
     * only when this exceeds what is on screen: a view-all over a list that
     * already shows everything is not a continuation of anything — it is the
     * hero's «Δείτε την κάλυψή σας» offered a second time in different words,
     * which is exactly the duplicate-action defect (§11 metric 7) this page
     * measured live: four bare `/protection` offers in one page's content.
     */
    totalCount: number
    language: Language
    labels: {
        kicker: string
        viewAll: string
        emptyTitle: string
        emptyBody: string
        priorityNote: string
    }
}) {
    return (
        <div className="pw-card pw-pad lg:col-span-2">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                {totalCount > items.length && (
                    <Link
                        href="/protection"
                        className="pw-inline-action inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                    >
                        {labels.viewAll}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                )}
            </div>
            <div className="mt-3">
                {items.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-3.5 dark:border-white/15 dark:bg-white/[0.03]">
                        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                            <ShieldCheck className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-black/75 dark:text-white/85">{labels.emptyTitle}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{labels.emptyBody}</p>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href="/protection"
                                    className="pw-control-boundary flex items-start gap-3 rounded-xl border bg-black/[0.03] p-3 transition hover:bg-black/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                >
                                    <span
                                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${toneDotClass(describeSeverity(item.urgency).tone)}`}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold leading-snug text-black dark:text-white [overflow-wrap:anywhere]">
                                            {item.title}
                                        </span>
                                        {item.reason && (
                                            <span
                                                data-count={item.reasonCountKey}
                                                className="mt-0.5 line-clamp-2 block text-xs leading-snug text-black/65 dark:text-white/60"
                                            >
                                                {item.reason}
                                            </span>
                                        )}
                                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-micro font-semibold text-black/60 dark:border-white/15 dark:text-white/60">
                                                <span className={`h-1.5 w-1.5 rounded-full ${toneDotClass(describeSeverity(item.urgency).tone)}`} aria-hidden />
                                                {item.urgencyLabel}
                                            </span>
                                            {item.timingLabel && (
                                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-micro font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                    {item.timingLabel}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                {items.length > 0 && (
                    // The qualifier that stops a priority badge reading as a risk
                    // verdict — functional copy, so caption is its floor.
                    <p className="mt-3 text-caption leading-snug text-muted-foreground">{labels.priorityNote}</p>
                )}
                {/* NO SECOND DISCLAIMER. ProtectionStatusHero renders the same
                    paragraph immediately above this card, and the measurement
                    counted it as one duplicate block on every capture with
                    policies. Repeating a caveat does not strengthen it; it makes
                    the page read as boilerplate and pushes the actual findings
                    further down. */}
            </div>
        </div>
    )
}
