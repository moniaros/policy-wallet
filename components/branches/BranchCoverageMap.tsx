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
    // §2.2: not owning a product is not a finding — this dot was rose-500.
    // The state's meaning is carried by its aria-label text, not the colour.
    not_held: "bg-black/30 dark:bg-white/30",
    neutral: "bg-black/25 dark:bg-white/10",
}

/**
 * Compact branch coverage map — one chip per insurance branch with its
 * covered / attention / not-held / neutral dot, linking to the branch page.
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
                    // The lens NAMED, not implied. «Όλοι οι κλάδοι» continues
                    // this map into the branch lens that absorbed /branches
                    // (V2-P2-03) — the same convention the monitor card uses
                    // for its lens (`?lens=risk`). Bare `/protection` here was
                    // one of the four undifferentiated offers of that page the
                    // duplicate-actions metric gated on /dashboard (§11
                    // metric 7); the hero CTA is the page's one generic entry.
                    href="/protection?lens=branch"
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                >
                    {labels.viewAll}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
            </div>
            {/* D7 / policy-detail B3, second sighting. This was a hand-rolled
                `flex overflow-x-auto` whose tiles were pinned at min-w-[128px],
                which is not enough for «Σύνταξη & Αποταμίευση» (146px) — so the
                label that names the branch was clipped on every narrow viewport.
                `.pw-scroll-strip` is the primitive for a row that is MEANT to run
                off the edge: its children never shrink and never wrap, so they
                size to their content and the strip scrolls instead of the words
                being cut. The sm: grid is unaffected. */}
            <div className="pw-scroll-strip -mx-1 mt-3 snap-x gap-2 px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
                {entries.map((entry) => (
                    <Link
                        key={entry.id}
                        href={`/protection/${entry.id}`}
                        title={entry.stateLabel}
                        className={cn(
                            "pw-control-boundary flex min-h-11 snap-start items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition-colors hover:border-primary/40 dark:bg-black dark:hover:border-mint/40 sm:min-w-0",
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
                            // not_held shares the empty-slot surface: a line the
                            // user does not hold reads as an empty slot, not an alarm.
                            (entry.state === "neutral" || entry.state === "not_held") &&
                                "border-dashed bg-black/[0.02] dark:bg-white/[0.03]"
                        )}
                    >
                        <entry.icon className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" aria-hidden />
                        <span className="flex-1 text-xs font-bold text-black/75 dark:text-white/80 sm:min-w-0 sm:truncate">
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
