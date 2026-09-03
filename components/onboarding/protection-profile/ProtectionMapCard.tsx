import type { ReactNode } from "react"
import { Banknote, Briefcase, Building2, Car, HeartPulse, House, Landmark, Map, PiggyBank, Sparkles, Users, type LucideIcon } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"
import type { FirstInsight } from "@/lib/services/onboarding/quick-start"
import type { TranslationKeys } from "@/lib/i18n/translations/el"
import { cn } from "@/lib/utils"

export type ProtectionMapLabels = TranslationKeys["onboarding"]["protectionProfile"]["summary"]

const ICONS: Record<string, LucideIcon> = {
    household: Users,
    residence: House,
    property: Building2,
    mobility: Car,
    work: Briefcase,
    health: HeartPulse,
    lifestyle: Sparkles,
    "money:income": Banknote,
    "money:debt": Landmark,
    "money:retirement": PiggyBank,
    money: Banknote,
}

/**
 * Importance as a WORD on a tone that never accuses: the brand's emphasis
 * tint for high, the sunken neutral for medium and watch, the info tint for
 * «more detail needed». Never amber (means gap) and never red.
 */
const TONE: Record<ProtectionPriority["importance"], string> = {
    high: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    medium: "bg-muted text-foreground",
    watch: "bg-muted text-muted-foreground",
    needs_review: "bg-status-info-tint text-status-info",
}

export function domainLabelFor(labels: ProtectionMapLabels, id: string): string {
    const key = id.replace(":", "_") as keyof ProtectionMapLabels["domainLabel"]
    return labels.domainLabel[key] ?? labels.domainLabel[id.split(":")[0] as keyof ProtectionMapLabels["domainLabel"]] ?? id
}

/**
 * The protection map — «Η εικόνα σου μέχρι τώρα». Layer 1 rendered: what
 * seems to matter, why, how well we know it, and the sentence that keeps it
 * honest. No score, no verdict, no coverage word; `requiresValidation` is the
 * whole point. Label-driven so the dashboard can render the same card in its
 * own register.
 */
export function ProtectionMapCard({
    labels,
    language,
    priorities,
    insight,
    confidence,
    unsureCount,
    countedTotal,
    headingId = "protection-map-heading",
    actions,
    className,
}: {
    labels: ProtectionMapLabels
    language: "el" | "en"
    priorities: ProtectionPriority[]
    insight: FirstInsight | null
    confidence: string | null
    unsureCount: number
    countedTotal: number
    headingId?: string
    actions?: ReactNode
    className?: string
}) {
    const shown = priorities.filter((p) => p.importance !== "watch").slice(0, 6)
    const named = priorities.filter((p) => p.importance === "high" || p.importance === "medium")
    const lead =
        named.length === 0 ? labels.leadNone : named.length === 1 ? labels.leadOne : labels.lead.replace("{n}", String(Math.min(named.length, 3)))
    const confidenceLine = (confidence && (labels.confidence as Record<string, string>)[confidence]) || labels.confidence.none

    return (
        <section className={cn("pw-card pw-pad", className)} aria-labelledby={headingId} aria-live="polite">
            <CardHead
                icon={Map}
                title={labels.title}
                id={headingId}
                meta={
                    shown.length > 0 ? (
                        <span data-count="needs.priorityCount" className="tabular-nums">
                            {labels.countMeta.replace("{n}", String(shown.length))}
                        </span>
                    ) : undefined
                }
            />
            <p className="mt-3 text-body leading-relaxed text-foreground">{lead}</p>

            {shown.length > 0 ? (
                <ul className="mt-4 space-y-2">
                    {shown.map((p) => {
                        const Icon = ICONS[p.id] ?? ICONS[p.domain] ?? Sparkles
                        return (
                            <li key={p.id} className="pw-subcard flex items-start gap-3 p-3">
                                <span className="pw-card-chip" aria-hidden="true">
                                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{domainLabelFor(labels, p.id)}</p>
                                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold", TONE[p.importance])}>
                                            {labels.importance[p.importance]}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-caption leading-snug text-muted-foreground">{p.reason.text[language]}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : null}

            {/* «Τι αξίζει να προσέξουμε» — the engine's one derived finding when
                it has one, then the honest edge of the map. */}
            <div className="mt-5 border-t border-border pt-4">
                <p className="text-caption font-semibold text-muted-foreground">{labels.worthNoticing}</p>
                {insight ? (
                    <div className="pw-subcard mt-2 p-3.5">
                        <p className="text-caption font-semibold text-muted-foreground">{labels.insightKicker}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{insight.headline[language] || insight.headline.en}</p>
                        <p className="mt-1 text-caption leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">{insight.detail[language] || insight.detail.en}</p>
                        <p className="mt-1.5 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.because[language] || insight.because.en}</p>
                    </div>
                ) : null}
                <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{labels.notAskedYet}</p>
            </div>

            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                    <p className="text-caption leading-snug text-muted-foreground">{labels.confidenceLabel}</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{confidenceLine}</p>
                </div>
                {unsureCount > 0 ? (
                    <p className="text-caption text-muted-foreground sm:text-right">
                        <span data-count="needs.unsureCount" className="tabular-nums">
                            {labels.unsureCount.replace("{n}", String(unsureCount)).replace("{m}", String(countedTotal))}
                        </span>
                    </p>
                ) : null}
            </div>

            <p className="mt-4 border-t border-border pt-3 text-caption leading-relaxed text-muted-foreground">{labels.disclaimer}</p>

            {actions ? <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
        </section>
    )
}
