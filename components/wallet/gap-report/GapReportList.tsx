"use client"

import {
    FREE_GAP_PREVIEW_COUNT,
    groupGapsByCoverageArea,
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

    // Flat display order across groups drives the lock boundary; derived
    // up front (render must stay mutation-free for the React compiler).
    const flatOrder = new Map(
        groups.flatMap((group) => group.items).map((item, index) => [item.id, index])
    )
    const firstLockedId =
        lockedCount > 0
            ? groups.flatMap((group) => group.items)[FREE_GAP_PREVIEW_COUNT]?.id ?? null
            : null

    return (
        <div className="space-y-5">
            <GapReportSummaryBand summary={summary} copy={copy} />

            {groups.map((group) => (
                <GapGroupSection key={group.area} area={group.area} count={group.items.length} copy={copy}>
                    {group.items.map((item) => {
                        const flatIndex = flatOrder.get(item.id) ?? 0
                        const locked = lockedCount > 0 && flatIndex >= FREE_GAP_PREVIEW_COUNT
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
