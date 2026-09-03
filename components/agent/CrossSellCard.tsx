"use client"

import { Sparkles, TrendingUp } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact } from "@/lib/agent/format"
import type { CrossSellOpportunityItem } from "./types"

interface CrossSellCardProps {
    items: CrossSellOpportunityItem[]
    onClientClick?: (clientId: string) => void
}

/**
 * Top persisted cross-sell opportunities by estimated commission (Pro+). Reads
 * the already-stored Opportunity rows — never re-runs the cross-sell engine.
 */
export function CrossSellCard({ items, onClientClick }: CrossSellCardProps) {
    const { language, t } = useLanguage()
    const tb = t.agentDashboard
    // Localize the raw line-of-business key via the shared policy-type map.
    const lobLabels = t.policyTypes as Record<string, string>

    return (
        <BrandCard className="pw-pad">
            <CardHead icon={TrendingUp} title={tb.crossSell} />

            {items.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    headline={tb.noCrossSellTitle}
                    description={tb.noCrossSellDesc}
                    className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
                />
            ) : (
                <div className="mt-4 space-y-2">
                    {items.map((item) => {
                        const lineLabel = lobLabels[item.lineOfBusiness] ?? item.lineOfBusiness
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => item.customerId && onClientClick?.(item.customerId)}
                                className="pw-subcard flex min-h-11 w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors"
                            >
                                <span className="pw-card-chip" aria-hidden="true">
                                    <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {item.customerName}
                                    </p>
                                    <p className="truncate text-caption text-muted-foreground">{lineLabel}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold tabular-nums text-foreground">
                                        {formatCurrencyCompact(item.estimatedCommission, language)}
                                    </p>
                                    <p className="text-caption text-muted-foreground">{tb.crossSellPotential}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </BrandCard>
    )
}
