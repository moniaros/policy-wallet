import Link from "next/link"
import { ArrowRight, Compass, Lightbulb, Lock, ShieldAlert, Sparkles, Upload, type LucideIcon } from "lucide-react"

import type { ProtectionNextStep as Step } from "@/lib/protection/next-step"
import { AnalyseNowButton } from "./AnalyseNowButton"

/**
 * The page's ONE primary action — the same anatomy as the home's next-step
 * banner, decided by lib/protection/next-step.ts. Everything else on the
 * page is a door (soft button or text link), which is what makes this one
 * obvious.
 */
const ICONS: Record<Step["id"], LucideIcon> = {
    add_first: Upload,
    analyse: Sparkles,
    unlock: Lock,
    gaps: ShieldAlert,
    answer: Compass,
    recommendations: Lightbulb,
    add_more: Upload,
}

export function ProtectionNextStep({
    step,
    copy,
}: {
    step: Step
    copy: { title: string; body: string; cta: string; refresh: { refreshing: string; failed: string } }
}) {
    const Icon = ICONS[step.id]
    return (
        <section
            className="pw-card pw-pad !border-transparent !bg-primary-soft dark:!bg-primary/15"
            aria-labelledby="protection-next-step-heading"
            data-next-step={step.id}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="pw-card-chip !bg-background/80 dark:!bg-white/10" aria-hidden="true">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="protection-next-step-heading" className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                            {copy.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/80">{copy.body}</p>
                    </div>
                </div>
                {step.id === "analyse" ? (
                    <AnalyseNowButton labels={{ idle: copy.cta, pending: copy.refresh.refreshing, failed: copy.refresh.failed }} />
                ) : (
                    <Link href={step.href} data-action={step.id} className="pw-primary-button inline-flex min-h-11 items-center gap-2 self-start md:self-auto">
                        {copy.cta}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                )}
            </div>
        </section>
    )
}
