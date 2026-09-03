import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"

/**
 * The way back into the first stage. `in_progress` picks up at the first open
 * step; `start` is for a skip, or an account from before the stage existed.
 * One tinted row, one link — the same shape as the life-event invitation, so
 * the home does not grow a fourth section for it.
 */
export function ProtectionProfileResumeCard({
    variant,
    labels,
}: {
    variant: "in_progress" | "start"
    labels: {
        kicker: string
        body: string
        cta: string
    }
}) {
    return (
        <Link
            href="/onboarding"
            className="pw-card pw-pad flex min-h-11 flex-col gap-3 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
            aria-label={labels.cta}
            data-variant={variant}
        >
            <span className="pw-card-chip">
                <Compass className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">
                    <span className="font-semibold">{labels.kicker}</span> {labels.body}
                </span>
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-primary dark:text-mint">
                {labels.cta}
                <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
        </Link>
    )
}
