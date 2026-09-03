import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { CardHead } from "./CardHead"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import { domainLabelFor, IMPORTANCE_TONE, type ProtectionMapLabels } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"
import { cn } from "@/lib/utils"

export interface ProtectionPrioritiesLabels {
    kicker: string
    lead: string
    countLabel: string
    unsureLabel: string
    confirmChip: string
    declaredChip: string
    noPolicies: string
    uploadCta: string
    withPolicies: string
    alignmentCta: string
    disclaimer: string
    /** Plural-register reason per `PriorityReasonId`; falls back to the engine's own line. */
    reason: Record<string, string>
}

/**
 * «Η εικόνα σας» — Layer 1 on the home. What the customer said matters, why,
 * and how well we know it, in the app's plural voice. Never a score, never a
 * coverage word: the hero above stays the only verdict surface, and the upload
 * ACTION stays the hero's (`data-action="upload"` is pinned there) — this card
 * only links to it. Priorities arrive already ordered by the rule table.
 */
export function ProtectionPrioritiesCard({
    priorities,
    hasPolicies,
    unsureCount,
    language,
    mapLabels,
    labels,
}: {
    priorities: ProtectionPriority[]
    hasPolicies: boolean
    unsureCount: number
    language: "el" | "en"
    mapLabels: ProtectionMapLabels
    labels: ProtectionPrioritiesLabels
}) {
    const top = priorities.slice(0, 3)
    const href = hasPolicies ? "/protection?lens=risk" : "/wallet/add"

    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-priorities-heading">
            <CardHead icon={Compass} title={labels.kicker} id="protection-priorities-heading" />
            <p className="mt-2 text-sm text-muted-foreground">{labels.lead}</p>

            <ul className="mt-4 grid gap-2 sm:grid-cols-3" aria-live="polite">
                {top.map((p) => {
                    const Icon = protectionDomainIcon(p.id)
                    return (
                        <li key={p.id} className="pw-subcard flex min-w-0 flex-col gap-2 p-3">
                            <div className="flex items-center gap-2">
                                <span className="pw-card-chip">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 text-sm font-semibold text-foreground">{domainLabelFor(mapLabels, p.id)}</span>
                            </div>
                            <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 text-caption font-semibold", IMPORTANCE_TONE[p.importance])}>
                                {mapLabels.importance[p.importance]}
                            </span>
                            <p className="text-caption text-muted-foreground">{labels.reason[p.reason.id] ?? p.reason.text[language]}</p>
                            <span className="text-caption text-muted-foreground">
                                {p.confidence === "known" ? labels.declaredChip : labels.confirmChip}
                            </span>
                        </li>
                    )
                })}
            </ul>

            <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.countLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.priorityCount">
                        {priorities.length}
                    </dd>
                </div>
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.unsureLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.unsureCount">
                        {unsureCount}
                    </dd>
                </div>
            </dl>

            <p className="mt-3 text-caption text-muted-foreground">{labels.disclaimer}</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{hasPolicies ? labels.withPolicies : labels.noPolicies}</p>
                <Link href={href} className="pw-soft-button flex-shrink-0">
                    {hasPolicies ? labels.alignmentCta : labels.uploadCta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </div>
        </section>
    )
}
