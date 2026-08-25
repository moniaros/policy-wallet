import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

/**
 * "Something changed?" — the dashboard's entry into life-event declaration.
 *
 * The chips are examples from the declarable registry, not buttons: the whole
 * card is one link into the existing declaration panel, where each event has
 * its follow-up questions. No new backend — this only routes.
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
            className="pw-card pw-pad block"
            aria-label={labels.cta}
        >
            <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                    <Sparkles className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="pw-kicker">{labels.kicker}</p>
                    <p className="mt-1 text-sm text-black/75 dark:text-white/80">{labels.body}</p>
                    {chips.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1.5">
                            {chips.map((chip) => (
                                <span
                                    key={chip.id}
                                    className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-micro font-semibold text-black/65 dark:border-white/15 dark:bg-white/[0.05] dark:text-white/65"
                                >
                                    {chip.label}
                                </span>
                            ))}
                        </p>
                    )}
                    <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint">
                        {labels.cta}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                    </span>
                </div>
            </div>
        </Link>
    )
}
