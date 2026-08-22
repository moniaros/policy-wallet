"use client"

import { AlertTriangle, CalendarClock, CheckCircle2, Download, FileText, MessageCircle, RefreshCw, Share2, ShieldCheck } from "lucide-react"

import { formatPolicyDate } from "@/lib/wallet/policy-detail"
import { extractedField } from "@/lib/wallet/unreadable-value"
import type { Attention, PrimaryAction } from "@/lib/wallet/policy-attention"

/**
 * The head of the policy page: the four questions a customer has in the first
 * two viewports at 320px, answered once each.
 *
 *   1. What is insured?          insurer · type · plate/person · policy number
 *   2. Is it in force, until when?  ONE status, ONE date
 *   3. What needs attention?     ONE line, ONE action (or "nothing", said out loud)
 *   4. What do I do next?        ONE primary action, contextual to state
 *
 * Everything here renders EXACTLY ONCE on the page — the expiry date, the
 * status, the countdown and the policy number all had two to four render sites
 * before, and the sections below now defer to this block for all four. That is
 * what makes `data-fact` uniqueness an achievable invariant rather than a
 * wish, so each fact carries its marker here and nowhere else.
 *
 * The old hero's four-button action row is gone: three of those buttons were
 * secondary actions competing with the one that matters, and at 320px they
 * stacked into four full-width blocks before any content. Share and download
 * live in the documents section; asking the AI is the persistent affordance.
 */

export type HeadCopy = {
    policyId: string
    plateNumber: string
    valueUnreadable: string
    valueUnreadableCta: string
    /** «Ισχύει έως» / «Έληξε στις» — chosen by `expired`. */
    inForceUntil: string
    expiredOn: string
    unknownDuration: string
    attention: Record<string, string>
    attentionTitle: string
    action: Record<string, string>
    analyzing: string
}

export interface PolicyHeadProps {
    displayInsurer: string
    localizedType: string
    displayPolicyNumber: string | null
    /** Plate for motor, insured person otherwise — the "what is insured" answer. */
    insuredSubject: { label: string; value: string | null }
    endDate: string | null
    statusLabel: string
    /**
     * From `getStatusColor` — the THEMED pair, not `getStatusColorOnDark`.
     *
     * The head is a `.pw-card`: light in light mode, dark in dark mode. The
     * surface it replaced was `#111111` in both themes and therefore needed the
     * on-dark palette, a distinction that shipped wrong to production twice
     * (see tests/unit/always-dark-surfaces.test.ts). Taking the colour from the
     * one source rather than a local map is what keeps the two from drifting
     * apart again.
     */
    statusColor: { bg: string; text: string; border: string }
    daysLeft: number | null
    isAnalyzing: boolean
    attention: Attention
    primaryAction: PrimaryAction
    documentHref: string | null
    locale: string
    copy: HeadCopy
    onPrimaryAction: (action: PrimaryAction) => void
}

/** Attention states that are informational, not alarming. `clear` gets a tick. */
const ATTENTION_ICON: Record<string, typeof AlertTriangle> = {
    analysis_failed: RefreshCw,
    expired: CalendarClock,
    expiring: CalendarClock,
    items_to_review: AlertTriangle,
    unverified: FileText,
    clear: CheckCircle2,
}

const ACTION_ICON: Record<string, typeof Download> = {
    renew: CalendarClock,
    review: ShieldCheck,
    retry_analysis: RefreshCw,
    download: Download,
    share: Share2,
}

