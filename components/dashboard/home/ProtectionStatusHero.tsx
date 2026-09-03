import Link from "next/link"
import { ArrowRight, Eye, ShieldCheck, TriangleAlert, Upload } from "lucide-react"

import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"
import type { PremiumExclusionPart } from "@/lib/wallet/premium-exclusion-note"
import { CardHead } from "./CardHead"

/**
 * fact.kind → the PLAN's registered count key (lib/instrumentation/count-keys.ts).
 * The first instrumentation pass stamped the raw kind (`portfolio.total`),
 * which coined five keys the plan never agreed — and an unregistered key is
 * exactly how the vocabulary forks (INSTRUMENTATION-PLAN.md, Naming).
 */
const KIND_COUNT_KEY: Record<string, string> = {
    total: "portfolio.policyCount",
    expired: "portfolio.expiredCount",
    expiringSoon: "portfolio.expiringCount",
    neverAnalysed: "portfolio.neverAnalysedCount",
    analysisFailed: "portfolio.failedCount",
}

/**
 * «12 ασφαλιστήρια» → lead «12», rest «ασφαλιστήρια», so the number can be
 * set large and the words small WITHOUT changing the element's text: the
 * span's textContent stays the whole fact («12 ασφαλιστήρια»), which is what
 * the count scan and protection-score-honesty read. A label that does not
 * lead with its count (a future language, say) renders whole.
 */
function splitFact(label: string, count: number): { lead: string; rest: string } | null {
    const prefix = `${count} `
    return label.startsWith(prefix) ? { lead: String(count), rest: label.slice(prefix.length) } : null
}

/**
 * The dashboard's dominant element: what the wallet contains, right now.
 *
 * THE PROTECTION SCORE IS GONE — REMOVED FROM THE PRODUCT, NOT PARKED.
 *
 * This surface used to carry the number, a ring, a delta and four states of
 * score logic. The score was a weighted average of coverage BREADTH presented
 * as a protection verdict; its severities are unvalidated pending underwriter
 * review, and its fallback returned 100 for a portfolio nothing had ever
 * analysed. Removed Aug 2026 (run PW-MOBILE-TRANSFORM-01, halt H-001, owner
 * decision). `tests/unit/score-containment.test.ts` fails if any customer
 * surface renders the value again — do not reintroduce it here.
 *
 * Two states remain, because the wallet has two honest answers:
 *
 *  - `empty` — no policies. An invitation, never a verdict.
 *  - facts   — THE HEADLINE: a composition of counts — «12 ασφαλιστήρια ·
 *              3 λήγουν σύντομα · 2 δεν έχουν αναλυθεί» — resolved by
 *              lib/dashboard/portfolio-summary.ts. Every part is a count of
 *              something in the wallet, so unlike «Καλή κάλυψη» it cannot be
 *              a false statement about a customer's protection.
 *
 * Direction A (2026-09-03): the headline is laid out as the reference's
 * overview row — one cell per fact, number large, words small, hairlines
 * between — but the h2 still IS the facts: the cells are spans inside it, so
 * the heading reads «12 ασφαλιστήρια 3 λήγουν … » exactly as before. The
 * premium footprint joins the row as its last cell (it left the portfolio
 * card, so it renders once), with what the total leaves out stated under it.
 *
 * Server component — every string arrives pre-resolved.
 */
