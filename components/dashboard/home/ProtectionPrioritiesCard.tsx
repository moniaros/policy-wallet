import { ArrowRight, Compass } from "lucide-react"
import { CardHead } from "./CardHead"
import { ActionLink } from "./RecommendationAnalytics"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import { IMPORTANCE_TONE, type ProtectionMapLabels } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { alignmentLabel, confidenceLabel, type AttentionAreaView } from "@/lib/protection/attention-areas"
import { AREAS } from "@/lib/protection/domains"
import { priorityCount } from "@/lib/protection/priority-count"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"
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
    /** Appended when the line behind the word ends within the month. */
    expiringSoon: string
    /** Its own line: nothing held, and the only policy seen for the area has ended. */
    lapsedOnly: string
    /** The footer line with no policy seen — where the picture comes from. */
    noPolicies: string
    uploadCta: string
    /** The footer line with policies seen — where the picture comes from now. */
    withPolicies: string
    /** «Δεν έχουμε δει ≠ δεν υπάρχει» — renders whatever the policy count. */
    absenceCaveat: string
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
 *     rather than repeating the claim.
 *
 * The caveats — limits not read, ends within the month — come from the
 * composition's own fields (`limitsUnread`, `expiringSoon`), which know
 * which lines ANSWERED the area wherever they are held; never re-derived
 * here from the area's own lines, and never matched out of a sentence.
 */
export function alignmentText(area: AttentionAreaView, language: Language, labels: Pick<ProtectionPrioritiesLabels, "limitsUnread" | "expiringSoon">): string {
    let word: string
    if (area.alignment === "gap") {
        const finding = area.protection.gaps.find((g) => g.onHeldPolicy)
        word = finding ? finding.title[language] : alignmentLabel("gap", language)
    } else if (area.alignment === "appears_covered" && area.requiresValidation) {
        return alignmentLabel("not_yet_checked", language)
    } else {
        word = alignmentLabel(area.alignment, language)
    }
    const caveats = [
        area.alignment === "appears_covered" && area.limitsUnread ? labels.limitsUnread : null,
        !area.requiresValidation && area.expiringSoon ? labels.expiringSoon : null,
    ].filter((c): c is string => c !== null)
    return caveats.length > 0 ? `${word} — ${caveats.join(", ")}` : word
}

/** The lapsed line — nothing held, and the only policy seen for the area has ended. */
export function lapsedText(area: AttentionAreaView, labels: Pick<ProtectionPrioritiesLabels, "lapsedOnly">): string | null {
    return area.requiresValidation && area.lapsedOnly ? labels.lapsedOnly : null
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
    priorities,
    unsureCount,
    policyCount,
    language,
    mapLabels,
    labels,
}: {
    /** All areas, in the composition's order (activated first); the card shows the top few. */
    areas: readonly AttentionAreaView[]
    /** Layer 1's rows — `needs.priorityCount` is derived HERE through the one definition, never handed in as a number. */
    priorities: readonly ProtectionPriority[]
    unsureCount: number
    /**
     * Policies READ — the attention bundle's own `policyCount`, which leaves
     * out an unread document (placeholder identity, EXTRACTION_EMPTY). The
     * hero counts every stored row; this footer says «from the policies we
     * have seen», and a one-line PDF is not a policy anyone has seen.
     */
    policyCount: number
    language: Language
    mapLabels: ProtectionMapLabels
    labels: ProtectionPrioritiesLabels
}) {
    const top = areas.slice(0, TOP_AREAS)
    const hasPolicies = policyCount > 0
    // The `attention.*` cells count the rows THIS card shows — the three
    // above them — never the ten-area universe: «6 περιοχές» under three rows
    // was the contradiction. The lens counts its own rows the same way.
    const shown = {
        areaCount: top.length,
        unknownCount: top.filter((a) => a.alignment === "unknown").length,
        coveredCount: top.filter((a) => a.alignment === "appears_covered" && !a.requiresValidation).length,
    }

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
                            {lapsedText(a, labels) ? (
                                <p className="text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]" data-caveat="lapsed">
                                    {lapsedText(a, labels)}
                                </p>
                            ) : null}
                            <span className="text-caption text-muted-foreground">{confidenceLabel(a.confidence, language)}</span>
                        </li>
                    )
                })}
            </ul>

            <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.countLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.priorityCount">
                        {priorityCount(priorities)}
                    </dd>
                </div>
                <div className="pw-subcard p-3">
                    <dt className="text-caption text-muted-foreground">{labels.unsureLabel}</dt>
                    <dd className="text-h3 font-semibold text-foreground" data-count="needs.unsureCount">
                        {unsureCount}
                    </dd>
                </div>
            </dl>

            {/* Counts of WORDS over the rows shown above, never summable into one. */}
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.areaCount">{shown.areaCount}</dd>
                    <dt>{labels.areaCountLabel}</dt>
                </div>
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.unknownCount">{shown.unknownCount}</dd>
                    <dt>{labels.unknownCountLabel}</dt>
                </div>
                <div className="flex items-baseline gap-1">
                    <dd className="font-semibold text-foreground" data-count="attention.coveredCount">{shown.coveredCount}</dd>
                    <dt>{labels.coveredCountLabel}</dt>
                </div>
            </dl>

            {/* Absence is never evidence — said whether or not a policy has
                been seen, because the row that says «δεν έχουμε δει» exists
                in both states. */}
            <p className="mt-3 text-caption text-muted-foreground">
                {labels.disclaimer} <span data-caveat="absence">{labels.absenceCaveat}</span>
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground" data-footer={hasPolicies ? "with_policies" : "no_policies"}>
                    {hasPolicies ? labels.withPolicies : labels.noPolicies}
                </p>
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
