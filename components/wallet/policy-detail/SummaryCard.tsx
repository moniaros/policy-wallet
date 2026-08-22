"use client"

import { FileText, RefreshCw, Sparkles } from "lucide-react"

import { ScoreMethodology } from "@/components/coverage/ScoreMethodology"
import type { PolicyHealthScore } from "@/lib/wallet/policy-detail"
import { containsUnreadableMarker } from "@/lib/wallet/unreadable-value"

interface SummaryCardProps {
    /**
     * The RESOLVED summary — `null` when nothing may be rendered, either
     * because the policy has none or because the stored text is in the wrong
     * language. Resolution happens in lib/wallet/summary-language.ts; this
     * component never reads `policy.coverageSummary` itself, so a
     * wrong-language string has no path to the screen.
     */
    summary: string | null
    /** Why `summary` is null, when it is. */
    summaryState: "ok" | "absent" | "language_mismatch"
    health: PolicyHealthScore
    isAnalyzing: boolean
    copy: {
        summaryTitle: string
        summaryAiChip: string
        healthTitle: string
        /** Retained for callers that still show a level; NOT rendered here. */
        healthLevels: Record<string, string>
        /** Neutral scale note that replaced the verdict label, e.g. «στα 100». */
        healthScale: string
        /** Shown INSTEAD of the summary when the stored one is wrong-language. */
        summaryLanguageMismatch: string
        summaryLanguageMismatchCta: string
        /** Shown BESIDE the summary when the model's own sentence contains «XXXX». */
        summaryHasUnreadable: string
        valueUnreadableCta: string
    }
    /** Source document, offered wherever a value could not be read. */
    documentHref?: string | null
    /**
     * The extraction has not been checked against the document by a human.
     *
     * This used to be a page-top banner. Goal 2 removed it and Goal 2 was WRONG
     * to leave it only in the head's attention line: that line reports the ONE
     * most important thing, so on any policy with items to review the
     * unverified fact disappeared entirely — a promise the product had made and
     * silently dropped (tests/unit/unverified-extraction-notice.test.ts caught
     * it). It now sits at the point of use, beside the AI chip on the content
     * that was extracted, which is where Goal 3 wants it anyway.
     */
    unverified?: boolean
    unverifiedNote?: string
    /**
     * Where "re-run the analysis" leads. A PROP, not a literal: this card
     * hardcoded `#analysis`, and when Goal 2 renamed that section to `#review`
     * the link silently pointed at nothing. Section ids belong to the page that
     * defines them.
     */
    analysisHref?: string
    /**
     * Methodology disclosure for the health donut — a 0–100 figure with a verdict
     * must not ship bare, the same rule the portfolio protection score follows.
     * Explains the rule, the limits (not adequacy, not a claim prediction), and
     * that it is not personalised advice.
     */
    methodology?: {
        title: string
        body: string
        limits: string
        notAdvice: string
    }
}

// These colour the health VERDICT text («Θέλει μια ματιά»), not an icon, so
// they have to clear AA: amber-500 measured 2.15:1 on white and red-500 3.76:1.
/**
 * Ring tint only — never text, and never a verdict.
 *
 * These used to colour the verdict WORD, which is what made a hue into a
 * judgement. The ring keeps a low-saturation cue so the figure is readable at
 * a glance without asserting good/bad; the severities behind it are still
 * unvalidated pending underwriter review.
 */
const HEALTH_COLOR: Record<string, string> = {
    good: "text-primary/70 dark:text-mint/70",
    moderate: "text-amber-600/70 dark:text-amber-400/70",
    attention: "text-red-600/70 dark:text-red-400/70",
}

/**
 * Plain-language AI summary with the per-policy health donut. The at-a-glance
 * chip strip that used to sit at the foot of this card is superseded by the
 * PolicyBriefCard directly below it, which answers the same questions with
 * their evidence boundaries attached.
 */
