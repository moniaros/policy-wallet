import Link from "next/link"
import { ArrowRight, Lightbulb } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { RefreshAnalysisButton } from "@/components/coverage/RefreshAnalysisButton"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"

/**
 * The foot of the story — how to improve. The recommendations live on their
 * own page (/recommendations, ledger RC-01); this is their counted door. The
 * refresh control, once the page header's most prominent element, sits here
 * beside the date of the last check, where an administrative action belongs.
 * The upgrade card keeps its single mount (A-09).
 */
export interface ImproveSectionCopy {
    title: string
    recommendations: string
    recommendationsCount: string
    recommendationsCountOne: string
    noRecommendations: string
    refresh: { refresh: string; refreshing: string; failed: string }
}

export function ImproveSection({
    recommendationCount,
    showUpgradeTrigger,
    lastCheckedLabel,
    language,
    copy,
}: {
    /** null when the engine snapshot failed — the door hides rather than lie. */
    recommendationCount: number | null
    showUpgradeTrigger: boolean
    lastCheckedLabel: string
    language: "el" | "en"
    copy: ImproveSectionCopy
}) {
    const countLabel =
        recommendationCount === 1 ? copy.recommendationsCountOne : copy.recommendationsCount.replace("{n}", String(recommendationCount ?? 0))
    return (
        <section id="improve" aria-labelledby="protection-improve-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 scroll-mt-20">
            <div className="pw-card pw-pad">
                <CardHead icon={Lightbulb} title={copy.title} id="protection-improve-heading" />
                {recommendationCount !== null && recommendationCount > 0 ? (
                    <Link href="/recommendations" data-count="recommendation.openCount" className="pw-soft-button mt-4">
                        {countLabel} · {copy.recommendations}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                ) : recommendationCount === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{copy.noRecommendations}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted-foreground">
                    <span data-last-checked>{lastCheckedLabel}</span>
                    <RefreshAnalysisButton labels={copy.refresh} />
                </div>
            </div>
            {showUpgradeTrigger && (
                <UpgradeTriggerCard featureKey="advanced_gap_detection" triggerSource="protection_page" returnTo="/protection" dismissible />
            )}
            <AiDisclaimer language={language} />
        </section>
    )
}
