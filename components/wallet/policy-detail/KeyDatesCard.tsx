"use client"

import { Calendar, RefreshCw } from "lucide-react"

import { RenewalRemindersList } from "@/components/wallet/policy-detail/RenewalRemindersList"
import { SourceSnippetBox } from "@/components/ui/SourceSnippetBox"
import { GlossaryHint, type GlossaryHintData } from "@/components/insurance/GlossaryHint"
import {
    formatPolicyDate,
    parsePolicyDate,
    type PolicyRenewalEntry,
    type RenewalHistoryEntry,
} from "@/lib/wallet/policy-detail"

interface KeyDatesCardProps {
    startDate: string | null
    endDate: string | null
    /** Extracted renewal date from acordData.policy — often differs from the end date. */
    renewalDate: string | null
    /**
     * Glossary hint for "renewal", resolved server-side. Wraps the renewal-date
     * label so a policyholder can learn — at the point of reading — what renewal
     * means and what happens if a policy is not renewed. Null hides the hint.
     */
    renewalHint?: GlossaryHintData | null
    /**
     * Glossary hint for "lapse", rendered ONLY when the policy has expired — a
     * novice reading «Έληξε» rarely knows it means "no cover for new losses right
     * now". Shown at that exact moment, next to the expired status. Null hides it.
     */
    lapseHint?: GlossaryHintData | null
    /** null = no trustworthy end date — the countdown tile is hidden entirely. */
    daysLeft: number | null
    statusLabel: string
    statusColor: { bg: string; text: string; border: string }
    hasAutoRenewal: boolean
    renewalHistory: RenewalHistoryEntry[]
    renewals: PolicyRenewalEntry[]
    locale: string
    /** When provided, renders a "request renewal quote" CTA (owner only). */
    onRequestQuote?: () => void
    isRequestingQuote?: boolean
    /** Document citations for the extracted dates (flag-gated feature). */
    dateSources?: {
        endDate?: { page?: number; snippet?: string }
        renewalDate?: { page?: number; snippet?: string }
    }
    sourceLabels?: { fromDocument: string; pageAbbrev: string }
    /**
     * Branch-specific renewal note from lib/insurance/content, already resolved
     * to one language by the caller. Rendered as a hedged footnote under the
     * renewal block — editorial context, not extracted data.
     */
    renewalNote?: string | null
    copy: {
        keyDatesTitle: string
        startedOn: string
        expiresOn: string
        expiredOn: string
        renewalDateLabel: string
        renewalStatusLabel: string
        periodProgress: string
        autoRenewalNote: string
        renewalHistory: string
        noRenewalHistory: string
        expiresIn: string
        days: string
        requestQuote: string
        requestingQuote: string
        reminders: {
            title: string
            periodEnding: string
            daysBeforeExpiry: string
            statuses: Record<string, string>
        }
    }
}

/**
 * Key dates & renewal status: policy period timeline with elapsed progress,
 * renewal status pill, auto-renewal warning and past renewal history.
 */