export function SummaryCard({
    summary,
    summaryState,
    health,
    isAnalyzing,
    copy,
    methodology,
    documentHref = null,
    analysisHref = "#review",
    unverified = false,
    unverifiedNote,
}: SummaryCardProps) {
    const healthColorClass = HEALTH_COLOR[health.level] || HEALTH_COLOR.good
    // A placeholder embedded in the model's own sentence — "…for vehicle
    // (XXXX)…" — cannot be replaced without rewriting the sentence, so it is
    // annotated instead. The note exists because nothing on this page redacts
    // anything: an XXXX is an unread value, and the reader must not mistake it
    // for one we are withholding.
    const summaryHasUnreadable = summaryState === "ok" && containsUnreadableMarker(summary)

    return (
        <div className="pw-card pw-pad sm:p-7">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                        <FileText className="h-4 w-4 text-primary dark:text-mint" />
                        {copy.summaryTitle}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-kicker font-black uppercase tracking-widest text-primary dark:bg-primary/15 dark:text-mint">
                        <Sparkles className="h-3 w-3" />
                        {copy.summaryAiChip}
                    </span>
                </div>

                {/* NO SCORE WITHOUT A COMPLETED ANALYSIS, and no verdict label in
                    any state.

                    The donut used to render «100 · Σε καλή κατάσταση» for a
                    policy whose analysis had FAILED — the score is a subtraction
                    from 100, so "nothing looked" and "nothing wrong" produce the
                    same number — and «71 · Σε καλή κατάσταση» for a policy 110
                    days expired. The verdict word was the load-bearing part: a
                    bare number invites a question, a verdict answers one, and
                    this one is not ours to answer until an underwriter has
                    validated what feeds it. */}
                {!isAnalyzing && health.available && (
                    <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14">
                            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="none"
                                    strokeWidth="3.5"
                                    className="stroke-current text-black/10 dark:text-white/15"
                                />
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="none"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${health.score} 100`}
                                    className={`stroke-current ${healthColorClass}`}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-black dark:text-white">
                                {health.score}
                            </span>
                        </div>
                        <div>
                            <p className="text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                                {copy.healthTitle}
                            </p>
                            {/* The verdict label («Σε καλή κατάσταση») is gone.
                                What replaces it is what the number actually is:
                                a reading of this document, with its method one
                                tap away. */}
                            <p className="text-xs font-semibold text-black/55 dark:text-white/55">
                                {copy.healthScale}
                            </p>
                            {methodology && (
                                <ScoreMethodology className="mt-1" copy={methodology} />
                            )}
                        </div>
                    </div>
                )}
            </div>
            {unverified && unverifiedNote && (
                <p className="mb-3 text-caption leading-snug text-black/70 dark:text-white/70">
                    {unverifiedNote}
                </p>
            )}
            {summaryState === "language_mismatch" ? (
                /* A summary the analysis produced in the wrong language is a
                   pipeline defect, not content. It is withheld rather than
                   shown, and the reader is told why and where the fix is —
                   re-analysis is metered, so it is offered, never silently run. */
                <div className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                        {copy.summaryLanguageMismatch}
                    </p>
                    <a
                        href={analysisHref}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 text-xs font-bold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                        <RefreshCw className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden />
                        {copy.summaryLanguageMismatchCta}
                    </a>
                </div>
            ) : (
                <>
                    <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">{summary}</p>
                    {summaryHasUnreadable && (
                        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs leading-relaxed text-black/65 dark:border-white/15 dark:bg-white/5 dark:text-white/65">
                            <span>{copy.summaryHasUnreadable}</span>
                            {documentHref && (
                                <a
                                    href={documentHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-[44px] items-center gap-1.5 font-bold text-primary underline underline-offset-2 dark:text-mint"
                                >
                                    <FileText className="h-3.5 w-3.5" aria-hidden />
                                    {copy.valueUnreadableCta}
                                </a>
                            )}
                        </p>
                    )}
                </>
            )}
        </div>
    )
}
