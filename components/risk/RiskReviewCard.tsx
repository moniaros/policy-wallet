"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { completeRiskReview, dismissRiskReview } from "@/app/(protected)/dashboard/risk-review-actions"

export interface RiskReviewCardProps {
    review: {
        id: string
        trigger: string
        dueAt: string
        scoreAtOpen: number | null
        findingsAtOpen: number | null
    }
    /** The trigger's own words, resolved server-side from the review policy. */
    label: { el: string; en: string }
    rationale: string
}

/**
 * The review prompt, on the dashboard.
 *
 * Mobile-first: one column, full-width actions with 44px targets, and the two
 * facts that justify the interruption (why it opened, when it is due) above the
 * fold on a 320px screen. A review card that needs scrolling to explain itself
 * gets dismissed unread.
 *
 * "Not now" is a first-class action, not a hidden one. A prompt you cannot
 * decline is a prompt people learn to resent, and a dismissal is useful signal:
 * it tells us we asked at the wrong moment, which a silently ignored card does
 * not.
 */
export function RiskReviewCard({ review, label, rationale }: RiskReviewCardProps) {
    const { t, language } = useLanguage()
    const [pending, startTransition] = useTransition()
    const [gone, setGone] = useState(false)

    const copy = t.settings.riskReview
    if (gone) return null

    const title = language === "el" ? label.el : label.en
    const due = new Date(review.dueAt)
    const dueLabel = due.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Athens",
    })

    function act(action: (fd: FormData) => Promise<{ success?: boolean; error?: string }>, done: string) {
        return (formData: FormData) => {
            startTransition(async () => {
                const result = await action(formData)
                if (result?.error) {
                    toast.error(copy.failed)
                    return
                }
                setGone(true)
                toast.success(done)
            })
        }
    }

    return (
        <section
            aria-labelledby="risk-review-heading"
            className="pw-card pw-pad border-l-4 border-l-[var(--primary)]"
        >
            <p className="text-kicker font-black uppercase tracking-widest text-primary">
                {copy.title}
            </p>
            <h2
                id="risk-review-heading"
                className="text-lg font-bold text-black dark:text-white mt-1"
            >
                {title}
            </h2>

            {/* Why, in the product's own words — a review that cannot say why it
                opened is one the customer distrusts. */}
            <p className="text-caption text-muted-foreground mt-2">
                <span className="font-semibold">{copy.openedBecause}:</span> {rationale}
            </p>

            <dl className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-caption">
                <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">{copy.due}</dt>
                    <dd className="font-semibold text-black dark:text-white">{dueLabel}</dd>
                </div>
                {review.findingsAtOpen != null && review.findingsAtOpen > 0 && (
                    <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">{copy.findings}</dt>
                        <dd className="font-semibold text-black dark:text-white">
                            {review.findingsAtOpen}
                        </dd>
                    </div>
                )}
                {review.scoreAtOpen != null && (
                    <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">{copy.scoreThen}</dt>
                        <dd className="font-semibold text-black dark:text-white">
                            {review.scoreAtOpen}%
                        </dd>
                    </div>
                )}
            </dl>

            <p className="text-caption text-muted-foreground mt-3">{copy.whatToCheck}</p>

            {/* Full-width, stacked on a phone; inline from sm. 44px floors. */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Link
                    href="/insights/risk-profile"
                    className="pw-primary-button min-h-11 flex-1 inline-flex items-center justify-center"
                >
                    {copy.cta}
                </Link>
                <form action={act(completeRiskReview, copy.completed)} className="flex-1">
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button
                        type="submit"
                        disabled={pending}
                        className="pw-secondary-button pw-btn-sm min-h-11 w-full disabled:opacity-60"
                    >
                        {copy.complete}
                    </button>
                </form>
                <form action={act(dismissRiskReview, copy.dismissed)}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button
                        type="submit"
                        disabled={pending}
                        className="min-h-11 px-4 text-caption text-muted-foreground hover:text-black dark:hover:text-white disabled:opacity-60 w-full sm:w-auto"
                    >
                        {copy.dismiss}
                    </button>
                </form>
            </div>
        </section>
    )
}
