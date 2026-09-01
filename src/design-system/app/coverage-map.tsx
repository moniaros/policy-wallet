import { cn } from "@/lib/utils"
import type { ProtectionState } from "@/lib/app/state"

export interface CoverageCell {
    id: string
    label: string
    /** null = «δεν έχετε» — no policy in this line. */
    state: ProtectionState | null
    /** Replaces the legend word when present («3 ενεργά», prototype texture); the glyph stays. */
    detail?: string
    href?: string
}

const GLYPH: Record<ProtectionState, string> = { covered: "✓", gap: "◆", review: "?" }

/**
 * CoverageMap (§5.3): the 16 lines as cells in three states plus «δεν έχετε».
 * Colour never carries alone — every cell has its glyph and its label, and the
 * whole map has a text alternative (the list is the alternative: it IS the map).
 */
export function CoverageMap({
    cells,
    legend,
    className,
}: {
    cells: CoverageCell[]
    legend: Record<ProtectionState, string> & { none: string }
    className?: string
}) {
    return (
        <ul className={cn("grid grid-cols-2 gap-g-2 tablet:grid-cols-4 desk:grid-cols-2", className)}>
            {cells.map((c) => {
                const inner = (
                    <>
                        <span lang="el" className="block min-w-0 break-words [hyphens:auto] text-g-app-body-sm font-medium text-fg-primary">{c.label}</span>
                        <span className={cn("mt-g-1 block text-g-app-body-sm", c.state === "covered" && "text-state-covered", c.state === "gap" && "text-state-gap", c.state === "review" && "text-state-review", c.state === null && "text-fg-faint")}>
                            {c.state ? `${GLYPH[c.state]} ${c.detail ?? legend[c.state]}` : legend.none}
                        </span>
                    </>
                )
                const cls = cn(
                    "block min-h-16 rounded-g-control border px-g-3 py-g-2",
                    c.state === "covered" && "border-state-covered-fill bg-state-covered-fill/40",
                    c.state === "gap" && "border-state-gap-border bg-state-gap-fill",
                    c.state === "review" && "border-border-subtle bg-state-review-fill",
                    c.state === null && "border-dashed border-border-subtle bg-surface-base"
                )
                return (
                    <li key={c.id} data-count-subject={c.id}>
                        {c.href ? (
                            <a href={c.href} className={cn(cls, "g-row-press focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus")}>{inner}</a>
                        ) : (
                            <div className={cls}>{inner}</div>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
