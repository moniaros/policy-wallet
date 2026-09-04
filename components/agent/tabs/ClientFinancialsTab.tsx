"use client"

import React from "react"
import { Euro, RefreshCw, BarChart3 } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
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
            <div className="space-y-4">
                {/* Three fact cells in one card — words over number, hairlines
                    between from sm. */}
                <section className="pw-card pw-pad">
                    <CardHead as="h3" icon={Euro} title={t.clientFinancials.totalPremiums} />
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-0 sm:[&>*+*]:border-l sm:[&>*+*]:border-border sm:[&>*+*]:pl-4 sm:[&>*]:pr-4 sm:[&>*:last-child]:pr-0">
                        {[
                            { label: t.clientFinancials.totalPremiums, value: formatCurrencyCompact(financials.totalPremiums, language) },
                            { label: t.clientFinancials.commissionEarned, value: formatCurrencyCompact(financials.commissionEarned, language) },
                            { label: t.clientFinancials.projected, value: formatCurrencyCompact(financials.commissionProjected, language) },
                        ].map((cell) => (
                            <div key={cell.label} className="flex min-w-0 flex-col gap-1">
                                <p className="text-caption leading-snug text-muted-foreground">{cell.label}</p>
                                <p className="text-title font-semibold leading-none tracking-tight tabular-nums text-foreground">{cell.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Premiums by LoB */}
                <section className="pw-card pw-pad">
                    <CardHead as="h3" icon={BarChart3} title={t.clientFinancials.premiumsByLob} />
                    {Object.keys(financials.premiumsByLob).length === 0 ? (
                        <EmptyState
                            className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                            icon={BarChart3}
                            headline={t.emptyStates.premiumsByLob.headline}
                            description={t.emptyStates.premiumsByLob.description}
                        />
                    ) : (
                    <div className="mt-4 space-y-3">
                        {Object.entries(financials.premiumsByLob).map(([lob, amount]) => {
                            const maxAmount = Math.max(...Object.values(financials.premiumsByLob))
                            const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0

                            return (
                                <div key={lob}>
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-foreground">
                                            {branchLabel(lob, language === 'el' ? 'el' : 'en')}
                                        </span>
                                        <span className="text-sm font-semibold tabular-nums text-foreground">
                                            {formatCurrencyFull(amount, language)}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className="h-2 rounded-full bg-primary transition-[width] duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    )}
                </section>

                {/* Renewal probability — a number and the sentence that
                    qualifies it, not a ring painted in a verdict colour. */}
                <section className="pw-card pw-pad">
                    <CardHead as="h3" icon={RefreshCw} title={t.clientFinancials.renewalProbability} />
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                        <p className="text-display font-semibold leading-none tracking-tight tabular-nums text-foreground">
                            {financials.renewalProbability}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {financials.renewalProbability >= 70
                                ? t.clientFinancials.highRenewal
                                : financials.renewalProbability >= 40
                                    ? t.clientFinancials.moderateRenewal
                                    : t.clientFinancials.lowRenewal}
                        </p>
                    </div>
                </section>
            </div>
        </AgentPlanGate>
    )
}
