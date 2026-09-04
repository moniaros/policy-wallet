import { createElement } from "react"
import Link from "next/link"
import { ChevronRight, Map } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import { AssessmentStartedBeacon } from "@/components/protection/AssessmentBeacons"
import type { AreaListItemView } from "@/components/protection/area-detail-model"
import { IMPORTANCE_TONE } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import type { getTranslations } from "@/lib/i18n"
import { AREAS } from "@/lib/protection/domains"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import { cn } from "@/lib/utils"

type AttentionCopy = ReturnType<typeof getTranslations>["protection"]["attention"]

export interface AttentionAreasCardProps {
    items: AreaListItemView[]
    /** Counts of words (attentionSummary) — never a figure. */
    summary: { areaCount: number; activatedCount: number; unknownCount: number; coveredCount: number }
    copy: AttentionCopy
    headingId?: string
}

function AreaRow({ item, copy }: { item: AreaListItemView; copy: AttentionCopy }) {
    return (
        <li>
            <Link
                href={item.href}
                aria-label={copy.list.open.replace("{area}", item.label)}
                data-area={item.area}
                data-alignment={item.alignment}
                className="pw-subcard flex min-h-11 items-center gap-3 p-3 transition-colors"
            >
                <span className="pw-card-chip" aria-hidden="true">
                    {createElement(protectionDomainIcon(AREAS[item.area].priorityId), { className: "h-4 w-4", strokeWidth: 1.75 })}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.label}</span>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold", IMPORTANCE_TONE[item.importance])}>
                            {item.importanceWord}
                        </span>
                    </span>
                    <span className="mt-0.5 block text-caption leading-snug text-foreground [overflow-wrap:anywhere]">
                        {item.alignmentWord}
                        {item.limitsCaveat ? ` — ${copy.caveats.limits_unread}` : null}
                    </span>
                    <span className="mt-0.5 block text-caption leading-snug text-muted-foreground [overflow-wrap:anywhere]">{item.confidenceWord}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
        </li>
    )
}

/**
 * «Οι περιοχές που αξίζει να προσέξετε» — the attention areas on the risk
 * lens (docs/planning/PERSONAL_RISK_PROFILE.md §D). Activated areas first,
 * each a row: label, importance WORD, alignment WORD, confidence phrase, and
 * the chevron into its detail. Dormant areas collapse under «Δεν το
 * εξετάσαμε ακόμη». The counts are counts of words, under the registered
 * `attention.*` keys; nothing here is a figure.
 */
export function AttentionAreasCard({ items, summary, copy, headingId = "attention-areas-heading" }: AttentionAreasCardProps) {
    const active = items.filter((i) => i.activated)
    const dormant = items.filter((i) => !i.activated)
    return (
        <section className="pw-card pw-pad" aria-labelledby={headingId}>
            <AssessmentStartedBeacon activatedCount={summary.activatedCount} />
            <CardHead
                icon={Map}
                title={copy.list.title}
                id={headingId}
                meta={
                    summary.activatedCount > 0 ? (
                        <span className="text-caption tabular-nums text-muted-foreground">
                            {copy.list.activatedMeta.replace("{n}", String(summary.activatedCount))}
                        </span>
                    ) : undefined
                }
            />
            <p className="mt-3 text-body leading-relaxed text-foreground">{copy.list.lead}</p>

            {active.length > 0 ? (
                <ul className="mt-4 space-y-2">
                    {active.map((item) => (
                        <AreaRow key={item.area} item={item} copy={copy} />
                    ))}
                </ul>
            ) : null}

            {dormant.length > 0 ? (
                <details className="mt-3">
                    <summary className="pw-soft-button cursor-pointer select-none !text-caption">
                        {copy.headings.dormant}
                    </summary>
                    <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{copy.list.dormantHint}</p>
                    <ul className="mt-2 space-y-2">
                        {dormant.map((item) => (
                            <AreaRow key={item.area} item={item} copy={copy} />
                        ))}
                    </ul>
                </details>
            ) : null}

            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                <span data-count="attention.areaCount" className="tabular-nums">
                    {copy.list.areaCount.replace("{n}", String(items.length))}
                </span>
                {summary.unknownCount > 0 ? (
                    <span data-count="attention.unknownCount" className="tabular-nums">
                        {copy.list.unknownCount.replace("{n}", String(summary.unknownCount))}
                    </span>
                ) : null}
                {summary.coveredCount > 0 ? (
                    <span data-count="attention.coveredCount" className="tabular-nums">
                        {copy.list.coveredCount.replace("{n}", String(summary.coveredCount))}
                    </span>
                ) : null}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{copy.caveats.absence_not_evidence}</p>
        </section>
    )
}