export function KeyDatesCard({
    startDate,
    endDate,
    renewalDate,
    renewalHint,
    lapseHint,
    daysLeft,
    statusLabel,
    statusColor,
    hasAutoRenewal,
    renewalHistory,
    renewals,
    locale,
    onRequestQuote,
    isRequestingQuote = false,
    dateSources,
    sourceLabels,
    renewalNote,
    copy,
}: KeyDatesCardProps) {
    const citedSource = dateSources?.renewalDate ?? dateSources?.endDate
    const start = parsePolicyDate(startDate)
    const end = parsePolicyDate(endDate)
    const hasCountdown = daysLeft !== null && end !== null
    const isExpired = hasCountdown && (daysLeft as number) < 0
    const isExpiringSoon = hasCountdown && (daysLeft as number) >= 0 && (daysLeft as number) <= 30

    const elapsedPct = (() => {
        if (!start || !end || end.getTime() <= start.getTime()) return null
        const pct = ((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100
        return Math.max(0, Math.min(100, Math.round(pct)))
    })()

    return (
        <div className="pw-card pw-pad sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                    <Calendar className="h-4 w-4 text-primary dark:text-mint" />
                    {copy.keyDatesTitle}
                </h2>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-kicker font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                    {copy.renewalStatusLabel}: {statusLabel}
                </span>
            </div>

            {/* When the policy has expired, explain what that means for cover at
                the exact moment the reader sees the status — a novice rarely
                knows «Έληξε» means "no cover for new losses right now". */}
            {isExpired && lapseHint && (
                <p className="-mt-2 mb-5 text-caption text-black/60 dark:text-white/60">
                    <GlossaryHint hint={lapseHint} />
                </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <p className="mb-1 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">{copy.startedOn}</p>
                    <p className="text-sm font-bold text-black dark:text-white">{formatPolicyDate(startDate, locale)}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <p className="mb-1 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                        {isExpired ? copy.expiredOn : copy.expiresOn}
                    </p>
                    <p className="text-sm font-bold text-black dark:text-white">{formatPolicyDate(endDate, locale)}</p>
                </div>
                {/* Countdown only with a REAL future end date — no end date,
                    no fabricated "365 days" next to a "-" expiry tile. */}
                {hasCountdown && !isExpired && (
                    <div
                        className={`rounded-2xl border px-4 py-3 ${
                            isExpiringSoon
                                ? "border-amber-200 bg-[#FEF3C7]/60 dark:border-amber-900/40 dark:bg-amber-950/20"
                                : "border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/5"
                        }`}
                    >
                        <p className="mb-1 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">{copy.expiresIn}</p>
                        <p
                            className={`text-sm font-bold ${
                                isExpiringSoon ? "text-[#92400E] dark:text-amber-400" : "text-black dark:text-white"
                            }`}
                        >
                            {daysLeft} {copy.days}
                        </p>
                    </div>
                )}
                {renewalDate && (
                    <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                        <p className="mb-1 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                            {renewalHint ? <GlossaryHint hint={renewalHint} /> : copy.renewalDateLabel}
                        </p>
                        <p className="text-sm font-bold text-black dark:text-white">{formatPolicyDate(renewalDate, locale)}</p>
                    </div>
                )}
            </div>

            {elapsedPct !== null && (
                <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isExpired ? "bg-red-400" : elapsedPct >= 90 ? "bg-amber-400" : "bg-primary dark:bg-mint"}`}
                            style={{ width: `${elapsedPct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {elapsedPct}% {copy.periodProgress}
                    </p>
                </div>
            )}

            {hasAutoRenewal && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#92400E] dark:text-amber-400" />
                    <p className="text-xs font-medium leading-relaxed text-[#92400E] dark:text-amber-300">{copy.autoRenewalNote}</p>
                </div>
            )}

            {/* Branch-specific renewal context — editorial, hedged, and kept
                plain so it never reads as an extracted date. */}
            {renewalNote && (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{renewalNote}</p>
            )}

            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                <h3 className="mb-3 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">{copy.renewalHistory}</h3>
                {renewalHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{copy.noRenewalHistory}</p>
                ) : (
                    <ul className="space-y-2">
                        {renewalHistory.map((entry) => (
                            <li
                                key={entry.id}
                                className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/15 dark:bg-white/5"
                            >
                                <p className="text-sm font-semibold text-black dark:text-white">
                                    {formatPolicyDate(entry.startDate, locale)} - {formatPolicyDate(entry.endDate, locale)}
                                </p>
                                {entry.sourceDocumentName ? (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.sourceDocumentName}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {citedSource && sourceLabels && (
                <SourceSnippetBox
                    snippet={citedSource.snippet}
                    page={citedSource.page}
                    labels={sourceLabels}
                    className="mt-4"
                />
            )}

            <RenewalRemindersList renewals={renewals} locale={locale} copy={copy.reminders} />

            {onRequestQuote && (
                <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                    {/* Expired policy: requesting a renewal quote IS the next
                        step — promote to the primary action. */}
                    <button
                        onClick={onRequestQuote}
                        disabled={isRequestingQuote}
                        className={
                            isExpired
                                ? "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 dark:text-[#1A2420] cursor-pointer disabled:cursor-default sm:w-auto"
                                : "inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60 dark:border-mint/35 dark:bg-mint/10 dark:text-mint dark:hover:bg-mint/15 cursor-pointer disabled:cursor-default"
                        }
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRequestingQuote ? "animate-spin" : ""}`} aria-hidden />
                        {isRequestingQuote ? copy.requestingQuote : copy.requestQuote}
                    </button>
                </div>
            )}
        </div>
    )
}
