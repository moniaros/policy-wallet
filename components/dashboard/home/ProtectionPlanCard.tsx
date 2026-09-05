import Link from "next/link"
import { ArrowRight, Bell, Check, Compass, Lightbulb, ListChecks, ShieldAlert, Sparkles, Upload, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { CardHead } from "./CardHead"

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
    profile: Compass,
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
    moreOpenCount,
    labels,
}: {
    /** Already truncated by the server; `moreOpenLabel` covers the remainder. */
    steps: ProtectionPlanStepView[]
    completed: number
    total: number
    allDone: boolean
    /** "+3 more in your recommendations"; null when nothing was truncated. */
    moreOpenLabel: string | null
    /** The count inside moreOpenLabel — the open recommendation set. */
    moreOpenCount?: number
    labels: {
        kicker: string
        /** «{done} από {total} ολοκληρωμένα» — interpolated HERE so each number carries data-count. */
        progressTemplate: string
        upToDate: string
    }
}) {
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0
    const progressText = labels.progressTemplate
        .replace("{done}", String(completed))
        .replace("{total}", String(total))
    // Split the template around its two placeholders so «3 από 5» renders as
    // <span data-count="plan.stepsDone">3</span> από <span …stepsTotal>5</span>
    // — a joined string is a quantity the count-consistency scan cannot
    // attribute (§6.7).
    const [beforeDone = "", afterDone = ""] = labels.progressTemplate.split("{done}")
    const [betweenNumbers = "", afterTotal = ""] = afterDone.split("{total}")

    if (allDone) {
        return (
            <section className="pw-card pw-pad" aria-labelledby="protection-plan-heading">
                <CardHead icon={ListChecks} title={labels.kicker} id="protection-plan-heading" />
                <div className="mt-4 flex items-center gap-3">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{labels.upToDate}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-plan-heading">
            <CardHead
                icon={ListChecks}
                title={labels.kicker}
                id="protection-plan-heading"
                meta={
                    <span className="text-caption font-medium text-muted-foreground">
                        {beforeDone}
                        <span data-count="plan.stepsDone">{completed}</span>
                        {betweenNumbers}
                        <span data-count="plan.stepsTotal">{total}</span>
                        {afterTotal}
                    </span>
                }
            />

            <div
                className="mt-4 h-1.5 w-full rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={completed}
                aria-valuetext={progressText}
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
                                className={`pw-subcard flex min-h-11 items-center gap-3 px-3 py-2.5 transition-colors ${
                                    done ? "opacity-80" : ""
                                }`}
                            >
                                <span
                                    className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${
                                        done
                                            ? "bg-primary text-primary-foreground"
                                            : "pw-card-chip"
                                    }`}
                                >
                                    {done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={`block text-xs font-semibold [overflow-wrap:anywhere] ${
                                            done ? "text-muted-foreground line-through" : "text-foreground"
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
                <a
                    // The findings this counts render in «Χρειάζεται την προσοχή
                    // σας» on THIS page (the attention card carries id="attention"
                    // and scroll-mt for this anchor). A cross-reference points at
                    // where the findings actually are; it does not re-offer
                    // navigation the attention section owns (§11 metric 7).
                    href="#attention"
                    // The «+N ακόμη» count IS the open recommendation set — the
                    // same fact the hero's areas line states, under one key.
                    data-count={moreOpenCount !== undefined ? "recommendation.openCount" : undefined}
                    className="pw-inline-action mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                >
                    {moreOpenLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </a>
            )}
        </section>
    )
}
