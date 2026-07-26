"use client"

/**
 * MEDIC scorecard — the qualification VIEW on the opportunity modal (blueprint
 * §F/§K Now: "advisors inspect & prioritize"). Read-only by design in this
 * slice: values are seeded from gaps/renewals and, in the Next slice, from
 * AI-suggested note extraction the advisor confirms. Transparent everywhere —
 * six dimensions, each 0/1/2, no black box.
 */

import { calculateMedicScore } from "@/lib/medic/score"
import type { MedicData } from "@/lib/medic/types"

interface ScorecardCopy {
    scorecardTitle: string
    scorecardHint: string
    scorecardEmpty: string
    dimMetrics: string
    dimEconomicBuyer: string
    dimDecisionCriteria: string
    dimDecisionProcess: string
    dimIdentifyPain: string
    dimChampion: string
    ratingMissing: string
    ratingPartial: string
    ratingSolid: string
    qualifiedYes: string
    qualifiedNo: string
    complianceClear: string
    complianceOpen: string
}

const RATING_STYLE: Record<0 | 1 | 2, string> = {
    0: "bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60",
    1: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    2: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
}

export function MedicScorecard({ medic, copy }: { medic: MedicData | null; copy: ScorecardCopy }) {
    const result = calculateMedicScore(medic)
    const hasAnyEvidence = medic && Object.keys(medic).length > 0

    const rows: Array<{ label: string; rating: 0 | 1 | 2; detail?: string }> = [
        { label: copy.dimIdentifyPain, rating: result.ratings.identifyPain, detail: medic?.pain?.summary ?? undefined },
        { label: copy.dimMetrics, rating: result.ratings.metrics, detail: medic?.metrics?.valueAtRisk != null ? `€${medic.metrics.valueAtRisk}` : medic?.metrics?.targetOutcome },
        { label: copy.dimEconomicBuyer, rating: result.ratings.economicBuyer, detail: medic?.stakeholders?.find((s) => s.stance === "economic_buyer")?.name },
        { label: copy.dimChampion, rating: result.ratings.champion, detail: medic?.stakeholders?.find((s) => s.stance === "champion")?.name },
        { label: copy.dimDecisionCriteria, rating: result.ratings.decisionCriteria, detail: medic?.criteria?.length ? String(medic.criteria.length) : undefined },
        { label: copy.dimDecisionProcess, rating: result.ratings.decisionProcess, detail: medic?.decisionProcess?.compellingEventAt?.slice(0, 10) ?? medic?.decisionProcess?.compellingEvent },
    ]

    const ratingLabel = (r: 0 | 1 | 2) =>
        r === 2 ? copy.ratingSolid : r === 1 ? copy.ratingPartial : copy.ratingMissing

    if (!hasAnyEvidence) {
        return (
            <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 text-xs text-black/60 dark:border-white/15 dark:bg-white/5 dark:text-white/60">
                {copy.scorecardEmpty}
            </p>
        )
    }

    return (
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-black dark:text-white">{result.score}</span>
                    <span className="text-kicker text-black/55 dark:text-white/55">/100</span>
                    <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${result.qualified ? RATING_STYLE[2] : RATING_STYLE[0]}`}>
                        {result.qualified ? copy.qualifiedYes : copy.qualifiedNo}
                    </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${result.complianceClear ? RATING_STYLE[2] : RATING_STYLE[1]}`}>
                    {result.complianceClear ? copy.complianceClear : copy.complianceOpen}
                </span>
            </div>
            <ul className="space-y-1">
                {rows.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-black/70 dark:text-white/70">{row.label}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                            {row.detail && (
                                <span className="max-w-[160px] truncate text-black/55 dark:text-white/55">{row.detail}</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${RATING_STYLE[row.rating]}`}>
                                {ratingLabel(row.rating)}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-micro leading-snug text-black/55 dark:text-white/55">{copy.scorecardHint}</p>
        </div>
    )
}
