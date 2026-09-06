import Link from "next/link"
import { ArrowRight, Bell, CalendarClock, Compass, Lightbulb, ShieldAlert, Sparkles, Upload, Users, type LucideIcon } from "lucide-react"

/**
 * The page's ONE primary action, chosen for this person today.
 *
 * The brief asked for an onboarding banner that "should be contextual: if the
 * user has already completed onboarding, replace it with the most useful next
 * action". The home decides which step that is (first open setup step, then
 * open recommendations, then a renewal inside 30 days, then adding the rest of
 * the wallet); this card only renders the decision. It carries the page's
 * single `pw-primary-button` — every other card on the home offers a door, not
 * a button — which is what makes the next action obvious instead of one of
 * eight.
 *
 * Stands down on an empty wallet: there the hero's own invitation is the
 * primary, and two asks on the first screen would be one too many.
 */
export interface NextStepView {
    id: string
    title: string
    body: string
    cta: string
    href: string
    how: { label: string; href: string } | null
}

const ICONS: Record<string, LucideIcon> = {
    profile: Compass,
    upload: Upload,
    analysis: Sparkles,
    gaps: ShieldAlert,
    agent: Users,
    notifications: Bell,
    recommendations: Lightbulb,
    renewal: CalendarClock,
    add_more: Upload,
}

export function NextStepBanner({ step }: { step: NextStepView }) {
    const Icon = ICONS[step.id] ?? Compass
    return (
        <section
            className="pw-card pw-pad !border-transparent !bg-primary-soft dark:!bg-primary/15"
            aria-labelledby="next-step-heading"
            data-next-step={step.id}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="pw-card-chip !bg-background/80 dark:!bg-white/10" aria-hidden="true">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="next-step-heading" className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                            {step.title}
                        </h2>
                        {step.body && <p className="mt-1 text-sm leading-relaxed text-foreground/80">{step.body}</p>}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-end md:gap-y-1">
                    <Link
                        href={step.href}
                        data-action={step.id}
                        className="pw-primary-button inline-flex min-h-11 items-center gap-2"
                    >
                        {step.cta}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {step.how && (
                        <Link
                            href={step.how.href}
                            className="inline-flex min-h-11 items-center text-sm font-medium text-foreground/70 hover:underline"
                        >
                            {step.how.label}
                        </Link>
                    )}
                </div>
            </div>
        </section>
    )
}
