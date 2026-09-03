"use client"

import { FileText, RefreshCw, Sparkles } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
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
     * Methodology disclosure for the health reading — a 0–100 figure must not
     * ship bare, the same rule the portfolio protection score followed.
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

/** A pill that stays visible on a sunken sub-card: white, not grey. */
const PILL_ON_SUNKEN =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-4 text-caption font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"

/**
 * Plain-language AI summary with the per-policy health reading.
 *
 * Direction A (2026-09-03): the uppercase h2 became the one card head (chip ·
 * title · AI chip), and the health DONUT became a fact cell — number large,
 * words small — in a sunken sub-card. A ring invites reading a figure as a
 * grade; the number with its scale note and methodology link says exactly
 * what it is: a reading of this document, with its method one tap away. No
 * verdict word in any state, and no figure without a completed analysis.
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
    // A placeholder embedded in the model's own sentence — "…for vehicle
    // (XXXX)…" — cannot be replaced without rewriting the sentence, so it is
    // annotated instead. The note exists because nothing on this page redacts
    // anything: an XXXX is an unread value, and the reader must not mistake it
    // for one we are withholding.
    const summaryHasUnreadable = summaryState === "ok" && containsUnreadableMarker(summary)

    return (
        <div className="pw-card pw-pad sm:p-7">
            <CardHead
                icon={FileText}
                title={copy.summaryTitle}
                meta={
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary dark:bg-primary/15 dark:text-mint">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {copy.summaryAiChip}
                    </span>
                }
            />

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
                <div className="pw-subcard mt-4 flex items-center gap-4 px-4 py-3">
                    <p className="text-title font-semibold leading-none tracking-tight text-foreground tabular-nums">
                        {health.score}
                    </p>
                    <div className="min-w-0">
                        <p className="text-caption font-medium text-muted-foreground">{copy.healthTitle}</p>
                        {/* The verdict label («Σε καλή κατάσταση») is gone.
                            What replaces it is what the number actually is:
                            a reading of this document, with its method one
                            tap away. */}
                        <p className="text-caption text-muted-foreground">{copy.healthScale}</p>
                        {methodology && <ScoreMethodology className="mt-1" copy={methodology} />}
                    </div>
                </div>
            )}

            {unverified && unverifiedNote && (
                <p className="mt-4 text-caption leading-snug text-muted-foreground">{unverifiedNote}</p>
            )}

            <div className="mt-4">
                {summaryState === "language_mismatch" ? (
                    /* A summary the analysis produced in the wrong language is a
                       pipeline defect, not content. It is withheld rather than
                       shown, and the reader is told why and where the fix is —
                       re-analysis is metered, so it is offered, never silently run. */
                    <div className="pw-subcard flex flex-col items-start gap-3 px-4 py-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">{copy.summaryLanguageMismatch}</p>
                        <a href={analysisHref} className={PILL_ON_SUNKEN}>
                            <RefreshCw className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden />
                            {copy.summaryLanguageMismatchCta}
                        </a>
                    </div>
                ) : (
                    <>
                        <p className="text-sm leading-relaxed text-foreground">{summary}</p>
                        {summaryHasUnreadable && (
                            <p className="pw-subcard mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-caption leading-relaxed text-muted-foreground">
                                <span>{copy.summaryHasUnreadable}</span>
                                {documentHref && (
                                    <a
                                        href={documentHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline underline-offset-2 dark:text-mint"
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
        </div>
    )
}
