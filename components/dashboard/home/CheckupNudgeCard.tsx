import Link from "next/link"
import { ArrowRight, HeartPulse } from "lucide-react"

/**
 * Spec v2 §5.1 element 8 / §9.1: shown only when a health policy's own
 * reading STATES an annual check-up and the person has not marked this
 * year's as done. Silence in the extraction renders nothing — a nudge over
 * a benefit nobody read would be the all-clear defect in reverse.
 */
export function CheckupNudgeCard({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
    return (
        <Link href={href} className="pw-card pw-pad block transition-colors hover:border-primary/40" data-checkup-nudge>
            <span className="pw-card-chip" aria-hidden="true">
                <HeartPulse className="h-4 w-4" strokeWidth={1.75} />
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
