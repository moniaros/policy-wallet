import type { ReactNode } from "react"
import { Map } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { mapRowCounts, mapRowsFrom, type MapRow } from "@/lib/onboarding/protection-profile/map-rows"
import type { AttentionAreaView } from "@/lib/protection/attention-areas"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"
import type { FirstInsight } from "@/lib/services/onboarding/quick-start"
import type { TranslationKeys } from "@/lib/i18n/translations/el"
import { cn } from "@/lib/utils"

export type ProtectionMapLabels = TranslationKeys["onboarding"]["protectionProfile"]["summary"]
export type ProtectionMapRowLabels = TranslationKeys["onboarding"]["protectionProfile"]["map"]

/**
 * Importance as a WORD on a tone that never accuses: the brand's emphasis
 * tint for high, the sunken neutral for medium and watch, the info tint for
 * «more detail needed». Never amber (means gap) and never red.
 */
export const IMPORTANCE_TONE: Record<ProtectionPriority["importance"], string> = {
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
 * The alignment as a WORD, in the singular — and only with the evidence to
 * say it. «Φαίνεται να καλύπτεται» needs a policy in force behind it; without
 * one the row can only say that no policy has been seen. A finding speaks
 * with its own title.
 */
function alignmentText(row: MapRow, labels: ProtectionMapRowLabels, language: "el" | "en"): string {
    if (row.alignment === "gap") return row.finding ? row.finding[language] || row.finding.en : labels.alignment.gap
    if (row.alignment === "appears_covered") {
        if (!row.heldLine) return labels.alignment.not_yet_checked
        return row.limitsUnread ? `${labels.alignment.appears_covered} — ${labels.limitsUnread}` : labels.alignment.appears_covered
    }
    return labels.alignment[row.alignment]
}

function unknownText(row: MapRow, labels: ProtectionMapRowLabels): string | null {
    if (row.unknownFactors.length === 0) return null
    const nouns = labels.factorNoun as Record<string, string>
    return labels.unknownList.replace("{list}", row.unknownFactors.map((f) => nouns[f] ?? f).join(", "))
}

/**
 * The protection map — «Η εικόνα σου μέχρι τώρα». Each row is an attention
 * area: what seems to matter, what the policies we have seen say about it,
 * what we still do not know, how sure we are — and the sentence that keeps it
 * honest. No score, no verdict without evidence; a row without a policy in
 * force never reads as covered. Label-driven so the dashboard can reuse the
 * pieces in its own register.
 */
export function ProtectionMapCard({
    labels,
    mapLabels,
    language,
    areas,
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
    mapLabels: ProtectionMapRowLabels
    language: "el" | "en"
    areas: AttentionAreaView[]
    priorities: ProtectionPriority[]
    insight: FirstInsight | null
    confidence: string | null
    unsureCount: number
    countedTotal: number
    headingId?: string
    actions?: ReactNode
    className?: string
}) {
    const rows = mapRowsFrom(areas, priorities)
    const counts = mapRowCounts(rows)
    const stated = priorities.filter((p) => p.importance !== "watch")
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
                    stated.length > 0 ? (
                        <span data-count="needs.priorityCount" className="tabular-nums">
                            {labels.countMeta.replace("{n}", String(stated.length))}
                        </span>
                    ) : undefined
                }
            />
            <p className="mt-3 text-body leading-relaxed text-foreground">{lead}</p>

            {rows.length > 0 ? (
                <>
                    <ul className="mt-4 space-y-2">
                        {rows.map((row) => {
                            const Icon = protectionDomainIcon(row.priorityId)
                            const why = row.why ? row.why[language] || row.why.en : null
                            const unknown = unknownText(row, mapLabels)
                            const next = mapLabels.next[row.nextStep]
                            const coaching = row.density !== "minimal"
                            return (
                                <li key={row.area} className="pw-subcard flex items-start gap-3 p-3" data-alignment={row.alignment}>
                                    <span className="pw-card-chip" aria-hidden="true">
                                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">{domainLabelFor(labels, row.priorityId)}</p>
                                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold", IMPORTANCE_TONE[row.importance])}>
                                                {labels.importance[row.importance]}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-caption leading-snug text-foreground [overflow-wrap:anywhere]">{alignmentText(row, mapLabels, language)}</p>
                                        {coaching && why && row.density === "expanded" ? (
                                            <p className="mt-1 text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                                                <span className="sr-only">{mapLabels.whyLabel}: </span>
                                                {why}
                                            </p>
                                        ) : null}
                                        {unknown ? (
                                            <p className="mt-1 text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                                                <span className="sr-only">{mapLabels.unknownLabel}: </span>
                                                {unknown}
                                            </p>
                                        ) : null}
                                        <p className="mt-1 text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]">{mapLabels.confidence[row.confidence]}</p>
                                        {coaching && row.density === "expanded" ? (
                                            <p className="mt-1 text-caption leading-snug text-foreground/80 [overflow-wrap:anywhere]">
                                                <span className="sr-only">{mapLabels.nextLabel}: </span>
                                                {next}
                                            </p>
                                        ) : null}
                                        {coaching && row.density === "collapsed" && (why || next) ? (
                                            <details className="mt-1 text-caption text-muted-foreground">
                                                <summary className="cursor-pointer select-none font-medium text-foreground/80">{mapLabels.whyLabel}</summary>
                                                {why ? <p className="mt-1 leading-snug [overflow-wrap:anywhere]">{why}</p> : null}
                                                <p className="mt-1 leading-snug text-foreground/80 [overflow-wrap:anywhere]">{next}</p>
                                            </details>
                                        ) : null}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                        <span data-count="attention.areaCount" className="tabular-nums">
                            {mapLabels.areaCount.replace("{n}", String(counts.areaCount))}
                        </span>
                        {counts.unknownCount > 0 ? (
                            <span data-count="attention.unknownCount" className="tabular-nums">
                                {mapLabels.unknownCount.replace("{n}", String(counts.unknownCount))}
                            </span>
                        ) : null}
                        {counts.coveredCount > 0 ? (
                            <span data-count="attention.coveredCount" className="tabular-nums">
                                {mapLabels.coveredCount.replace("{n}", String(counts.coveredCount))}
                            </span>
                        ) : null}
                    </p>
                </>
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

            <p className="mt-4 border-t border-border pt-3 text-caption leading-relaxed text-muted-foreground">
                {labels.disclaimer} {mapLabels.absenceCaveat}
            </p>

            {actions ? <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
        </section>
    )
}
