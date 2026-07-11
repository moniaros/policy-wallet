"use client"

import { Calendar, RefreshCw, Sparkles } from "lucide-react"

interface RenewalHistoryEntry {
    id: string
    startDate: string | null
    endDate: string | null
    sourceDocumentName: string | null
}

interface KeyDatesCardProps {
    startDate: string | null
    endDate: string | null
    daysLeft: number
    statusLabel: string
    statusColor: { bg: string; text: string; border: string }
    hasAutoRenewal: boolean
    renewalHistory: RenewalHistoryEntry[]
    locale: string
    copy: {
        keyDatesTitle: string
        startedOn: string
        expiresOn: string
        expiredOn: string
        renewalStatusLabel: string
        periodProgress: string
        autoRenewalNote: string
        renewalHistory: string
        noRenewalHistory: string
        requestRenewal: string
        expiresIn: string
        days: string
    }
    onRequestRenewal: () => void
}

function parseDate(value: unknown): Date | null {
    if (!value) return null
    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: unknown, locale: string): string {
    const parsed = parseDate(value)
    if (!parsed) return "-"
    return parsed.toLocaleDateString(locale)
}

/**
 * Key dates & renewal status: policy period timeline with elapsed progress,
 * renewal status pill, auto-renewal warning and past renewal history.
 */
export function KeyDatesCard({
    startDate,
    endDate,
    daysLeft,
    statusLabel,
    statusColor,
    hasAutoRenewal,
    renewalHistory,
    locale,
    copy,
    onRequestRenewal,
}: KeyDatesCardProps) {
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    const isExpired = daysLeft < 0
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30

    const elapsedPct = (() => {
        if (!start || !end || end.getTime() <= start.getTime()) return null
        const pct = ((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100
        return Math.max(0, Math.min(100, Math.round(pct)))
    })()

    return (
        <div className="pw-card p-6 sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                    <Calendar className="h-4 w-4 text-primary dark:text-mint" />
                    {copy.keyDatesTitle}
                </h2>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                    {copy.renewalStatusLabel}: {statusLabel}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">{copy.startedOn}</p>
                    <p className="text-sm font-bold text-black dark:text-white">{formatDate(startDate, locale)}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/15 dark:bg-white/5">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                        {isExpired ? copy.expiredOn : copy.expiresOn}
                    </p>
                    <p className="text-sm font-bold text-black dark:text-white">{formatDate(endDate, locale)}</p>
                </div>
                {!isExpired && (
                    <div
                        className={`rounded-2xl border px-4 py-3 ${
                            isExpiringSoon
                                ? "border-amber-200 bg-[#FEF3C7]/60 dark:border-amber-900/40 dark:bg-amber-950/20"
                                : "border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/5"
                        }`}
                    >
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">{copy.expiresIn}</p>
                        <p
                            className={`text-sm font-bold ${
                                isExpiringSoon ? "text-[#B45309] dark:text-amber-400" : "text-black dark:text-white"
                            }`}
                        >
                            {daysLeft} {copy.days}
                        </p>
                    </div>
                )}
            </div>

            {elapsedPct !== null && (
                <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isExpired ? "bg-red-400" : elapsedPct >= 90 ? "bg-amber-400" : "bg-primary dark:bg-mint"}`}
                            style={{ width: `${elapsedPct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-black/55 dark:text-white/60">
                        {elapsedPct}% {copy.periodProgress}
                    </p>
                </div>
            )}

            {hasAutoRenewal && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B45309] dark:text-amber-400" />
                    <p className="text-xs font-medium leading-relaxed text-[#B45309] dark:text-amber-300">{copy.autoRenewalNote}</p>
                </div>
            )}

            {(isExpired || isExpiringSoon || daysLeft <= 60) && (
                <button
                    onClick={onRequestRenewal}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420] cursor-pointer sm:w-auto sm:px-6"
                >
                    <Sparkles className="h-4 w-4" />
                    {copy.requestRenewal}
                </button>
            )}

            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">{copy.renewalHistory}</h3>
                {renewalHistory.length === 0 ? (
                    <p className="text-xs text-black/55 dark:text-white/60">{copy.noRenewalHistory}</p>
                ) : (
                    <ul className="space-y-2">
                        {renewalHistory.map((entry) => (
                            <li
                                key={entry.id}
                                className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/15 dark:bg-white/5"
                            >
                                <p className="text-sm font-semibold text-black dark:text-white">
                                    {formatDate(entry.startDate, locale)} - {formatDate(entry.endDate, locale)}
                                </p>
                                {entry.sourceDocumentName ? (
                                    <p className="mt-0.5 text-xs text-black/55 dark:text-white/60">{entry.sourceDocumentName}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
