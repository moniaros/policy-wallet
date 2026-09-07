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
        /** Caption over the one open step the person should take next. */
        currentStep: string
    }
}) {
    // The first open step is THE next action. The brief's rule: "the current
    // step must be visually dominant; completed steps become visually quieter".
    // One row carries the tint, the larger title and the description; the rest
    // are a list.
    const currentId = steps.find((step) => step.state === "open")?.id ?? null
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
                    // gap-1 between the flex items: the template's spaces (« από »)
                    // are anonymous flex items whose leading/trailing whitespace
                    // collapses, so this read «3από6ολοκληρωμένα» on every capture.
                    <Link href="#protection-plan-heading" className="-my-2.5 inline-flex min-h-11 items-center gap-1 text-caption font-medium text-muted-foreground hover:underline">
                        {beforeDone.trim() && <span>{beforeDone.trim()}</span>}
                        <span data-count="plan.stepsDone">{completed}</span>
                        {betweenNumbers.trim() && <span>{betweenNumbers.trim()}</span>}
                        <span data-count="plan.stepsTotal">{total}</span>
                        {afterTotal.trim() && <span>{afterTotal.trim()}</span>}
                    </Link>
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
                    const current = step.id === currentId
                    return (
                        <li key={step.id}>
                            <Link
                                href={step.href}
                                aria-current={current ? "step" : undefined}
                                data-plan-step={current ? "current" : done ? "done" : "open"}
                                className={`pw-subcard flex min-h-11 items-center gap-3 transition-colors ${
                                    current ? "!bg-primary-soft p-3.5 dark:!bg-primary/15" : "px-3 py-2.5"
                                } ${done ? "opacity-60" : ""}`}
                            >
                                <span
                                    className={`grid flex-shrink-0 place-items-center rounded-[10px] ${
                                        current
                                            ? "h-10 w-10 bg-primary text-primary-foreground"
                                            : done
                                                ? "h-9 w-9 bg-primary text-primary-foreground"
                                                : "pw-card-chip"
                                    }`}
                                >
                                    {done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    {current && (
                                        <span className="block text-caption font-medium text-primary dark:text-mint">{labels.currentStep}</span>
                                    )}
                                    <span
                                        className={`block font-semibold [overflow-wrap:anywhere] ${
                                            current ? "text-body text-foreground" : done ? "text-xs text-muted-foreground" : "text-xs text-foreground"
                                        }`}
                                    >
                                        {step.title}
                                    </span>
                                    {current && step.description && (
                                        <span className="mt-0.5 block text-sm leading-snug text-foreground/75">
                                            {step.description}
                                        </span>
                                    )}
                                </span>
                                {!done && (
                                    <ArrowRight
                                        className={`flex-shrink-0 ${current ? "h-4 w-4 text-primary dark:text-mint" : "h-3.5 w-3.5 text-muted-foreground"}`}
                                        aria-hidden
                                    />
                                )}
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
