"use client"

import {
    FREE_GAP_PREVIEW_COUNT,
    groupGapsByCoverageArea,
    selectFreePreviewGapIds,
    summarizeGaps,
    type GapReportItem,
} from "@/lib/wallet/gap-report"
import { partitionByProvenance, type GapProvenance } from "@/lib/gaps/provenance"
import { useLanguage } from "@/contexts/LanguageContext"
import { GapCard } from "./GapCard"
import { GapGroupSection } from "./GapGroupSection"
import { GapReportSummaryBand } from "./GapReportSummaryBand"
import { LockedGapCard } from "./LockedGapCard"
import { ReportUnlockCta } from "./ReportUnlockCta"

interface GapReportListProps {
    items: GapReportItem[]
    policyId: string
    reportUnlocked: boolean
    lang: "el" | "en"
    copy: {
        summaryFoundPrefix: string
        summaryFoundOne: string
        summaryFoundMany: string
        mechanics: Record<string, string>
        mechanicChip: Record<string, string>
        validationChip: Record<string, string>
        areas: Record<string, string>
        expand: string
        collapse: string
        lockedHint: string
        unlockCtaPrefix: string
        unlockCtaSuffix: string
        unlockValueLine: string
        unlockTrust: string
        unlockError: string
        recommendation: string
        hide: string
        sending: string
        notifyAgent: string
    }
    onIgnore: (ids: string[]) => void
    onNotify: (id: string) => void
    ignoringId: string | null
    notifyingId: string | null
}

/**
 * The findings list, sectioned by PROVENANCE (B3) and, inside each section,
 * grouped by coverage area as before. Provenance is the ordering axis:
 * requirements set by law or contract come first and are the only group that
 * may carry emphasis; market practice sits in its own group with review
 * framing; findings not yet classified sit last, inside a section that says
 * so. Severity orders nothing here and colours nothing (B1). The free preview
 * takes the first `FREE_GAP_PREVIEW_COUNT` in that same order.
 */
export function GapReportList({
    items,
    policyId,
    reportUnlocked,
    lang,
    copy,
    onIgnore,
    onNotify,
    ignoringId,
    notifyingId,
}: GapReportListProps) {
    const { t } = useLanguage()
    const provenanceCopy = t.provenance
    const summary = summarizeGaps(items)
    const byProvenance = partitionByProvenance(items, (item) => item.slug)
    const lockedCount = reportUnlocked ? 0 : Math.max(items.length - FREE_GAP_PREVIEW_COUNT, 0)
    const freeIds = reportUnlocked ? null : selectFreePreviewGapIds(items, FREE_GAP_PREVIEW_COUNT)

    type Section = { provenance: GapProvenance; heading: string; framing: string | null; items: GapReportItem[] }
    const allSections: Section[] = [
        { provenance: "legislative", heading: provenanceCopy.emphasisedHeading, framing: null, items: byProvenance.emphasised },
        { provenance: "market", heading: provenanceCopy.marketHeading, framing: provenanceCopy.marketFraming, items: byProvenance.market },
        { provenance: "under_review", heading: provenanceCopy.underReviewHeading, framing: provenanceCopy.underReviewDisclosure, items: byProvenance.underReview },
    ]
    const sections = allSections.filter((section) => section.items.length > 0)

    const orderedIds = sections.flatMap((section) => groupGapsByCoverageArea(section.items).flatMap((group) => group.items.map((item) => item.id)))
    const firstLockedId = lockedCount > 0 && freeIds ? orderedIds.find((id) => !freeIds.has(id)) ?? null : null

    return (
        <div className="space-y-5">
            <GapReportSummaryBand summary={summary} copy={copy} />

            {sections.map((section) => (
                <section
                    key={section.provenance}
                    data-fact="gap.provenanceGroup"
                    data-provenance={section.provenance}
                    aria-label={section.heading}
                    className="space-y-3"
                >
                    <div>
                        <h3 className={`text-sm ${section.provenance === "legislative" ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                            {section.heading}
                        </h3>
                        {section.framing && <p className="mt-0.5 text-caption text-muted-foreground">{section.framing}</p>}
                    </div>

                    {groupGapsByCoverageArea(section.items).map((group) => (
                        <GapGroupSection key={`${section.provenance}:${group.area}`} area={group.area} count={group.items.length} copy={copy}>
                            {group.items.map((item) => {
                                const locked = Boolean(freeIds && !freeIds.has(item.id))
                                const showCta = locked && item.id === firstLockedId

                                return (
                                    <div key={item.id} className="space-y-2.5">
                                        {showCta && <ReportUnlockCta policyId={policyId} lockedCount={lockedCount} copy={copy} />}
                                        {locked ? (
                                            <LockedGapCard item={item} lang={lang} copy={copy} />
                                        ) : (
                                            <GapCard
                                                item={item}
                                                lang={lang}
                                                copy={copy}
                                                onIgnore={onIgnore}
                                                onNotify={onNotify}
                                                ignoring={ignoringId === item.id}
                                                notifying={notifyingId === item.id}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </GapGroupSection>
                    ))}
                </section>
            ))}
        </div>
    )
}
