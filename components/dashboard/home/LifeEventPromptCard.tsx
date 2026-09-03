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
            className="pw-card pw-pad flex min-h-11 flex-col gap-3 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
            aria-label={labels.cta}
        >
            <span className="pw-card-chip">
                <Sparkles className="h-4 w-4" aria-hidden />
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
                                className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-caption font-medium text-foreground"
                            >
                                {chip.label}
                            </span>
                        ))}
                    </span>
                )}
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-primary dark:text-mint">
                {labels.cta}
                <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
        </Link>
    )
}
