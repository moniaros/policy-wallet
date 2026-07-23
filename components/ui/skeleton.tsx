import { cn } from "@/lib/utils"

/**
 * The canonical loading placeholder.
 *
 * There were two Skeleton modules with 15 and 14 importers, so the product
 * shipped two different loading shimmers: this one at `bg-muted/50 rounded-md`
 * and `LoadingSkeleton`'s at `bg-stone-200 dark:bg-stone-800 rounded-xl`.
 * `bg-muted/50` resolves to #f1f5f9 at half opacity — very nearly invisible on
 * a white card — which is presumably why the other module hand-rolled a raw
 * palette colour to get something you can actually see.
 *
 * The tint here is a neutral overlay rather than a palette colour, so it reads
 * on any surface and needs no `dark:` fallback of its own. `LoadingSkeleton`
 * re-exports this; there is one definition.
 *
 * Blocks are `aria-hidden` — they carry no information. Composites that stand
 * in for a whole route mark themselves `role="status" aria-busy="true"` so a
 * screen reader is told the region is loading instead of reading empty boxes.
 */
function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "animate-pulse rounded-lg bg-black/[0.07] dark:bg-white/[0.09]",
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
