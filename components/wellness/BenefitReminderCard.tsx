"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { BellRing, FileText, MessageCircle, Phone } from "lucide-react"
import { SourceSnippetBox } from "@/components/ui/SourceSnippetBox"
import { TONE_CHIP } from "@/lib/wallet/policy-status-view"
import { formatCurrency, formatDate } from "@/lib/i18n/format"
import type { CheckupBenefit } from "@/lib/wellness/checkup-benefit"
import { setCheckupIntent } from "@/app/(protected)/wellness/actions"
import { startBranchActionThread } from "@/app/(protected)/wallet/collaborationActions"
import type { el } from "@/lib/i18n/translations/el"

type Copy = (typeof el)["wellness"]["benefit"]
type Choice = "considering" | "done" | "not_relevant" | "later"

/**
 * Prevention brief P0/P1 — the blue Benefit Reminder: what ONE health
 * policy's reading says about an annual check-up, the document's own words
 * when a verified citation exists, the next steps the evidence supports, and
 * the person's own choice. Booking is never offered: no integration exists.
 */
export function BenefitReminderCard({ policyId, label, benefit, value, usage, advisorAvailable, window, year, locale, copy }: {
    policyId: string
    label: string
    benefit: CheckupBenefit
    /** The raw stated value, to word an unverified `false` honestly. */
    value: boolean | null
    usage: { status: string; intent: string | null; remindAt: string | null }
    advisorAvailable: boolean
    window: { min: string; max: string }
    year: number
    locale: "el" | "en"
    copy: Copy
}) {
    const [pending, start] = useTransition()
    const [picking, setPicking] = useState(false)
    const [date, setDate] = useState(window.min)
    const [message, setMessage] = useState<string | null>(null)
    const [state, setState] = useState(usage)

    const sentence = (() => {
        const fill = (s: string) => s.replace("{label}", label)
        switch (benefit.state) {
            case "confirmed_by_document": return fill(copy.confirmed)
            case "needs_confirmation": return fill(value === false ? copy.unverifiedFalse : copy.needsConfirmation)
            case "stated_not_included": return fill(copy.statedNotIncluded)
            case "expired": return fill(copy.expired)
            default: return fill(copy.notRecorded)
        }
    })()

    const choose = (choice: Choice | "clear", remindAt?: string) =>
        start(async () => {
            const res = await setCheckupIntent({ policyId, choice, remindAt })
            if (!("ok" in res)) { setMessage(null); return }
            setPicking(false)
            setState({
                status: choice === "done" ? "completed" : "available",
                intent: choice === "done" || choice === "clear" ? null : choice,
                remindAt: choice === "later" ? remindAt ?? null : null,
            })
            setMessage(
                choice === "later" ? copy.confirmedLater.replace("{date}", formatDate(`${remindAt}T00:00:00Z`, locale))
                : choice === "done" ? copy.confirmedDone.replace("{year}", String(year))
                : choice === "not_relevant" ? copy.confirmedNotRelevant
                : choice === "considering" ? copy.confirmedConsidering
                : null
            )
        })

    const ask = () =>
        start(async () => {
            const res = await startBranchActionThread(policyId, "health_checkup_terms")
            setMessage("success" in res ? copy.askSent : res.error === "UPGRADE_REQUIRED" ? copy.askNeedsPlan : null)
        })

    const actionable = benefit.state === "confirmed_by_document" || (benefit.state === "needs_confirmation" && value === true)
    const settled = state.status === "completed" || state.intent === "not_relevant" || (state.intent === "later" && state.remindAt !== null)

    return (
        <article className="pw-subcard p-4" data-fact="wellness.checkupBenefit" data-fact-subject={policyId} data-fact-value={benefit.state}>
            {actionable && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold ${TONE_CHIP.info}`}>
                    <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.kicker}
                </span>
            )}
            <p className="mt-2 text-sm font-semibold text-foreground">{sentence}</p>

            {actionable && benefit.citation && (
                <SourceSnippetBox className="mt-3" snippet={benefit.citation.snippet} page={benefit.citation.page} labels={{ fromDocument: copy.fromDocument, pageAbbrev: copy.pageAbbrev }} />
            )}
            {actionable && benefit.details.length > 0 && (
                <div className="mt-3">
                    <p className="text-caption text-muted-foreground">{copy.detailsIntro}</p>
                    <dl className="mt-1 space-y-1 text-sm">
                        {benefit.details.map((d) => (
                            <div key={d.key} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                                <dt className="text-caption text-muted-foreground">{copy.detailLabels[d.key]}</dt>
                                <dd className="min-w-0 break-words text-foreground">
                                    {d.key === "limitAmount" && typeof d.value === "number"
                                        ? formatCurrency(d.value, locale)
                                        : d.key === "waitingPeriodDays" && typeof d.value === "number"
                                            ? copy.daysValue.replace("{n}", String(d.value))
                                            : Array.isArray(d.value) ? d.value.join(" · ") : String(d.value)}
                                    {d.page !== undefined && <span className="text-caption text-muted-foreground"> · {copy.pageAbbrev} {d.page}</span>}
                                    {!d.verified && <span className="block text-caption text-muted-foreground">{copy.termUnverified}</span>}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {benefit.coreTermsMissing && <p className="mt-1 text-caption text-muted-foreground">{copy.coreMissing}</p>}
                </div>
            )}
            {actionable && benefit.details.length === 0 && (
                <p className="mt-2 text-caption text-muted-foreground">
                    {benefit.conditions.length > 0 ? copy.conditionsKnown.replace("{limits}", benefit.conditions.join(" · ")) : copy.conditionsUnknown}
                </p>
            )}

            {actionable && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link href={`/wallet/${policyId}#coverage`} className="pw-soft-button inline-flex">
                        <FileText className="h-4 w-4" aria-hidden="true" />{copy.actionTerms}
                    </Link>
                    {benefit.contactPhone ? (
                        <a href={`tel:${benefit.contactPhone.replace(/\s+/g, "")}`} className="pw-soft-button inline-flex h-auto max-w-full flex-col items-start py-2 text-left">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-1"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{copy.actionCall}</span><span className="whitespace-nowrap font-semibold">{benefit.contactPhone}</span></span>
                            <span className="text-caption text-muted-foreground">{copy.actionCallNote}</span>
                        </a>
                    ) : null}
                    {advisorAvailable && (
                        <button type="button" disabled={pending} onClick={ask} className="pw-soft-button inline-flex">
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />{copy.actionAsk}
                        </button>
                    )}
                </div>
            )}
            {actionable && !benefit.contactPhone && <p className="mt-2 text-caption text-muted-foreground">{copy.noPhone}</p>}
            {actionable && <p className="mt-1 text-caption text-muted-foreground">{copy.noBooking}</p>}

            {actionable && (
                <fieldset className="mt-4 min-w-0" data-fact="wellness.checkupIntent" data-fact-subject={policyId} data-fact-value={state.status === "completed" ? "done" : state.intent ?? "none"}>
                    <legend className="text-sm font-semibold text-foreground">{copy.intentLabel}</legend>
                    {settled ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-sm text-foreground">{message ?? (state.status === "completed" ? copy.confirmedDone.replace("{year}", String(year)) : state.intent === "not_relevant" ? copy.confirmedNotRelevant : copy.confirmedLater.replace("{date}", formatDate(`${state.remindAt}T00:00:00Z`, locale)))}</p>
                            <button type="button" disabled={pending} onClick={() => choose("clear")} className="pw-soft-button">{copy.undo}</button>
                        </div>
                    ) : (
                        <>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(["considering", "done", "not_relevant", "later"] as const).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        disabled={pending}
                                        aria-pressed={state.intent === c}
                                        onClick={() => (c === "later" ? setPicking(true) : choose(c))}
                                        className={`rounded-full border px-3 py-1.5 text-sm ${state.intent === c ? "border-primary bg-primary-tint text-primary dark:bg-primary/10 dark:text-mint" : "border-border text-foreground"}`}
                                    >
                                        {copy.intents[c]}
                                    </button>
                                ))}
                            </div>
                            {picking && (
                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                    <label className="text-sm text-foreground">
                                        <span className="block">{copy.remindPrompt}</span>
                                        <input type="date" className="pw-input mt-1 h-10 w-auto" min={window.min} max={window.max} value={date} onChange={(e) => setDate(e.target.value)} />
                                    </label>
                                    <button type="button" disabled={pending || !date} onClick={() => choose("later", date)} className="pw-primary-button">{copy.remindSave}</button>
                                </div>
                            )}
                            {message && <p role="status" className="mt-2 text-caption text-muted-foreground">{message}</p>}
                        </>
                    )}
                </fieldset>
            )}
        </article>
    )
}
