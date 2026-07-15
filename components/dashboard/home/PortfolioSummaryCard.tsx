import type { LucideIcon } from "lucide-react"

export interface LobChip {
    id: string
    icon: LucideIcon
    amountLabel: string
}

/** Total annual premium + per-branch premium chips. Server component. */
export function PortfolioSummaryCard({
    totalLabel,
    chips,
    labels,
    excludedNote,
}: {
    totalLabel: string
    chips: LobChip[]
    labels: { kicker: string; totalAnnualPremium: string }
    /** Says which policies the total could not count. Omitted when none. */
    excludedNote?: string
}) {
    return (
        <div className="pw-card p-5 lg:col-span-3">
            <p className="pw-kicker">{labels.kicker}</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-3xl font-semibold text-black dark:text-white">{totalLabel}</p>
                    <p className="mt-1 text-xs text-black/55 dark:text-white/60">{labels.totalAnnualPremium}</p>
                    {excludedNote && (
                        <p className="mt-1 text-[10px] text-black/45 dark:text-white/45">{excludedNote}</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                        <div key={chip.id} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 dark:border-white/15 dark:bg-white/5">
                            <chip.icon className="h-3.5 w-3.5 text-primary dark:text-mint" />
                            <span className="text-xs font-bold text-black/70 dark:text-white/75">{chip.amountLabel}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