export function ProtectionStatusHero({
    hasPolicies,
    facts,
    areasLine,
    openRecommendationCount,
    premium = null,
    language,
    labels,
}: {
    hasPolicies: boolean
    /** One entry per stated fact, so each can be marked with `data-count`. */
    facts: Array<{ kind: string; count: number; label: string }>
    /** "{count} areas may need review"; null when none. */
    areasLine: string | null
    /** The count behind `areasLine`, for `data-count`. */
    openRecommendationCount: number
    /**
     * The audited premium footprint, when the wallet has one — the ONE render
     * of portfolio.totalAnnualPremium on the page. `excludedParts` are the
     * policies the total could not count, one part per non-zero count.
     */
    premium?: { value: string; label: string; excludedParts: PremiumExclusionPart[] } | null
    language: Language
    labels: {
        kicker: string
        cta: string
        emptyTitle: string
        emptyBody: string
        emptyCta: string
        /** Right-hand meta of the card head; optional so older callers still type. */
        meta?: string
    }
}) {
    if (!hasPolicies) {
        return (
            <section className="pw-card pw-pad-roomy" aria-labelledby="protection-status-heading">
                <CardHead as="p" icon={Eye} title={labels.kicker} />
                <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <ShieldCheck className="h-7 w-7 text-primary dark:text-mint" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="protection-status-heading" className="text-title font-semibold text-foreground">
                            {labels.emptyTitle}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {labels.emptyBody}
                        </p>
                    </div>
                </div>
                <Link
                    href="/wallet/add"
                    data-action="upload"
                    className="pw-primary-button mt-5 inline-flex min-h-11 items-center gap-2"
                >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {labels.emptyCta}
                </Link>
            </section>
        )
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-status-heading">
            <CardHead as="p" icon={Eye} title={labels.kicker} meta={labels.meta} />

            {/* THE HEADLINE IS THE FACTS, not a grade.

                This was a 96px ring with a number inside it and a verdict word
                beside it — «Καλή κάλυψη» over a single never-analysed policy,
                «Χρειάζεται βελτίωση» over a wallet with no cover at all. The
                cells below say what the wallet contains, which is what the
                reader came for and what cannot be wrong. Hairlines between
                cells at lg+ only: below that the row wraps, and a divider at a
                wrapped row's start is a line with nothing to its left. */}
            <h2
                id="protection-status-heading"
                className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 font-normal sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none lg:gap-x-0 lg:[&>*+*]:border-l lg:[&>*+*]:border-border lg:[&>*+*]:pl-4 lg:[&>*]:pr-4 lg:[&>*:last-child]:pr-0"
            >
                {facts.map((fact) => {
                    const parts = splitFact(fact.label, fact.count)
                    return (
                        <span
                            key={fact.kind}
                            data-count={KIND_COUNT_KEY[fact.kind] ?? `portfolio.${fact.kind}`}
                            className="flex min-w-0 flex-col-reverse gap-1"
                        >
                            {parts ? (
                                <>
                                    {/* Visual order is words-over-number (flex-col-reverse);
                                        DOM order stays «count words», so the text reads
                                        «12 ασφαλιστήρια» to every reader. */}
                                    <span className="text-title font-semibold leading-none tracking-tight text-foreground tabular-nums">
                                        {parts.lead}
                                    </span>{" "}
                                    {/* Lowercase-initial on purpose: the labels are the tails
                                        of the facts sentence («5 έχουν λήξει»), and CSS
                                        capitalisation under lang="el" strips the tonos
                                        («Εχουν»). The premium label is lowercased to match. */}
                                    <span className="block text-caption leading-snug text-muted-foreground">{parts.rest}</span>
                                </>
                            ) : (
                                <span className="text-body font-semibold text-foreground">{fact.label}</span>
                            )}
                        </span>
                    )
                })}
                {premium && (
                    <span
                        data-fact="portfolio.totalAnnualPremium"
                        className="flex min-w-0 flex-col-reverse gap-1"
                    >
                        <span className="text-title font-semibold leading-none tracking-tight text-foreground tabular-nums">
                            {premium.value}
                        </span>{" "}
                        <span className="block text-caption leading-snug text-muted-foreground first-letter:lowercase">{premium.label}</span>
                    </span>
                )}
            </h2>

            {premium && premium.excludedParts.length > 0 && (
                <p className="mt-3 text-caption text-muted-foreground">
                    {premium.excludedParts.map((part, i) => (
                        <span key={part.countKey}>
                            {i > 0 && <span aria-hidden> · </span>}
                            <span data-count={part.countKey}>{part.label}</span>
                        </span>
                    ))}
                </p>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                {areasLine ? (
                    <p
                        className="flex items-start gap-2 text-sm text-foreground"
                        data-count="recommendation.openCount"
                    >
                        <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" aria-hidden="true" />
                        {areasLine}
                    </p>
                ) : (
                    <span />
                )}
                <Link
                    href="/protection"
                    data-action="reviewCoverage"
                    className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline dark:text-mint sm:self-auto"
                >
                    {labels.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>

            {/* The disclaimer belongs to the AI-derived line, not to the counts:
                stamping «12 ασφαλιστήρια» as AI output would be its own small
                dishonesty. */}
            {areasLine && <AiDisclaimer language={language} variant="inline" className="mt-2" />}
        </section>
    )
}
