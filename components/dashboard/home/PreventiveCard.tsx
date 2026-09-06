import Link from "next/link"
import { ArrowRight, HeartHandshake } from "lucide-react"

/**
 * The card that connects insurance with a life — text-led, no stock photo, no
 * advertising frame. The home picks the body from what is actually true for
 * this person (recommendations exist, or nothing is ready yet) and the CTA
 * goes where that body promises, so the card never links to an empty page
 * while claiming otherwise. Future direction: the body keys off the declared
 * life situation and the attention areas; the prop shape already allows it.
 */
export function PreventiveCard({
    title,
    body,
    cta,
    href,
}: {
    title: string
    body: string
    cta: string
    href: string
}) {
    return (
        <Link
            href={href}
            className="pw-card pw-pad block transition-colors hover:border-primary/40"
            data-preventive-card
        >
            <span className="pw-card-chip" aria-hidden="true">
                <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-title font-semibold leading-snug tracking-tight text-foreground">{title}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{body}</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary dark:text-mint">
                {cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
        </Link>
    )
}
