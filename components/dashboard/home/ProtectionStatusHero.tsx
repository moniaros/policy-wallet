import Link from "next/link"
import { ArrowRight, ShieldCheck, Upload } from "lucide-react"

import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"

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
 * Server component — every string arrives pre-resolved.
 */
export function ProtectionStatusHero({
    hasPolicies,
    facts,
    areasLine,
    openRecommendationCount,
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
    language: Language
    labels: {
        kicker: string
        cta: string
        emptyTitle: string
        emptyBody: string
        emptyCta: string
    }
}) {
    if (!hasPolicies) {
        return (
            <section className="pw-card pw-pad-roomy" aria-labelledby="protection-status-heading">
                <p className="pw-kicker">{labels.kicker}</p>
                <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <ShieldCheck className="h-7 w-7 text-primary dark:text-mint" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="protection-status-heading" className="text-title font-semibold text-black dark:text-white">
                            {labels.emptyTitle}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-black/70 dark:text-white/70">
                            {labels.emptyBody}
                        </p>
                    </div>
                </div>
                <Link
                    href="/wallet/add"
                    data-action="upload"
                    className="pw-primary-button mt-5 inline-flex items-center gap-2"
                >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {labels.emptyCta}
                </Link>
            </section>
        )
    }

    return (
        <section className="pw-card pw-pad-roomy" aria-labelledby="protection-status-heading">
            <p className="pw-kicker">{labels.kicker}</p>

            {/* THE HEADLINE IS THE FACTS, not a grade.

                This was a 96px ring with a number inside it and a verdict word
                beside it — «Καλή κάλυψη» over a single never-analysed policy,
                «Χρειάζεται βελτίωση» over a wallet with no cover at all. The
                counts below say what the wallet contains, which is what the
                reader came for and what cannot be wrong. */}
            <h2
                id="protection-status-heading"
                className="mt-3 text-title font-semibold leading-snug text-black dark:text-white"
            >
                {facts.map((fact, i) => (
                    <span key={fact.kind}>
                        {i > 0 && <span aria-hidden> · </span>}
                        <span data-count={`portfolio.${fact.kind}`}>{fact.label}</span>
                    </span>
                ))}
            </h2>

            {areasLine && (
                <p
                    className="mt-2 text-sm text-black/70 dark:text-white/70"
                    data-count="recommendation.openCount"
                >
                    {areasLine}
                </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/coverage-insights"
                    data-action="reviewCoverage"
                    className="pw-primary-button inline-flex items-center gap-2"
                >
                    {labels.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>

            {/* Point of use: the facts above are counts, but the areas line is
                AI-derived. No disclaimer for recorded facts alone. */}
            {areasLine && <AiDisclaimer language={language} variant="inline" className="mt-2" />}
        </section>
    )
}
