import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"

export interface RecommendedActionItem {
    id: string
    title: string
    urgency: "critical" | "high" | "medium" | "low"
}

const URGENCY_DOTS: Record<RecommendedActionItem["urgency"], string> = {
    critical: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-sky-500",
    low: "bg-black/30 dark:bg-white/30",
}

/**
 * Top persisted gap-engine recommendations, compact. Advice surface —
 * always renders the AiDisclaimer (compliance requirement).
 */
export function RecommendedActionsWidget({
    items,
    language,
    labels,
}: {
    items: RecommendedActionItem[]
    language: Language
    labels: { kicker: string; noActions: string; viewAll: string }
}) {
    return (
        <div className="pw-card pw-pad lg:col-span-2">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                {items.length > 0 && (
                    <Link
                        href="/coverage-insights"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                    >
                        {labels.viewAll}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                )}
            </div>
            <div className="mt-3">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{labels.noActions}</p>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <Link
                                key={item.id}
                                href="/coverage-insights"
                                className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.03] p-2.5 transition hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                            >
                                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${URGENCY_DOTS[item.urgency]}`} aria-hidden />
                                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-black dark:text-white">{item.title}</p>
                                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
                            </Link>
                        ))}
                    </div>
                )}
                <AiDisclaimer language={language} variant="inline" className="mt-3" />
            </div>
        </div>
    )
}
