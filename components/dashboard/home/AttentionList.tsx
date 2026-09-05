import Link from "next/link"
import type { ReactNode } from "react"
import { ActionLink, RecommendationSurface } from "./RecommendationAnalytics"
import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react"

import type { Language } from "@/lib/i18n"
import { CardHead } from "./CardHead"

export interface AttentionItem {
    id: string
    /** The rule or catalogue risk behind the finding — `recommendation_viewed` is keyed on it. */
    ruleId: string
    /** Attention area id (lib/protection/domains.ts) resolved by the server from the risk or the line. */
    area?: string
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
    /**
     * F5: the law and article behind a classified requirement, localised by the
     * server; null (or absent) for a recommendation whose requirement is under
     * review or that is not gap-derived. A classified requirement never renders
     * without it.
     */
    citation?: string | null
}


/**
 * "What needs my attention" — the top findings, each framed as
 * risk → why it matters → next step.
 *
 * Advice surface: always carries the priority honesty note and the AI
 * disclaimer. The empty state is a positive result with its evidence boundary
 * stated — "based on what we have", never a bare all-clear.
 *
 * Direction A: the card takes the reference's "score" slot, so the severity
 * tally (CoverageGapsWidget, embedded) renders between the head and the
 * rows — a segmented bar of COUNTS, never a score. `language` is accepted for
 * API stability; every string arrives pre-resolved.
 */
export function AttentionList({
    items,
    totalCount,
    tally,
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
    /** The severity tally, rendered inside this card (CoverageGapsWidget embedded). */
    tally?: ReactNode
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
        <section className="pw-card pw-pad" aria-labelledby="attention-heading">
            <CardHead
                icon={TriangleAlert}
                title={labels.kicker}
                id="attention-heading"
                meta={
                    totalCount > items.length ? (
                        <Link href="/protection" className="pw-soft-button !px-3.5 !text-caption">
                            {labels.viewAll}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                    ) : undefined
                }
            />
            {tally && <div className="mt-4">{tally}</div>}
            <div className="mt-4">
                {items.length === 0 ? (
                    <div className="pw-subcard flex items-start gap-3 p-3.5">
                        <span className="pw-card-chip">
                            <ShieldCheck className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{labels.emptyTitle}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{labels.emptyBody}</p>
                        </div>
                    </div>
                ) : (
                    <RecommendationSurface items={items.map((item) => ({ ruleId: item.ruleId, area: item.area }))}>
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <li key={item.id}>
                                <ActionLink
                                    kind="review_finding"
                                    area={item.area}
                                    href="/protection"
                                    className="pw-subcard flex items-start gap-3 p-3.5 transition-colors"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                                            {item.title}
                                        </span>
                                        {item.reason && (
                                            <span
                                                data-count={item.reasonCountKey}
                                                className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground"
                                            >
                                                {item.reason}
                                            </span>
                                        )}
                                        {item.citation && (
                                            <span data-fact="gap.citation" className="mt-0.5 block text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                                                {item.citation}
                                            </span>
                                        )}
                                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {item.timingLabel && (
                                                <span className="inline-flex items-center rounded-full bg-status-warning-tint px-2 py-0.5 text-caption font-semibold text-status-warning">
                                                    {item.timingLabel}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                                </ActionLink>
                            </li>
                        ))}
                    </ul>
                    </RecommendationSurface>
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
        </section>
    )
}
