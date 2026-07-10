"use client"

import React from "react"
import { DollarSign, TrendingUp, RefreshCw, BarChart3 } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandStat } from "@/components/ui/brand/BrandStat"
import { AgentPlanGate } from "../AgentPlanGate"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/agent/format"
import type { AgentTier } from "@/types/subscription-entitlements"

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

const LOB_LABELS: Record<string, { en: string; el: string }> = {
    motor: { en: "Motor", el: "Αυτοκίνητο" },
    health: { en: "Health", el: "Υγεία" },
    home: { en: "Home", el: "Κατοικία" },
    life: { en: "Life", el: "Ζωή" },
    travel: { en: "Travel", el: "Ταξίδι" },
}

export function ClientFinancialsTab({ financials, agentTier }: ClientFinancialsTabProps) {
    const { language } = useLanguage()

    return (
        <AgentPlanGate
            currentTier={agentTier}
            requiredTier="agent_pro"
            featureLabel={language === "el" ? "Οικονομική Ανάλυση Πελάτη" : "Client Financial Analysis"}
        >
            <div className="space-y-5">
                {/* Top stats */}
                <div className="grid grid-cols-3 gap-4">
                    <BrandStat
                        value={formatCurrencyCompact(financials.totalPremiums, language)}
                        label={language === "el" ? "Συνολικά Ασφάλιστρα" : "Total Premiums"}
                    />
                    <BrandStat
                        value={formatCurrencyCompact(financials.commissionEarned, language)}
                        label={language === "el" ? "Προμήθεια (YTD)" : "Commission Earned (YTD)"}
                    />
                    <BrandStat
                        value={formatCurrencyCompact(financials.commissionProjected, language)}
                        label={language === "el" ? "Προβλεπόμενη (12μ)" : "Projected (12mo)"}
                    />
                </div>

                {/* Premiums by LoB */}
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-primary dark:text-mint" />
                        {language === "el" ? "Ασφάλιστρα ανά Κλάδο" : "Premiums by Line of Business"}
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(financials.premiumsByLob).map(([lob, amount]) => {
                            const maxAmount = Math.max(...Object.values(financials.premiumsByLob))
                            const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0

                            return (
                                <div key={lob}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {LOB_LABELS[lob]?.[language] || lob}
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {formatCurrencyFull(amount, language)}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="h-2 rounded-full bg-primary transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </BrandCard>

                {/* Renewal Probability */}
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <RefreshCw className="h-5 w-5 text-primary dark:text-mint" />
                        {language === "el" ? "Πιθανότητα Ανανέωσης" : "Renewal Probability"}
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24">
                            <svg width={96} height={96} className="transform -rotate-90">
                                <circle cx={48} cy={48} r={40} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-200 dark:text-slate-700" />
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
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    {financials.renewalProbability}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {financials.renewalProbability >= 70
                                    ? (language === "el" ? "Υψηλή πιθανότητα ανανέωσης" : "High renewal probability")
                                    : financials.renewalProbability >= 40
                                        ? (language === "el" ? "Μέτρια πιθανότητα — χρειάζεται follow-up" : "Moderate — follow-up recommended")
                                        : (language === "el" ? "Χαμηλή πιθανότητα — άμεση δράση" : "Low probability — immediate action needed")}
                            </p>
                        </div>
                    </div>
                </BrandCard>
            </div>
        </AgentPlanGate>
    )
}
