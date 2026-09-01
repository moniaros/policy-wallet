import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The wireframe's leading image block, for a product that has no images.
 *
 * A policy is a document, not a photograph, so the tile carries the line of
 * business as an icon (`getBranchIcon`, which already falls back to a shield)
 * and, where we know it, the insurer's initials in the corner. That is the
 * whole idea: the two facts a reader uses to recognise a row at a glance,
 * before reading a word of it.
 *
 * PHONE ONLY (`tablet:hidden`). It exists to give the mobile wireframe its
 * leading image block; from 768 up the rows and cells are denser and text-led,
 * and adding an icon there would be a desktop redesign nobody asked for.
 *
 * Decoration only — `aria-hidden`, never a target, and it carries NO state.
 * State stays with the `StatusChip` at the end of the row; a tile that also
 * coloured itself would say the same thing twice, in two vocabularies.
 */
export function BranchTile({
    icon: Icon,
    initials,
    size = "row",
    className,
}: {
    icon: LucideIcon
    /** Two letters at most; null when the insurer is unknown or a placeholder. */
    initials?: string | null
    size?: "row" | "cell"
    className?: string
}) {
    return (
        <span
            aria-hidden
            className={cn(
                "relative grid shrink-0 place-items-center rounded-g-control bg-surface-sunken text-fg-brand tablet:hidden",
                size === "row" ? "size-10" : "size-9",
                className
            )}
        >
            <Icon className="size-5" strokeWidth={1.8} />
            {initials && (
                <span className="absolute -bottom-1 -end-1 grid min-w-4 place-items-center rounded-g-pill bg-surface-raised px-0.5 text-g-app-label font-semibold tracking-normal text-fg-secondary">
                    {initials}
                </span>
            )}
        </span>
    )
}
