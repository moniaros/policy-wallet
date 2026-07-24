"use client"

import React from "react"
import { DollarSign, TrendingUp, RefreshCw, BarChart3 } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandStat } from "@/components/ui/brand/BrandStat"
import { EmptyState } from "@/components/ui/EmptyState"
import { AgentPlanGate } from "../AgentPlanGate"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/agent/format"
import type { AgentTier } from "@/types/subscription-entitlements"
import { branchLabel } from '@/lib/insurance/taxonomy'

interface ClientFinancialsTabProps {
    financials: {
        totalPremiums: number
        premiumsByLob: Record<string, number>
        commissionEarned: number
        commissionProjected: number
        renewalProbability: number
    }
    agentTier: AgentTier
}


export function ClientFinancialsTab({ financials, agentTier }: ClientFinancialsTabProps) {
    const { language, t } = useLanguage()

    return (
        <AgentPlanGate
            currentTier={agentTier}
            requiredTier="agent_pro"
            featureLabel={t.clientFinancials.featureLabel}
        >
            <div className="space-y-5">
                {/* Top stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <BrandStat
                        value={formatCurrencyCompact(financials.totalPremiums, language)}
                        label={t.clientFinancials.totalPremiums}
                    />
                    <BrandStat
                        value={formatCurrencyCompact(financials.commissionEarned, language)}
                        label={t.clientFinancials.commissionEarned}
                    />
                    <BrandStat
                        value={formatCurrencyCompact(financials.commissionProjected, language)}
                        label={t.clientFinancials.projected}
                    />
                </div>

                {/* Premiums by LoB */}
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-primary dark:text-mint" />
                        {t.clientFinancials.premiumsByLob}
                    </h3>
                    {Object.keys(financials.premiumsByLob).length === 0 ? (
                        <EmptyState
                            className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                            icon={BarChart3}
                            headline={t.emptyStates.premiumsByLob.headline}
                            description={t.emptyStates.premiumsByLob.description}
                        />
                    ) : (
                    <div className="space-y-3">
                        {Object.entries(financials.premiumsByLob).map(([lob, amount]) => {
                            const maxAmount = Math.max(...Object.values(financials.premiumsByLob))
                            const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0

                            return (
                                <div key={lob}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            {branchLabel(lob, language === 'el' ? 'el' : 'en')}
                                        </span>
                                        <span className="text-sm font-bold text-foreground">
                                            {formatCurrencyFull(amount, language)}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className="h-2 rounded-full bg-primary transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    )}
                </BrandCard>

                {/* Renewal Probability */}
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                        <RefreshCw className="h-5 w-5 text-primary dark:text-mint" />
                        {t.clientFinancials.renewalProbability}
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24">
                            <svg width={96} height={96} className="transform -rotate-90">
                                <circle cx={48} cy={48} r={40} fill="none" stroke="currentColor" strokeWidth={6} className="text-neutral-200 dark:text-neutral-700" />
                                <circle
                                    cx={48} cy={48} r={40} fill="none"
                                    stroke={financials.renewalProbability >= 70 ? "#29685B" : financials.renewalProbability >= 40 ? "#f59e0b" : "#ef4444"}
                                    strokeWidth={6}
                                    strokeDasharray={2 * Math.PI * 40}
                                    strokeDashoffset={2 * Math.PI * 40 * (1 - financials.renewalProbability / 100)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-foreground">
                                    {financials.renewalProbability}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {financials.renewalProbability >= 70
                                    ? t.clientFinancials.highRenewal
                                    : financials.renewalProbability >= 40
                                        ? t.clientFinancials.moderateRenewal
                                        : t.clientFinancials.lowRenewal}
                            </p>
                        </div>
                    </div>
                </BrandCard>
            </div>
        </AgentPlanGate>
    )
}
