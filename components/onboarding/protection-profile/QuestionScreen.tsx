"use client"

import { forwardRef, useId, useState } from "react"
import { Check, HelpCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UNSURE } from "@/lib/services/protection-profile/vocabulary"

export interface QuestionOption {
    value: string
    label: string
}

export interface QuestionScreenProps {
    kind: "single" | "multi"
    /** A short line above the heading, on the first question only. */
    kicker?: string
    prompt: string
    /** The one-line «Γιατί ρωτάμε». */
    why: string
    whyLabel: string
    options: QuestionOption[]
    /** single: the value; multi: the values ([] = «none of these»); or UNSURE. */
    selected: string | string[] | typeof UNSURE | undefined
    onSelect: (value: string) => void
    onToggle?: (value: string) => void
    /** multi only — the renderer-drawn «Κανένα από αυτά» (an empty array is the answer). */
    noneLabel?: string
    onNone?: () => void
    /** The «Δεν είμαι σίγουρος/η» control and its inline discovery panel. */
    unsure?: {
        label: string
        discovery: string
        proceedLabel: string
        onUnsure: () => void
    }
    /** An inline sub-choice under a chosen option (the people screen's «Πόσα;»). */
    subChoice?: {
        under: string
        label: string
        options: QuestionOption[]
        selected: string | undefined
        onSelect: (value: string) => void
    }
    /** The primary CTA; hidden while a single-select has nothing chosen. */
    cta: { label: string; onClick: () => void; disabled?: boolean; visible: boolean }
    status: "idle" | "saving" | "error"
    savingLabel: string
    retryLabel: string
    errorText: string
}

/**
 * One question, one screen. A card-less sheet on the canvas: the heading and
 * the options are the whole page, each option a white row that is a real
 * button (single) or a real checkbox (multi). Tap targets 44px throughout.
 */
export const QuestionScreen = forwardRef<HTMLHeadingElement, QuestionScreenProps>(function QuestionScreen(
    { kind, kicker, prompt, why, whyLabel, options, selected, onSelect, onToggle, noneLabel, onNone, unsure, subChoice, cta, status, savingLabel, retryLabel, errorText },
    headingRef
) {
    const groupId = useId()
    const [discoveryOpen, setDiscoveryOpen] = useState(false)
    const saving = status === "saving"
    const multiSelected = Array.isArray(selected) ? selected : null
    const noneChosen = multiSelected !== null && multiSelected.length === 0
    const row =
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left text-body font-medium text-foreground transition-colors disabled:opacity-60"
    const idle = "border-border hover:border-primary/40"
    const chosen = "border-primary ring-1 ring-primary"

    return (
        <section aria-labelledby={`${groupId}-heading`}>
            {kicker ? <p className="mb-2 text-caption font-semibold text-muted-foreground">{kicker}</p> : null}
            <h1 id={`${groupId}-heading`} ref={headingRef} tabIndex={-1} className="text-h3 font-semibold tracking-tight text-foreground outline-none">
                {prompt}
            </h1>
            <p className="mt-2 text-body text-muted-foreground">
                <span className="sr-only">{whyLabel}: </span>
                {why}
            </p>

            {kind === "single" ? (
                <ul className="mt-5 space-y-2" role="group" aria-labelledby={`${groupId}-heading`}>
                    {options.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                disabled={saving}
                                aria-pressed={option.value === selected}
                                onClick={() => onSelect(option.value)}
                                className={cn(row, option.value === selected ? chosen : idle)}
                            >
                                <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                                {option.value === selected ? (
                                    saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" /> : <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                ) : null}
                            </button>
                            {subChoice && subChoice.under === option.value && option.value === selected ? (
                                <div className="mt-2 pl-4" role="group" aria-label={subChoice.label}>
                                    <p className="text-caption font-medium text-muted-foreground">{subChoice.label}</p>
                                    <div className="pw-segmented mt-1.5">
                                        {subChoice.options.map((o) => (
                                            <button key={o.value} type="button" aria-pressed={o.value === subChoice.selected} onClick={() => subChoice.onSelect(o.value)} className="pw-segment min-h-11">
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="mt-5 space-y-2" role="group" aria-labelledby={`${groupId}-heading`}>
                    {options.map((option) => {
                        const checked = multiSelected?.includes(option.value) ?? false
                        return (
                            <li key={option.value}>
                                <label className={cn(row, "cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary", checked ? chosen : idle)}>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={checked}
                                        disabled={saving}
                                        onChange={() => onToggle?.(option.value)}
                                    />
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                                    {checked ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                                </label>
                                {subChoice && subChoice.under === option.value && checked ? (
                                    <div className="mt-2 pl-4" role="group" aria-label={subChoice.label}>
                                        <p className="text-caption font-medium text-muted-foreground">{subChoice.label}</p>
                                        <div className="pw-segmented mt-1.5">
                                            {subChoice.options.map((o) => (
                                                <button key={o.value} type="button" aria-pressed={o.value === subChoice.selected} onClick={() => subChoice.onSelect(o.value)} className="pw-segment min-h-11">
                                                    {o.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </li>
                        )
                    })}
                    {noneLabel && onNone ? (
                        <li>
                            {/* An empty array is the affirmative «none» — a person who
                                has none of these must be able to say so, or an empty
                                screen and a skipped screen would look the same. */}
                            <button type="button" disabled={saving} aria-pressed={noneChosen} onClick={onNone} className={cn(row, noneChosen ? chosen : idle)}>
                                <span>{noneLabel}</span>
                                {noneChosen ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                            </button>
                        </li>
                    ) : null}
                </ul>
            )}

            {unsure ? (
                <div className="mt-3">
                    <button
                        type="button"
                        disabled={saving}
                        aria-pressed={selected === UNSURE}
                        aria-expanded={discoveryOpen}
                        aria-controls={`${groupId}-discovery`}
                        onClick={() => setDiscoveryOpen((v) => !v)}
                        className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-muted-foreground hover:text-foreground"
                    >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        {unsure.label}
                    </button>
                    {discoveryOpen ? (
                        <div id={`${groupId}-discovery`} className="pw-subcard mt-2 p-3.5">
                            <p className="text-body-sm leading-relaxed text-foreground">{unsure.discovery}</p>
                            <button type="button" disabled={saving} onClick={unsure.onUnsure} className="pw-soft-button mt-3">
                                {unsure.proceedLabel}
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {status === "error" ? (
                <p role="alert" className="mt-4 text-caption text-status-danger">
                    {errorText}
                </p>
            ) : null}

            {cta.visible ? (
                <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6">
                    <button type="button" onClick={cta.onClick} disabled={cta.disabled || saving} aria-busy={saving} className="pw-primary-button min-h-11 w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        {status === "error" ? retryLabel : saving ? savingLabel : cta.label}
                    </button>
                </div>
            ) : null}
        </section>
    )
})
