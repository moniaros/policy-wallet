"use client"

import { BellRing, CalendarClock, ListChecks } from "lucide-react"

/**
 * Renewal outlook: what this renewal means, what is worth checking first, and
 * which reminders are genuinely still coming.
 *
 * Every line arrives resolved from real facts (see lib/wallet/renewal-outlook):
 * no premium-change or coverage-change claims, no fabricated countdown when the
 * end date is untrustworthy, and a reminder promise that is tier-truthful —
 * built from the same milestone constants the cron sends by.
 */
export function RenewalOutlookCard({
    headline,
    headlineTone,
    checklist,
    reminderLine,
    pastPeriodsLine,
    expired,
    onRequestQuote,
    isRequestingQuote,
    copy,
}: {
    /** "Renewal in 24 days" / "This policy has expired" / the no-end-date line. */
    /**
     * `null` when the page's head already states the countdown.
     *
     * This card's headline WAS the countdown, rendered a second time a few
     * hundred pixels below the key-dates tile that also stated it — one of the
     * duplicate facts the restructure removes. The checklist and the reminder
     * trail are what only this card says.
     */
    headline: string | null
    headlineTone: "critical" | "warning" | "neutral"
    /** Resolved labels for each real point to check; empty renders `checklistEmpty`. */
    checklist: string[]
    /** Resolved reminder promise, or null when none is honestly ahead. */
    reminderLine: string | null
    /** "We have tracked N past periods", or null. */
    pastPeriodsLine: string | null
    expired: boolean
    onRequestQuote?: () => void
    isRequestingQuote?: boolean
    copy: {
        title: string
        checkTitle: string
        checklistEmpty: string
        requestQuote: string
        requestingQuote: string
    }
}) {
    const headlineClass =
        headlineTone === "critical"
            ? "text-rose-700 dark:text-rose-300"
            : headlineTone === "warning"
                ? "text-amber-800 dark:text-amber-300"
                : "text-black dark:text-white"

    return (
        <div>
            <h3 className="flex items-center gap-2 text-body font-semibold text-foreground">
                <CalendarClock className="h-4 w-4 text-primary dark:text-mint" />
                {copy.title}
            </h3>
            {headline !== null && (
                <p className={`mt-3 text-body-lg font-semibold ${headlineClass}`}>{headline}</p>
            )}

            <div className="mt-4">
                <p className="flex items-center gap-1.5 text-caption font-semibold text-black/60 dark:text-white/60">
                    <ListChecks className="h-3.5 w-3.5" aria-hidden />
                    {copy.checkTitle}
                </p>
                {checklist.length === 0 ? (
                    <p className="mt-1.5 text-caption leading-snug text-muted-foreground">{copy.checklistEmpty}</p>
                ) : (
                    <ul className="mt-1.5 space-y-1.5">
                        {checklist.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" aria-hidden />
                                <span className="text-xs leading-snug text-black/75 dark:text-white/75 [overflow-wrap:anywhere]">
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {reminderLine && (
                <p className="mt-3 flex items-start gap-1.5 text-caption leading-snug text-black/65 dark:text-white/60">
                    <BellRing className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" aria-hidden />
                    {reminderLine}
                </p>
            )}
            {pastPeriodsLine && (
                <p className="mt-2 text-caption leading-snug text-muted-foreground">{pastPeriodsLine}</p>
            )}

            {expired && onRequestQuote && (
                <button
                    type="button"
                    onClick={onRequestQuote}
                    disabled={isRequestingQuote}
                    className="pw-primary-button mt-4 disabled:opacity-60"
                >
                    {isRequestingQuote ? copy.requestingQuote : copy.requestQuote}
                </button>
            )}
        </div>
    )
}