export function PolicyHead({
    displayInsurer,
    localizedType,
    displayPolicyNumber,
    insuredSubject,
    endDate,
    statusLabel,
    statusColor,
    daysLeft,
    isAnalyzing,
    attention,
    primaryAction,
    documentHref,
    locale,
    copy,
    onPrimaryAction,
}: PolicyHeadProps) {
    const policyNumberField = extractedField(displayPolicyNumber)
    const subjectField = extractedField(insuredSubject.value)
    const AttentionIcon = ATTENTION_ICON[attention.kind] || AlertTriangle
    const ActionIcon = ACTION_ICON[primaryAction.kind] || Download
    const isClear = attention.kind === "clear"

    // The attention copy carries {count} for the two states that have one.
    const attentionText = (copy.attention[attention.kind] || "").replace(
        "{count}",
        String(attention.count ?? "")
    )

    return (
        <header className="pw-card pw-pad sm:p-7">
            {/* 1 ── What is insured? ───────────────────────────────────── */}
            <p className="text-kicker font-black uppercase tracking-widest text-primary dark:text-mint">
                {localizedType}
            </p>
            <h1
                className="mt-1 text-2xl font-black leading-tight tracking-tight text-black dark:text-white sm:text-3xl"
                data-fact="policy.insurerName"
            >
                {displayInsurer}
            </h1>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div data-fact="policy.policyNumber">
                    <dt className="text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/60">
                        {copy.policyId}
                    </dt>
                    {policyNumberField.readable ? (
                        <dd className="font-mono text-sm font-bold text-black dark:text-white">
                            {policyNumberField.value}
                        </dd>
                    ) : (
                        <dd className="text-sm font-semibold italic text-black/55 dark:text-white/55">
                            {copy.valueUnreadable}
                            {documentHref && (
                                <a
                                    href={documentHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 inline-flex min-h-[44px] items-center gap-1 align-middle text-xs font-bold text-primary underline underline-offset-2 dark:text-mint"
                                >
                                    <FileText className="h-3.5 w-3.5" aria-hidden />
                                    {copy.valueUnreadableCta}
                                </a>
                            )}
                        </dd>
                    )}
                </div>

                {insuredSubject.value !== null && (
                    <div data-fact="policy.insuredSubject">
                        <dt className="text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/60">
                            {insuredSubject.label}
                        </dt>
                        {subjectField.readable ? (
                            <dd className="font-mono text-sm font-bold text-black dark:text-white">
                                {subjectField.value}
                            </dd>
                        ) : (
                            <dd className="text-sm font-semibold italic text-black/55 dark:text-white/55">
                                {copy.valueUnreadable}
                            </dd>
                        )}
                    </div>
                )}
            </dl>

            {/* 2 ── In force, until when? ──────────────────────────────── */}
            {/* ONE status and ONE date, on one line. Both were rendered two to
                four times across the page before, by components that computed
                them separately — which is how they came to disagree. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-kicker font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                    data-fact="policy.status"
                >
                    {isAnalyzing ? copy.analyzing : statusLabel}
                </span>
                <p className="text-sm font-semibold text-black/75 dark:text-white/75" data-fact="policy.expiryDate">
                    {endDate === null
                        ? copy.unknownDuration
                        : `${daysLeft !== null && daysLeft < 0 ? copy.expiredOn : copy.inForceUntil} ${formatPolicyDate(endDate, locale)}`}
                </p>
            </div>

            {/* 3 ── What needs attention? ──────────────────────────────── */}
            {/* Rendered in EVERY state, including "nothing". An empty space is
                not an all-clear, and the reader cannot tell the difference
                between "checked and fine" and "not checked" unless it is said. */}
            <div
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    isClear
                        ? "border-primary/25 bg-primary/[0.05] dark:border-mint/25 dark:bg-mint/10"
                        : "border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/5"
                }`}
                data-fact="policy.attention"
            >
                <AttentionIcon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isClear ? "text-primary dark:text-mint" : "text-black/55 dark:text-white/55"}`}
                    aria-hidden
                />
                <div className="min-w-0 flex-1">
                    <p className="text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/60">
                        {copy.attentionTitle}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-black dark:text-white">
                        {attentionText}
                    </p>
                </div>
            </div>

            {/* 4 ── What do I do next? — ONE action ────────────────────── */}
            <button
                type="button"
                onClick={() => onPrimaryAction(primaryAction)}
                className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
            >
                <ActionIcon className="h-4 w-4" aria-hidden />
                {copy.action[primaryAction.kind]}
            </button>
        </header>
    )
}

/** The persistent AI affordance — one of the two entry points the page keeps. */
export function AskAiDock({ label, onOpen }: { label: string; onOpen: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            /* `border-black/40`, not `/12`: measured at 1.04:1 against the page,
               i.e. a control whose boundary a sighted user cannot locate
               (WCAG 1.4.11 wants 3:1). The 0.5c edge-sampling pass is what
               surfaced it — the text-only contrast check reported this page
               clean. */
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/40 bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-black/[0.04] dark:border-white/45 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
            <MessageCircle className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
            {label}
        </button>
    )
}
