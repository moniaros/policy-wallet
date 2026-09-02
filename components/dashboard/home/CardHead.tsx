import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The ONE card header of the policyholder app: icon chip · title · meta.
 *
 * Every dashboard card used to open with an uppercase tracked kicker
 * («ΚΑΤΑΣΤΑΣΗ ΠΡΟΣΤΑΣΙΑΣ», «ΧΡΟΝΟΔΙΑΓΡΑΜΜΑ ΑΝΑΝΕΩΣΕΩΝ») — Greek capitals drop
 * their accents, and the craft floor bans the eyebrow outright. This is the
 * replacement: a sentence-case heading beside a 36px chip, with whatever
 * meta the card has (a count, a continuation link, a date) pushed right.
 * One anatomy repeated is what makes six unrelated cards read as one product.
 *
 * Renders a real heading by default so each card is a landmark a screen
 * reader can jump to; callers that already own the heading (the overview
 * card, whose h2 is the facts themselves) pass `as="p"`.
 */
export function CardHead({
    icon: Icon,
    title,
    id,
    meta,
    as = "h2",
    className,
}: {
    icon: LucideIcon
    title: string
    /** Wire the card's aria-labelledby to this heading. */
    id?: string
    /** Right-aligned: a count, a link, a date. Already localised. */
    meta?: ReactNode
    as?: "h2" | "h3" | "p"
    className?: string
}) {
    const Heading = as
    return (
        // flex-wrap with a basis floor on the title group: a long meta («14
        // ασφαλιστήρια με ανανέωση εντός 6 μηνών») drops under the title
        // instead of squeezing «Χρονοδιάγραμμα ανανεώσεων» into one letter
        // per line — which is exactly what the first render did at 390px.
        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
            <span className="flex min-w-0 flex-1 basis-[14rem] items-center gap-3">
                <span className="pw-card-chip" aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <Heading id={id} className="min-w-0 flex-1 text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                    {title}
                </Heading>
            </span>
            {meta !== undefined && meta !== null && (
                <div className="ml-auto flex min-w-0 items-center justify-end gap-2 text-right text-caption text-muted-foreground">{meta}</div>
            )}
        </div>
    )
}
