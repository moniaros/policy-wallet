import type { ReactNode } from "react"
import { Map } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { mapRowCounts, mapRowsFrom, type MapRow, type MovedRow } from "@/lib/onboarding/protection-profile/map-rows"
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
export function alignmentText(row: MapRow, labels: ProtectionMapRowLabels, language: "el" | "en"): string {
    let word: string
    if (row.alignment === "gap") word = row.finding ? row.finding[language] || row.finding.en : labels.alignment.gap
    else if (row.alignment === "appears_covered" && !row.heldLine) return labels.alignment.not_yet_checked
    else word = labels.alignment[row.alignment]
    // The caveats ride on the composition's fields, never on the sentence:
    // limits not read (summary-only), and a line that ends within the month.
    const caveats = [
        row.alignment === "appears_covered" && row.limitsUnread ? labels.limitsUnread : null,
        row.heldLine && row.expiringSoon ? labels.expiringSoon : null,
    ].filter((c): c is string => c !== null)
    return caveats.length > 0 ? `${word} — ${caveats.join(", ")}` : word
}

/** The lapsed caveat — the only policy seen for the area has ended; nothing is held. */
export function lapsedText(row: MapRow, labels: ProtectionMapRowLabels): string | null {
    return !row.heldLine && row.lapsedOnly ? labels.lapsedOnly : null
}

/**
 * What the first upload moved. `read` is true only when the reading
 * COMPLETED; a queued one has changed nothing yet, and the line says so —
 * never «έτοιμη».
 */
export interface AfterUploadView {
    read: boolean
    moved: MovedRow[]
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
    afterUpload,
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
    /** Present on the second visit — the map re-read after the first upload. */
    afterUpload?: AfterUploadView | null
    headingId?: string
    actions?: ReactNode
    className?: string
}) {
    const rows = mapRowsFrom(areas, priorities)
    const counts = mapRowCounts(rows)
    const named = priorities.filter((p) => p.importance === "high" || p.importance === "medium")
    // The headline counts what it says — the named priorities, uncapped — and
    // the head's «{n} σημεία» counts the rows underneath it, so the two
    // numbers on the page can never disagree with the list between them.
    const lead = named.length === 0 ? labels.leadNone : named.length === 1 ? labels.leadOne : labels.lead.replace("{n}", String(named.length))
    const confidenceLine = (confidence && (labels.confidence as Record<string, string>)[confidence]) || labels.confidence.none
    const unsureLine = unsureCount === 1 ? labels.unsureCountOne : labels.unsureCount.replace("{n}", String(unsureCount)).replace("{m}", String(countedTotal))

    return (
        <section className={cn("pw-card pw-pad", className)} aria-labelledby={headingId} aria-live="polite">
            <CardHead
                icon={Map}
                title={labels.title}
                id={headingId}
                meta={
                    rows.length > 0 ? (
                        <span data-count="attention.areaCount" className="tabular-nums">
                            {labels.countMeta.replace("{n}", String(counts.areaCount))}
                        </span>
                    ) : undefined
                }
            />
            <p className="mt-3 text-body leading-relaxed text-foreground">{lead}</p>

            {afterUpload ? (
                <div className="pw-subcard mt-4 p-3.5" data-after-upload={afterUpload.read ? "read" : "queued"}>
                    <p className="text-caption font-semibold text-muted-foreground">{labels.afterUpload.title}</p>
                    {afterUpload.moved.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                            {afterUpload.moved.map((m) => (
                                <li key={m.area} className="text-caption leading-snug text-foreground [overflow-wrap:anywhere]" data-moved={m.area}>
                                    <span className="font-semibold">{domainLabelFor(labels, m.priorityId)}: </span>
                                    <span className="sr-only">{labels.afterUpload.beforeLabel}: </span>
                                    <span className="text-muted-foreground">{m.before ? alignmentText(m.before, mapLabels, language) : labels.afterUpload.notOnMap}</span>
                                    <span aria-hidden="true"> → </span>
                                    <span className="sr-only">{labels.afterUpload.afterLabel}: </span>
                                    <span>{alignmentText(m.after, mapLabels, language)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-1 text-caption leading-relaxed text-foreground">{afterUpload.read ? labels.afterUpload.readNoChange : labels.afterUpload.nothingYet}</p>
                    )}
                </div>
            ) : null}

            {rows.length > 0 ? (
                <>
                    <ul className="mt-4 space-y-2">
                        {rows.map((row) => {
                            const Icon = protectionDomainIcon(row.priorityId)
                            const why = row.why ? row.why[language] || row.why.en : null
                            const unknown = unknownText(row, mapLabels)
                            const next = mapLabels.next[row.nextStep]
                            // Density decides how much coaching is OPEN, never
                            // whether it exists: «on my own» folds the why
                            // behind a disclosure exactly as «just what
                            // matters» does, and the next step — the one
                            // line that asks something of the person — is
                            // always in view.
                            const whyInline = row.density === "expanded"
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
                                        {lapsedText(row, mapLabels) ? (
                                            <p className="mt-0.5 text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]" data-caveat="lapsed">
                                                {lapsedText(row, mapLabels)}
                                            </p>
                                        ) : null}
                                        {whyInline && why ? (
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
                                        {!whyInline && why ? (
                                            <details className="mt-1 text-caption text-muted-foreground">
                                                <summary className="cursor-pointer select-none font-medium text-foreground/80">{mapLabels.whyLabel}</summary>
                                                <p className="mt-1 leading-snug [overflow-wrap:anywhere]">{why}</p>
                                            </details>
                                        ) : null}
                                        <p className="mt-1 text-caption leading-snug text-foreground/80 [overflow-wrap:anywhere]" data-next-step={row.nextStep}>
                                            <span className="sr-only">{mapLabels.nextLabel}: </span>
                                            {next}
                                        </p>
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
                            {unsureLine}
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
