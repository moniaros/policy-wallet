import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BranchTileState } from "@/lib/insurance/branch-page"

export interface CoverageMapEntry {
    id: string
    icon: LucideIcon
    label: string
    state: BranchTileState
    stateLabel: string
}

const DOT_STYLES: Record<BranchTileState, string> = {
    covered: "bg-primary dark:bg-mint",
    attention: "bg-amber-500",
    gap: "bg-rose-500",
    neutral: "bg-black/25 dark:bg-white/25",
}

/**
 * Compact branch coverage map — one chip per insurance branch with its
 * covered / attention / gap / neutral dot, linking to the branch page.
 * Server component; entries and copy arrive pre-resolved (states derive
 * from lib/insurance/branch-page buildBranchOverview).
 */
export function BranchCoverageMap({
    entries,
    labels,
    className,
}: {
    entries: CoverageMapEntry[]
    labels: { kicker: string; viewAll: string }
    className?: string
}) {
    return (
        <div className={cn("pw-card pw-pad", className)}>
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                <Link
                    href="/branches"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                >
                    {labels.viewAll}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
            </div>
            <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
                {entries.map((entry) => (
                    <Link
                        key={entry.id}
                        href={`/branches/${entry.id}`}
                        title={entry.stateLabel}
                        className={cn(
                            "flex min-w-[128px] snap-start items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-primary/40 dark:border-white/15 dark:bg-black dark:hover:border-mint/40 sm:min-w-0",
                            // "neutral" means the user holds NO cover in this branch.
                            // This used to be `opacity-70`, which multiplied against the
                            // label's own text-black/75 and pushed it to 4.35:1 — under
                            // the AA floor — and did so on precisely the tiles a
                            // policyholder most needs to read: their uncovered branches.
                            // Container opacity is invisible to a class-level contrast
                            // audit, because text-black/75 is fine on its own.
                            // The state is already carried by the dot, which has its own
                            // aria-label, so de-emphasise the SURFACE and leave the text
                            // at full strength.
                            entry.state === "neutral" && "border-dashed bg-black/[0.02] dark:bg-white/[0.03]"
                        )}
                    >
                        <entry.icon className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-black/75 dark:text-white/80">
                            {entry.label}
                        </span>
                        <span
                            className={cn("h-2 w-2 flex-shrink-0 rounded-full", DOT_STYLES[entry.state])}
                            aria-label={entry.stateLabel}
                        />
                    </Link>
                ))}
            </div>
        </div>
    )
}
