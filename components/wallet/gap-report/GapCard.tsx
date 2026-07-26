"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, EyeOff, Lightbulb, MessageSquare } from "lucide-react"

import { firstSentence, type GapReportItem } from "@/lib/wallet/gap-report"
import { MECHANIC_CHIP_KEY } from "./chips"

interface GapCardProps {
    item: GapReportItem
    lang: "el" | "en"
    copy: {
        mechanicChip: Record<string, string>
        /** Evidence-ladder labels: probable / confirmed / validated. */
        validationChip: Record<string, string>
        expand: string
        collapse: string
        recommendation: string
        hide: string
        sending: string
        notifyAgent: string
    }
    onIgnore: (ids: string[]) => void
    onNotify: (id: string) => void
    ignoring: boolean
    notifying: boolean
}

/**
 * One gap, collapsed to ~3 lines (title + one-liner + mechanic chip);
 * expanding reveals the full explanation and the nested coverage proposal.
 * Neutral styling by design — severity values are unvalidated and never
 * surface here.
 */
export function GapCard({ item, lang, copy, onIgnore, onNotify, ignoring, notifying }: GapCardProps) {
    const [expanded, setExpanded] = useState(false)

    const title = lang === "el" ? item.content.titleEl : item.content.titleEn
    const explanation =
        lang === "el"
            ? item.aiExplanationEl || item.aiExplanation
            : item.aiExplanation || item.aiExplanationEl
    const suggestion =
        lang === "el"
            ? item.aiSuggestionEl || item.aiSuggestion
            : item.aiSuggestion || item.aiSuggestionEl
    const mechanicLabel = copy.mechanicChip[MECHANIC_CHIP_KEY[item.content.mechanic]]
    // Evidence ladder: an AI-detected gap says «Πιθανό» until an advisor confirms
    // it — the honesty chip that separates a probable finding from a validated
    // recommendation (never "MEDIC" in customer-facing copy).
    const validationLabel = copy.validationChip[item.validationState ?? "probable"]

    return (
        <div className="rounded-xl border border-black/10 bg-white transition-all dark:border-white/15 dark:bg-white/5">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-3 p-4 text-left"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-black dark:text-white">{title}</h4>
                        <span className="rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                            {mechanicLabel}
                        </span>
                        {validationLabel && (
                            <span
                                className={
                                    item.validationState === "validated"
                                        ? "rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-mint"
                                        : item.validationState === "confirmed"
                                          ? "rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-primary/90 dark:border-primary/30 dark:bg-primary/10 dark:text-mint/90"
                                          : "rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60"
                                }
                            >
                                {validationLabel}
                            </span>
                        )}
                    </div>
                    {!expanded && explanation && (
                        <p className="mt-1 text-xs leading-relaxed text-black/55 dark:text-white/60">
                            {firstSentence(explanation)}
                        </p>
                    )}
                </div>
                <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-semibold text-primary dark:text-mint">
                    {expanded ? copy.collapse : copy.expand}
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
            </button>

            {expanded && (
                <div className="border-t border-black/5 px-4 pb-4 pt-3 dark:border-white/10">
                    {explanation && (
                        <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">{explanation}</p>
                    )}

                    {suggestion && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/30">
                            <div className="flex items-start gap-2">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                                <div>
                                    <p className="mb-1 text-xs font-bold text-amber-900 dark:text-amber-100">
                                        {copy.recommendation}
                                    </p>
                                    <p className="text-xs text-amber-800 dark:text-amber-200">{suggestion}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onIgnore([item.id, ...item.duplicateIds])}
                            disabled={ignoring}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black/60 transition-colors hover:bg-black/5 hover:text-black/70 disabled:opacity-50 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white/75"
                        >
                            <EyeOff className="h-3.5 w-3.5" />
                            {copy.hide}
                        </button>
                        <button
                            type="button"
                            onClick={() => onNotify(item.id)}
                            disabled={notifying}
                            className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-mint dark:hover:bg-white/10"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {notifying ? copy.sending : copy.notifyAgent}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
