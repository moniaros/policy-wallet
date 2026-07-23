"use client"

import { Sparkles, TrendingUp } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
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
        <BrandCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-foreground">{tb.crossSell}</h2>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    headline={tb.noCrossSellTitle}
                    description={tb.noCrossSellDesc}
                    className="border-0 px-0 py-6 shadow-none"
                />
            ) : (
                <div className="space-y-2">
                    {items.map((item) => {
                        const lineLabel = lobLabels[item.lineOfBusiness] ?? item.lineOfBusiness
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => item.customerId && onClientClick?.(item.customerId)}
                                className="flex w-full items-center gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 text-left transition hover:bg-neutral-100 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                            >
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft dark:bg-primary/15">
                                    <Sparkles className="h-4 w-4 text-primary dark:text-mint" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {item.customerName}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">{lineLabel}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-bold text-primary dark:text-mint">
                                        {formatCurrencyCompact(item.estimatedCommission, language)}
                                    </p>
                                    <p className="text-kicker text-muted-foreground">{tb.crossSellPotential}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </BrandCard>
    )
}
