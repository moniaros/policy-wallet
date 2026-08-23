import Link from "next/link"
import { ArrowRight, Bell, Check, Lightbulb, ShieldAlert, Sparkles, Upload, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface ProtectionPlanStepView {
    id: string
    kind: "setup" | "recommendation"
    state: "done" | "open"
    href: string
    /** Localised by the server. */
    title: string
    /** Shown on open steps only; null on recommendation steps. */
    description: string | null
}

const SETUP_ICONS: Record<string, LucideIcon> = {
    upload: Upload,
    analysis: Sparkles,
    gaps: ShieldAlert,
    agent: Users,
    notifications: Bell,
}

/**
 * "Your protection plan" — persistent progress, derived only from recorded
 * facts (`buildProtectionPlan`). Deliberately NOT dismissible and free of
 * localStorage: the old getting-started checklist could be waved away and then
 * the product had no standing answer to "what should I do next?". When
 * everything is done it collapses to one quiet row instead of disappearing.
 */
export function ProtectionPlanCard({
    steps,
    completed,
    total,
    allDone,
    moreOpenLabel,
    labels,
}: {
    /** Already truncated by the server; `moreOpenLabel` covers the remainder. */
    steps: ProtectionPlanStepView[]
    completed: number
    total: number
    allDone: boolean
    /** "+3 more in your recommendations"; null when nothing was truncated. */
    moreOpenLabel: string | null
    labels: {
        kicker: string
        progress: string
        upToDate: string
    }
}) {
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

    if (allDone) {
        return (
            <section className="pw-card pw-pad" aria-labelledby="protection-plan-heading">
                <p className="pw-kicker" id="protection-plan-heading">{labels.kicker}</p>
                <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary text-white dark:text-[#1A2420]">
                        <Check className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-sm font-semibold text-black/80 dark:text-white/85">{labels.upToDate}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-plan-heading">
            <div className="flex items-center justify-between">
                <p className="pw-kicker" id="protection-plan-heading">{labels.kicker}</p>
                <p className="text-micro font-semibold text-muted-foreground">{labels.progress}</p>
            </div>

            <div
                className="mt-3 h-1.5 w-full rounded-full bg-black/8 dark:bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={completed}
                aria-valuetext={labels.progress}
            >
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
            </div>

            <ul className="mt-4 space-y-2">
                {steps.map((step) => {
                    const Icon = step.kind === "setup" ? SETUP_ICONS[step.id] ?? Lightbulb : Lightbulb
                    const done = step.state === "done"
                    return (
                        <li key={step.id}>
                            <Link
                                href={step.href}
                                className={`pw-control-boundary flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                                    done
                                        ? "bg-primary/5 dark:bg-primary/15"
                                        : "bg-black/[0.02] hover:bg-black/[0.05] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                                }`}
                            >
                                <span
                                    className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
                                        done
                                            ? "bg-primary text-white dark:text-[#1A2420]"
                                            : "bg-white text-black/60 dark:bg-black dark:text-white/60"
                                    }`}
                                >
                                    {done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={`block text-xs font-semibold [overflow-wrap:anywhere] ${
                                            done ? "text-primary line-through dark:text-mint" : "text-black dark:text-white"
                                        }`}
                                    >
                                        {step.title}
                                    </span>
                                    {!done && step.description && (
                                        <span className="mt-0.5 block text-caption text-black/60 dark:text-white/55">
                                            {step.description}
                                        </span>
                                    )}
                                </span>
                                {!done && <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />}
                            </Link>
                        </li>
                    )
                })}
            </ul>
            {moreOpenLabel && (
                <Link
                    href="/coverage-insights"
                    className="pw-inline-action mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                >
                    {moreOpenLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
            )}
        </section>
    )
}
