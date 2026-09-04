import { ArrowRight, Compass } from "lucide-react"
import { CardHead } from "./CardHead"
import { ActionLink } from "./RecommendationAnalytics"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import { IMPORTANCE_TONE, type ProtectionMapLabels } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import {
    alignmentLabel,
    confidenceLabel,
    type AttentionAreaView,
    type AttentionSummary,
} from "@/lib/protection/attention-areas"
import { AREAS } from "@/lib/protection/domains"
import type { Language } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ProtectionPrioritiesLabels {
    kicker: string
    lead: string
    countLabel: string
    unsureLabel: string
    areaCountLabel: string
    unknownCountLabel: string
    coveredCountLabel: string
    /** Appended to «Φαίνεται να καλύπτεται» when the area's limits were never read. */
    limitsUnread: string
    noPolicies: string
    uploadCta: string
    withPolicies: string
    alignmentCta: string
    disclaimer: string
}

/** How many areas the home shows; the lens shows all ten. */
const TOP_AREAS = 3

/**
 * The alignment word for one area — §C's closed vocabulary, through the
 * dictionary, never spelled here. Two honesty rules the card enforces itself
 * rather than trusting its input:
 *
 *   - `gap` speaks the finding's own title (a rule-decided GapInstance on a
 *     held policy), falling back to the generic word only when no held
 *     finding travelled with the view.
 *   - `appears_covered` is spoken only when the area no longer requires
 *     validation — i.e. a held line exists. A view that claims cover with
 *     nothing held is a bug upstream, and the card says «δεν έχουμε δει»
 *     rather than repeating the claim. A summary-only area adds the limits
 *     caveat, because presence is not adequacy.
 */
export function alignmentText(area: AttentionAreaView, language: Language, labels: Pick<ProtectionPrioritiesLabels, "limitsUnread">): string {
    if (area.alignment === "gap") {
        const finding = area.protection.gaps.find((g) => g.onHeldPolicy)
        return finding ? finding.title[language] : alignmentLabel("gap", language)
    }
    if (area.alignment === "appears_covered") {
        if (area.requiresValidation) return alignmentLabel("not_yet_checked", language)
        const word = alignmentLabel("appears_covered", language)
        return area.protection.hasAnalysed ? word : `${word} — ${labels.limitsUnread}`
    }
    return alignmentLabel(area.alignment, language)
}

/**
 * «Η εικόνα σας» — the top attention areas on the home: what the customer
 * said matters, what the engine and the documents make of it, and how sure
 * we are, in the app's plural voice. Never a score, never a verdict of its
 * own: every word is the composition's (lib/protection/attention-areas.ts).
 * The upload ACTION stays the hero's (`data-action="upload"` is pinned
 * there) — this card only links, and its link records what the person set
 * out to do (`action_started`).
 */
export function ProtectionPrioritiesCard({
    areas,
    summary,
    priorityCount,
    unsureCount,
    policyCount,
    language,
    mapLabels,
    labels,
}: {
    /** All areas, in the composition's order (activated first); the card shows the top few. */
    areas: readonly AttentionAreaView[]
    summary: AttentionSummary
    /** Layer 1's own count — `needs.priorityCount`, kept where it was. */
    priorityCount: number
    unsureCount: number
    /** The page's policy count (same universe as the hero), so the footers agree. */
    policyCount: number
    language: Language
    mapLabels: ProtectionMapLabels
    labels: ProtectionPrioritiesLabels
}) {
    const top = areas.slice(0, TOP_AREAS)
    const hasPolicies = policyCount > 0

    return (
        <section className="pw-card pw-pad" aria-labelledby="protection-priorities-heading">
            <CardHead icon={Compass} title={labels.kicker} id="protection-priorities-heading" />
            <p className="mt-2 text-sm text-muted-foreground">{labels.lead}</p>

            <ul className="mt-4 grid gap-2 sm:grid-cols-3" aria-live="polite">
                {top.map((a) => {
                    const Icon = protectionDomainIcon(AREAS[a.area].priorityId)
                    return (
                        <li key={a.area} className="pw-subcard flex min-w-0 flex-col gap-2 p-3" data-area={a.area} data-alignment={a.alignment}>
                            <div className="flex items-center gap-2">
                                <span className="pw-card-chip">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 text-sm font-semibold text-foreground">{a.label}</span>
                            </div>
                            <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 text-caption font-semibold", IMPORTANCE_TONE[a.importance])}>
                                {mapLabels.importance[a.importance]}
                            </span>
                            <p className="text-sm leading-snug text-foreground [overflow-wrap:anywhere]">{alignmentText(a, language, labels)}</p>
                            <span className="text-caption text-muted-foreground">{confidenceLabel(a.confidence, language)}</span>
                        </li>
                    )
                })}
            </ul>

            <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.countLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.priorityCount">
                        {priorityCount}
                    </dd>
                </div>
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.unsureLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.unsureCount">
                        {unsureCount}
                    </dd>
                </div>
            </dl>

            {/* Counts of WORDS across all ten areas — the same numbers the lens
                renders under the same keys, never summable into one. */}
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.areaCount">{summary.areaCount}</dd>
                    <dt>{labels.areaCountLabel}</dt>
                </div>
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.unknownCount">{summary.unknownCount}</dd>
                    <dt>{labels.unknownCountLabel}</dt>
                </div>
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.coveredCount">{summary.coveredCount}</dd>
                    <dt>{labels.coveredCountLabel}</dt>
                </div>
            </dl>

            <p className="mt-3 text-caption text-muted-foreground">{labels.disclaimer}</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{hasPolicies ? labels.withPolicies : labels.noPolicies}</p>
                <ActionLink
                    kind={hasPolicies ? "review_finding" : "check_first_policy"}
                    href={hasPolicies ? "/protection?lens=risk" : "/wallet/add"}
                    className="pw-soft-button flex-shrink-0"
                >
                    {hasPolicies ? labels.alignmentCta : labels.uploadCta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </ActionLink>
            </div>
        </section>
    )
}
