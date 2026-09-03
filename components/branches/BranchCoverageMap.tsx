import Link from "next/link"
import { ArrowRight, Shield } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BranchTileState } from "@/lib/insurance/branch-page"
import { CardHead } from "@/components/dashboard/home/CardHead"

export interface CoverageMapEntry {
    id: string
    icon: LucideIcon
    label: string
    state: BranchTileState
    stateLabel: string
}

/** The state pill: word + tone. Colour is never the only carrier. */
const PILL_STYLES: Record<BranchTileState, string> = {
    covered: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    // Amber means gap — "attention" is the one state that earns it.
    attention: "bg-status-warning-tint text-status-warning",
    // §2.2: not owning a product is not a finding — this used to be rose.
    not_held: "border border-border bg-card text-foreground/70",
    neutral: "bg-card text-muted-foreground",
}

/**
 * Branch coverage map — one tile per insurance branch with its
 * covered / attention / not-held / neutral state, linking to the branch page.
 * Server component; entries and copy arrive pre-resolved (states derive
 * from lib/insurance/branch-page buildBranchOverview).
 *
 * Direction A: tiles in a grid at every width (two columns on a phone), the
 * state as a WORD in a pill rather than a dot with an aria-label — the map is
 * the product's thesis surface and its states must read without a legend.
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
        <section className={cn("pw-card pw-pad @container", className)} aria-labelledby="coverage-map-heading">
            <CardHead
                icon={Shield}
                title={labels.kicker}
                id="coverage-map-heading"
                meta={
                    <Link
                        // The lens NAMED, not implied. «Όλοι οι κλάδοι» continues
                        // this map into the branch lens that absorbed /branches
                        // (V2-P2-03) — the same convention the monitor card uses
                        // for its lens (`?lens=risk`). Bare `/protection` here was
                        // one of the four undifferentiated offers of that page the
                        // duplicate-actions metric gated on /dashboard (§11
                        // metric 7); the hero CTA is the page's one generic entry.
                        href="/protection?lens=branch"
                        className="pw-soft-button !px-3.5 !text-caption"
                    >
                        {labels.viewAll}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                }
            />
            {/* Container query, not a viewport one: the map sizes to ITS width, so
                it is two-up inside a narrow column (and inside the marketing
                site's phone frames, where the viewport is wide but the screen
                is 390px) and three-up wherever it actually has the room. */}
            <div className="mt-4 grid grid-cols-2 gap-2 @sm:grid-cols-3">
                {entries.map((entry) => (
                    <Link
                        key={entry.id}
                        href={`/protection/${entry.id}`}
                        title={entry.stateLabel}
                        className={cn(
                            "pw-subcard flex min-h-11 flex-col gap-2.5 p-3 transition-colors",
                            // Attention tiles carry the gap tint on the surface as
                            // well as the pill — the one place the page spends
                            // amber at area scale, because "where cover ends" is
                            // the question the map exists to answer.
                            entry.state === "attention" && "!bg-status-warning-tint/60 dark:!bg-status-warning-tint/40",
                            // A line the user does not hold reads as an empty
                            // slot, not an alarm: dashed hairline, no tint.
                            (entry.state === "neutral" || entry.state === "not_held") &&
                                "border-dashed border border-border !bg-transparent"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <entry.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground @sm:truncate">
                                {entry.label}
                            </span>
                        </span>
                        <span
                            className={cn(
                                "inline-flex w-fit max-w-full items-center rounded-full px-2 py-0.5 text-caption font-semibold [overflow-wrap:anywhere]",
                                PILL_STYLES[entry.state]
                            )}
                        >
                            {entry.stateLabel}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    )
}
