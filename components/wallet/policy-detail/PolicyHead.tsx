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
 * live in the documents section; asking the AI is the persistent affordance —
 * rendered at the foot of THIS card (see `askAi` below), not as a free-standing
 * block between the head and the summary.
 *
 * Direction A (2026-09-03): the uppercase tracked labels and the monospace
 * values are gone — Greek capitals drop their accents, and a policy number is
 * not code. Labels are sentence-case captions, values are body weight, the
 * attention line is a sunken sub-card, and the two actions are the product's
 * two button shapes: the green primary (DO) and the grey soft pill (ASK).
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
    /** Per-kind override for the label, when "needs attention" would misdescribe the state. */
    attentionTitleByKind?: Record<string, string>
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
    /**
     * The persistent ask-AI affordance, rendered INSIDE the head card since
     * 2026-08-26 (P5-detail-goal2-01). It used to stand alone between the head
     * and the summary — a ninth top-level grouping on a page budgeted for
     * eight, and a stray block belonging to no group. It is Q4's other half:
     * the head answers "what do I do next" with one DO action and one ASK
     * action, in one boundary. Optional so the head stays renderable on
     * surfaces with no Q&A; the primary action must remain the header's FIRST
     * button (the ten-second test reads it positionally).
     */
    askAi?: { label: string; onOpen: () => void }
}

/** Attention states that are informational, not alarming. `clear` gets a tick. */
const ATTENTION_ICON: Record<string, typeof AlertTriangle> = {
    analysis_failed: RefreshCw,
    renewal_under_review: RefreshCw,
    renewal_mismatch: AlertTriangle,
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

/** The calendar states — the one place the head spends amber (gap/expiring rule). */
const CALENDAR_ATTENTION = new Set(["expired", "expiring"])

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
    askAi,
}: PolicyHeadProps) {
    const policyNumberField = extractedField(displayPolicyNumber)
    const subjectField = extractedField(insuredSubject.value)
    const AttentionIcon = ATTENTION_ICON[attention.kind] || AlertTriangle
    const ActionIcon = ACTION_ICON[primaryAction.kind] || Download
    const isClear = attention.kind === "clear"
    const isCalendar = CALENDAR_ATTENTION.has(attention.kind)

    // The attention copy carries {count} for the two states that have one.
    const attentionText = Object.entries(attention.values ?? {}).reduce(
        (text, [key, value]) => text.split(`{${key}}`).join(value),
        (copy.attention[attention.kind] || "").replace("{count}", String(attention.count ?? ""))
    )

    const label = "text-caption font-medium text-muted-foreground"
    const unreadable = "mt-0.5 text-sm italic text-muted-foreground"

    return (
        <header className="pw-card pw-pad sm:p-7">
            {/* 1 ── What is insured? ───────────────────────────────────── */}
            <p className="text-caption font-semibold text-muted-foreground">{localizedType}</p>
            <h1
                className="mt-1 text-title font-semibold leading-tight tracking-tight text-foreground sm:text-h3"
                data-fact="policy.insurerName"
            >
                {displayInsurer}
            </h1>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div data-fact="policy.policyNumber">
                    <dt className={label}>{copy.policyId}</dt>
                    {policyNumberField.readable ? (
                        <dd className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
                            {policyNumberField.value}
                        </dd>
                    ) : (
                        <dd className={unreadable}>
                            {copy.valueUnreadable}
                            {documentHref && (
                                <a
                                    href={documentHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 inline-flex min-h-11 items-center gap-1 align-middle text-caption font-semibold not-italic text-primary underline underline-offset-2 dark:text-mint"
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
                        <dt className={label}>{insuredSubject.label}</dt>
                        {subjectField.readable ? (
                            <dd className="mt-0.5 text-sm font-semibold text-foreground">{subjectField.value}</dd>
                        ) : (
                            <dd className={unreadable}>{copy.valueUnreadable}</dd>
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
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-semibold ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                    data-fact="policy.status"
                >
                    {isAnalyzing ? copy.analyzing : statusLabel}
                </span>
                <p className="text-sm font-medium text-foreground" data-fact="policy.expiryDate">
                    {endDate === null
                        ? copy.unknownDuration
                        : `${daysLeft !== null && daysLeft < 0 ? copy.expiredOn : copy.inForceUntil} ${formatPolicyDate(endDate, locale)}`}
                </p>
            </div>

            {/* 3 ── What needs attention? ──────────────────────────────── */}
            {/* Rendered in EVERY state, including "nothing". An empty space is
                not an all-clear, and the reader cannot tell the difference
                between "checked and fine" and "not checked" unless it is said. */}
            <div className="pw-subcard mt-5 flex items-start gap-3 px-4 py-3" data-fact="policy.attention">
                <AttentionIcon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isClear ? "text-primary dark:text-mint" : isCalendar ? "text-status-warning" : "text-muted-foreground"
                    }`}
                    aria-hidden
                />
                <div className="min-w-0 flex-1">
                    <p className={label}>{copy.attentionTitleByKind?.[attention.kind] ?? copy.attentionTitle}</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{attentionText}</p>
                </div>
            </div>

            {/* 4 ── What do I do next? — ONE action, plus the ASK affordance ── */}
            {/* Always in this order: the ten-second test reads the header's
                first <button> as "what do I do next". */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                    type="button"
                    onClick={() => onPrimaryAction(primaryAction)}
                    className="pw-primary-button w-full sm:w-auto"
                >
                    <ActionIcon className="h-4 w-4" aria-hidden />
                    {copy.action[primaryAction.kind]}
                </button>
                {askAi && <AskAiDock label={askAi.label} onOpen={askAi.onOpen} />}
            </div>
        </header>
    )
}

/** The persistent AI affordance — one of the two entry points the page keeps. */
export function AskAiDock({ label, onOpen }: { label: string; onOpen: () => void }) {
    return (
        <button type="button" onClick={onOpen} className="pw-soft-button w-full cursor-pointer sm:w-auto">
            <MessageCircle className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
            {label}
        </button>
    )
}
