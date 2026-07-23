"use client"

import { ShieldAlert } from "lucide-react"

import type { GapCoverageArea, GapMechanic } from "@/lib/wallet/gap-report"
import { AREA_CHIP_KEY, MECHANIC_CHIP_KEY } from "./chips"

interface GapReportSummaryBandProps {
    summary: {
        total: number
        byMechanic: Partial<Record<GapMechanic, number>>
        byArea: Partial<Record<GapCoverageArea, number>>
    }
    copy: {
        summaryFoundPrefix: string
        summaryFoundOne: string
        summaryFoundMany: string
        mechanics: Record<string, string>
        areas: Record<string, string>
    }
}

/**
 * The 5-second read: how many gaps and where they concentrate. Deterministic
 * dimensions only (mechanics + coverage areas) — deliberately NO severity
 * labels, scores, or € figures (severities are unvalidated placeholders).
 */
export function GapReportSummaryBand({ summary, copy }: GapReportSummaryBandProps) {
    if (summary.total === 0) return null

    const mechanicChips = (Object.entries(summary.byMechanic) as Array<[GapMechanic, number]>)
        .filter(([, count]) => count > 0)
    const areaChips = (Object.entries(summary.byArea) as Array<[GapCoverageArea, number]>)
        .filter(([, count]) => count > 0)

    return (
        <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/15 dark:bg-white/5">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15">
                    <ShieldAlert className="h-4.5 w-4.5 text-primary dark:text-mint" />
                </div>
                <p className="text-sm font-bold text-black dark:text-white">
                    {copy.summaryFoundPrefix} {summary.total}{" "}
                    {summary.total === 1 ? copy.summaryFoundOne : copy.summaryFoundMany}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {mechanicChips.map(([mechanic, count]) => (
                    <span
                        key={mechanic}
                        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-micro font-semibold text-black/70 dark:border-white/15 dark:bg-white/10 dark:text-white/75"
                    >
                        {copy.mechanics[MECHANIC_CHIP_KEY[mechanic]]} · {count}
                    </span>
                ))}
                {areaChips.map(([area, count]) => (
                    <span
                        key={area}
                        className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-micro font-semibold text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-mint"
                    >
                        {copy.areas[AREA_CHIP_KEY[area]]} · {count}
                    </span>
                ))}
            </div>
        </div>
    )
}
