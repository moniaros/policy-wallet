"use client"

import { Lock } from "lucide-react"

import type { GapReportItem } from "@/lib/wallet/gap-report"
import { MECHANIC_CHIP_KEY } from "./chips"

interface LockedGapCardProps {
    item: GapReportItem
    lang: "el" | "en"
    copy: {
        mechanicChip: Record<string, string>
        lockedHint: string
    }
}

/**
 * Locked gap: the FACTS (real title + mechanic chip) stay fully visible —
 * no teaser fakery — while the explanation/proposal body is blurred.
 * Deliberately carries NO CTA of its own: the single unlock CTA lives once
 * at the lock boundary (ReportUnlockCta).
 */
export function LockedGapCard({ item, lang, copy }: LockedGapCardProps) {
    const title = lang === "el" ? item.content.titleEl : item.content.titleEn
    const explanation =
        lang === "el"
            ? item.aiExplanationEl || item.aiExplanation
            : item.aiExplanation || item.aiExplanationEl
    const mechanicLabel = copy.mechanicChip[MECHANIC_CHIP_KEY[item.content.mechanic]]

    return (
        <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-white/5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-black dark:text-white">{title}</h4>
                        <span className="rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                            {mechanicLabel}
                        </span>
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none mt-2 select-none blur-[6px]"
                    >
                        <p className="line-clamp-2 text-xs leading-relaxed text-black/55 dark:text-white/60">
                            {explanation}
                        </p>
                    </div>
                    <p className="sr-only">{copy.lockedHint}</p>
                </div>
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-black/35 dark:text-white/40" />
            </div>
        </div>
    )
}
