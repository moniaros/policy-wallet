import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

/**
 * "Something changed?" — the dashboard's entry into life-event declaration.
 *
 * The chips are examples from the declarable registry, not buttons: the whole
 * card is one link into the existing declaration panel, where each event has
 * its follow-up questions. No new backend — this only routes.
 *
 * Direction A: one tinted row under the coverage map rather than a card of
 * its own — it is an invitation attached to the map, not a fourth section.
 */
export function LifeEventPromptCard({
    chips,
    labels,
}: {
    /** A few declarable-event labels, localised by the server. */
    chips: Array<{ id: string; label: string }>
    labels: {
        kicker: string
        body: string
        cta: string
    }
}) {
    return (
        <Link
            href="/protection#life-events"
            className="flex min-h-11 flex-col gap-3 rounded-xl border border-primary/15 bg-primary-tint px-4 py-3.5 transition-colors hover:border-primary/40 dark:border-mint/20 dark:bg-primary/10 sm:flex-row sm:items-center"
            aria-label={labels.cta}
        >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">
                    <span className="font-semibold">{labels.kicker}</span> {labels.body}
                </span>
                {chips.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                            <span
                                key={chip.id}
                                className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-micro font-semibold text-foreground/70"
                            >
                                {chip.label}
                            </span>
                        ))}
                    </span>
                )}
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-primary dark:text-mint">
                {labels.cta}
                <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
        </Link>
    )
}
