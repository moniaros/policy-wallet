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
    verdict,
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
    /** Resolved verdict sentence; null when no score renders. */
    verdict: string | null
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
            <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <ScoreRing value={score} toneClass={ringToneClass} sizeClass="h-24 w-24 lg:h-28 lg:w-28">
                    <span className="text-h3 font-semibold text-black dark:text-white lg:text-h2">{score}</span>
                </ScoreRing>
                <div className="min-w-0 flex-1">
                    {state === "provisional" && (
                        <p className="pw-kicker mb-1 text-amber-700 dark:text-amber-400">{labels.provisionalBadge}</p>
                    )}
                    <h2 id="protection-status-heading" className="text-title font-semibold text-black dark:text-white">
                        {verdict}
                    </h2>
                    {state === "provisional" ? (
                        <p className="mt-1 text-xs text-muted-foreground">{labels.provisionalHint}</p>
                    ) : (
                        deltaLabel && (
                            <p
                                className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    deltaDirection === "down"
                                        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                                        : "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint"
                                }`}
                            >
                                {deltaDirection === "down" ? (
                                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {deltaLabel}
                            </p>
                        )
                    )}
                    {keyReason && (
                        <div className="mt-3">
                            <p className="pw-kicker">{labels.reasonKicker}</p>
                            <p className="mt-0.5 text-sm text-black/75 dark:text-white/75">{keyReason}</p>
                        </div>
                    )}
                    {(areasLine || policyLine) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            {[areasLine, policyLine].filter(Boolean).join(" · ")}
                        </p>
                    )}
                </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/coverage-insights" className="pw-primary-button inline-flex items-center gap-2">
                    {labels.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
            <ScoreMethodology
                className="mt-3"
                copy={{
                    title: labels.methodologyTitle,
                    body: labels.methodologyBody,
                    limits: labels.methodologyLimits,
                    notAdvice: labels.methodologyNotAdvice,
                }}
            />
            <AiDisclaimer language={language} variant="inline" className="mt-2" />
        </section>
    )
}
