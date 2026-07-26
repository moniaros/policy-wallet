"use client"

import {
    FREE_GAP_PREVIEW_COUNT,
    groupGapsByCoverageArea,
    selectFreePreviewGapIds,
    summarizeGaps,
    type GapReportItem,
} from "@/lib/wallet/gap-report"
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
 * Summary band + coverage-area groups. The flat display index across groups
 * drives the free-tier lock boundary: the first FREE_GAP_PREVIEW_COUNT gaps
 * are expandable, the rest render locked, and the single unlock CTA sits
 * immediately before the first locked card. Unlocked ⇒ every card is open
 * and the CTA never renders.
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
    const summary = summarizeGaps(items)
    const groups = groupGapsByCoverageArea(items)
    const lockedCount = reportUnlocked ? 0 : Math.max(items.length - FREE_GAP_PREVIEW_COUNT, 0)

    // Which gaps stay free is decided by SEVERITY, not display position. The
    // boundary used to fall on the coverage-area/alphabetical flat order, so a
    // critical gap could sit past the free slots and be locked while trivial
    // gaps showed — a free owner could be blind to a compulsory-cover gap unless
    // they paid. The most severe FREE_GAP_PREVIEW_COUNT are unlocked wherever
    // they display; the paywall only ever hides less-urgent gaps.
    const freeIds = reportUnlocked ? null : selectFreePreviewGapIds(items, FREE_GAP_PREVIEW_COUNT)

    // The CTA still sits before the first LOCKED card in display order.
    const firstLockedId =
        lockedCount > 0 && freeIds
            ? groups.flatMap((group) => group.items).find((item) => !freeIds.has(item.id))?.id ?? null
            : null

    return (
        <div className="space-y-5">
            <GapReportSummaryBand summary={summary} copy={copy} />

            {groups.map((group) => (
                <GapGroupSection key={group.area} area={group.area} count={group.items.length} copy={copy}>
                    {group.items.map((item) => {
                        const locked = Boolean(freeIds && !freeIds.has(item.id))
                        const showCta = locked && item.id === firstLockedId

                        return (
                            <div key={item.id} className="space-y-2.5">
                                {showCta && (
                                    <ReportUnlockCta
                                        policyId={policyId}
                                        lockedCount={lockedCount}
                                        copy={copy}
                                    />
                                )}
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
        </div>
    )
}
