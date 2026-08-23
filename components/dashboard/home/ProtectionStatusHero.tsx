import Link from "next/link"
import { ArrowRight, ShieldCheck, TrendingDown, TrendingUp, Upload } from "lucide-react"

import { ScoreRing } from "@/components/ui/ScoreRing"
import { ScoreMethodology } from "@/components/coverage/ScoreMethodology"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"

/**
 * The dashboard's dominant element: how protected am I, right now.
 *
 * Four states, because the score has four honest answers:
 *
 *  - `empty`         — no policies. An invitation, never a verdict: no number,
 *                      no ring arc, no methodology for a score that does not exist.
 *  - `provisional`   — policies exist but the engine has not scored them; the
 *                      flat-penalty fallback figure renders, labelled as a
 *                      different measure.
 *  - `indeterminate` — the engine scored, but from a life it knows almost
 *                      nothing about. A verdict on our own ignorance is not a
 *                      verdict on their cover: no number, a completeness CTA.
 *  - `scored`        — the real figure, its movement since the previous
 *                      assessment, and the biggest factor behind it.
 *
 * Server component — every string arrives pre-resolved.
 */
export function ProtectionStatusHero({
    state,
    score,
    ringToneClass,
    facts,
    scoreUnsupportedReason,
    deltaLabel,
    deltaDirection,
    keyReason,
    areasLine,
    policyLine,
    language,
    labels,
}: {
    state: "empty" | "provisional" | "indeterminate" | "scored"
    /** null in `empty` and `indeterminate` states. */
    score: number | null
    ringToneClass: string
    /**
     * THE HEADLINE, and what replaced the verdict.
     *
     * A composition of counts — «12 ασφαλιστήρια · 3 λήγουν σύντομα · 2 δεν
     * έχουν αναλυθεί» — resolved by lib/dashboard/portfolio-summary.ts. Every
     * part is a count of something in the wallet, so unlike «Καλή κάλυψη» it
     * cannot be a false statement about a customer's protection. It also
     * answers three of the four ten-second questions before anything is
     * scrolled.
     */
    /** One entry per stated fact, so each can be marked with `data-count`. */
    facts: Array<{ kind: string; count: number; label: string }>
    /**
     * Set when NO score may render: nothing has ever been analysed, or every
     * policy has expired. The reason is shown; a blank space where a number was
     * would read as a loading state.
     */
    scoreUnsupportedReason: string | null
    /** e.g. "+6 · since 12 Jul 2026". Null when there is nothing to compare. */
    deltaLabel: string | null
    deltaDirection: "up" | "down" | null
    /** The biggest movement or the top open finding; null when unknown. */
    keyReason: string | null
    /** "{count} areas may need review"; null when none. */
    areasLine: string | null
    /** "3 policies on file · 1 still being analyzed"; null with no policies. */
    policyLine: string | null
    language: Language
    labels: {
        kicker: string
        cta: string
        reasonKicker: string
        provisionalBadge: string
        provisionalHint: string
        emptyTitle: string
        emptyBody: string
        emptyCta: string
        indeterminateTitle: string
        indeterminateBody: string
        indeterminateCta: string
        methodologyTitle: string
        methodologyBody: string
        methodologyLimits: string
        methodologyNotAdvice: string
        scoreDisclosureOpen: string
        scoreDisclosureLabel: string
    }
}) {
    if (state === "empty") {
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
                <Link href="/wallet/add" className="pw-primary-button mt-5 inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {labels.emptyCta}
                </Link>
            </section>
        )
    }

    if (state === "indeterminate") {
        return (
            <section className="pw-card pw-pad-roomy" aria-labelledby="protection-status-heading">
                <p className="pw-kicker">{labels.kicker}</p>
                <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                    <ScoreRing value={null} toneClass="" sizeClass="h-24 w-24">
                        {/* An em dash, not a 0 — "no score" is not "scored zero". */}
                        <span className="text-h3 font-semibold text-black/40 dark:text-white/40">—</span>
                    </ScoreRing>
                    <div className="min-w-0 flex-1">
                        <h2 id="protection-status-heading" className="text-title font-semibold text-black dark:text-white">
                            {labels.indeterminateTitle}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-black/70 dark:text-white/70">
                            {labels.indeterminateBody}
                        </p>
                        {policyLine && <p className="mt-2 text-xs text-muted-foreground">{policyLine}</p>}
                    </div>
                </div>
                <Link href="/insights/risk-profile" className="pw-primary-button mt-5 inline-flex items-center gap-2">
                    {labels.indeterminateCta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

            {areasLine && <p className="mt-2 text-sm text-black/70 dark:text-white/70">{areasLine}</p>}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/coverage-insights" className="pw-primary-button inline-flex items-center gap-2">
                    {labels.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>

            {/* The score, demoted to a disclosure and stripped of its verdict.
                
                It measures BREADTH of cover — which lines you hold against the
                ones your profile implies — and that is a genuinely useful thing
                to be able to look up. It is not a grade on how protected
                someone is, and it was being read as one. */}
            {scoreUnsupportedReason ? (
                <p className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm leading-snug text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                    {scoreUnsupportedReason}
                </p>
            ) : (
                <details className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-sm font-semibold text-black/75 dark:text-white/75">
                        <ShieldCheck className="h-4 w-4 text-primary dark:text-mint" aria-hidden="true" />
                        {labels.scoreDisclosureOpen}
                    </summary>
                    <div className="mt-3 flex items-center gap-4">
                        <ScoreRing value={score} toneClass={ringToneClass} sizeClass="h-16 w-16">
                            <span className="text-base font-semibold text-black dark:text-white">{score}</span>
                        </ScoreRing>
                        <div className="min-w-0 flex-1">
                            <p className="pw-kicker">{labels.scoreDisclosureLabel}</p>
                            {/* Badge and hint stay SEPARATE elements: they are a
                                label and its explanation, and the fallback
                                formula differs materially from the engine's, so
                                the label has to be findable on its own. */}
                            {state === "provisional" && (
                                <>
                                    <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                        {labels.provisionalBadge}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{labels.provisionalHint}</p>
                                </>
                            )}
                            {/* The delta keeps its arrow but loses its colour-as-judgement:
                                a fall in BREADTH is not necessarily bad news. */}
                            {state !== "provisional" && deltaLabel && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-black/65 dark:text-white/65">
                                    {deltaDirection === "down" ? (
                                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                                    ) : (
                                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                    {deltaLabel}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* THE DERIVATIVE LIVES WITH ITS BASE.
                        «Υγεία: πτώση 20 μονάδων» used to render out here in the
                        open, in a card that no longer showed any score — a
                        number of points off a figure the reader could not see,
                        which also disagreed with the «-9» the changes feed was
                        showing at the same moment. A delta, a trend or a
                        "points" figure only means something next to the value it
                        came from, so it opens and closes with it. */}
                    {keyReason && (
                        <div className="mt-3">
                            <p className="pw-kicker">{labels.reasonKicker}</p>
                            <p className="mt-0.5 text-sm text-black/75 dark:text-white/75">{keyReason}</p>
                        </div>
                    )}
                    <ScoreMethodology
                        className="mt-3"
                        copy={{
                            title: labels.methodologyTitle,
                            body: labels.methodologyBody,
                            limits: labels.methodologyLimits,
                            notAdvice: labels.methodologyNotAdvice,
                        }}
                    />
                </details>
            )}

            {/* Point of use: the facts above are counts, but the areas line and
                the key reason are AI-derived. */}
            <AiDisclaimer language={language} variant="inline" className="mt-2" />
        </section>
    )
}
