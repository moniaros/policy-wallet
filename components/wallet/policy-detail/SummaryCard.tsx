"use client"

import { AlertTriangle, Calendar, FileText, ShieldCheck, ShieldOff, Sparkles } from "lucide-react"

import type { PolicyHealthScore } from "@/lib/wallet/policy-detail"

interface SummaryCardProps {
    summary: string
    health: PolicyHealthScore
    isAnalyzing: boolean
    coverageCount: number
    exclusionCount: number
    conditionsCount: number
    perkCount: number
    daysLeft: number | null
    copy: {
        summaryTitle: string
        summaryAiChip: string
        healthTitle: string
        healthLevels: Record<string, string>
        atAGlance: string
        glanceCoverages: string
        glanceExclusions: string
        glanceConditions: string
        glancePerks: string
        days: string
    }
}

const HEALTH_COLOR: Record<string, string> = {
    good: "text-primary dark:text-mint",
    moderate: "text-amber-500 dark:text-amber-400",
    attention: "text-red-500 dark:text-red-400",
}

/**
 * Plain-language AI summary with the per-policy health donut and
 * at-a-glance chips that deep-link to the relevant sections.
 */
export function SummaryCard({
    summary,
    health,
    isAnalyzing,
    coverageCount,
    exclusionCount,
    conditionsCount,
    perkCount,
    daysLeft,
    copy,
}: SummaryCardProps) {
    const healthColorClass = HEALTH_COLOR[health.level] || HEALTH_COLOR.good

    const glanceChips = [
        coverageCount > 0
            ? {
                  id: "coverage",
                  icon: ShieldCheck,
                  label: `${coverageCount} ${copy.glanceCoverages}`,
                  classes:
                      "border-primary/25 bg-primary-soft/60 text-[#166534] dark:border-mint/25 dark:bg-primary/15 dark:text-mint",
              }
            : null,
        exclusionCount > 0
            ? {
                  id: "exclusions",
                  icon: ShieldOff,
                  label: `${exclusionCount} ${copy.glanceExclusions}`,
                  classes:
                      "border-red-200 bg-[#FEF2F2] text-[#B91C1C] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
              }
            : null,
        conditionsCount > 0
            ? {
                  id: "exclusions",
                  icon: AlertTriangle,
                  label: `${conditionsCount} ${copy.glanceConditions}`,
                  classes:
                      "border-amber-200 bg-[#FEF3C7]/60 text-[#92400E] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300",
              }
            : null,
        perkCount > 0
            ? {
                  id: "perks",
                  icon: Sparkles,
                  label: `${perkCount} ${copy.glancePerks}`,
                  classes:
                      "border-primary/25 bg-primary-soft/60 text-primary dark:border-mint/25 dark:bg-primary/15 dark:text-mint",
              }
            : null,
        daysLeft !== null && daysLeft >= 0
            ? {
                  id: "key-dates",
                  icon: Calendar,
                  label: `${daysLeft} ${copy.days}`,
                  classes:
                      daysLeft <= 30
                          ? "border-amber-200 bg-[#FEF3C7]/60 text-[#92400E] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                          : "border-black/10 bg-black/[0.03] text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/75",
              }
            : null,
    ].filter(Boolean) as Array<{ id: string; icon: typeof ShieldCheck; label: string; classes: string }>

    return (
        <div className="pw-card pw-pad sm:p-7">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                        <FileText className="h-4 w-4 text-primary dark:text-mint" />
                        {copy.summaryTitle}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-kicker font-black uppercase tracking-widest text-primary dark:bg-primary/15 dark:text-mint">
                        <Sparkles className="h-3 w-3" />
                        {copy.summaryAiChip}
                    </span>
                </div>

                {!isAnalyzing && (
                    <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14">
                            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="none"
                                    strokeWidth="3.5"
                                    className="stroke-current text-black/10 dark:text-white/15"
                                />
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="none"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${health.score} 100`}
                                    className={`stroke-current ${healthColorClass}`}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-black dark:text-white">
                                {health.score}
                            </span>
                        </div>
                        <div>
                            <p className="text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                                {copy.healthTitle}
                            </p>
                            <p className={`text-xs font-bold ${healthColorClass}`}>
                                {copy.healthLevels[health.level]}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">{summary}</p>

            {glanceChips.length > 0 && (
                <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
                    <p className="mb-2.5 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                        {copy.atAGlance}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {glanceChips.map((chip, i) => {
                            const ChipIcon = chip.icon
                            return (
                                <a
                                    key={i}
                                    href={`#${chip.id}`}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform hover:scale-[1.03] ${chip.classes}`}
                                >
                                    <ChipIcon className="h-3.5 w-3.5" />
                                    {chip.label}
                                </a>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
