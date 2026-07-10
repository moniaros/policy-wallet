"use client"

import React from "react"
import { Shield, AlertTriangle, Users, Plus, Calendar, ArrowUpRight } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { useLanguage } from "@/contexts/LanguageContext"
import { getHealthScoreColor } from "@/lib/agent/health-score"
import { formatDateGreek } from "@/lib/agent/format"
import type { Customer, Policy, Opportunity } from "../types"

interface ClientOverviewTabProps {
    customer: Customer
    healthScore: number
    policies: Policy[]
    opportunities: Opportunity[]
    onCreateProposal?: (gapId: string) => void
}

export function ClientOverviewTab({
    customer,
    healthScore,
    policies,
    opportunities,
    onCreateProposal,
}: ClientOverviewTabProps) {
    const { language } = useLanguage()
    const scoreColor = getHealthScoreColor(healthScore)

    const activePolicies = policies.filter((p) => p.status === "active" || p.status === "expiring_soon")
    const openOpportunities = opportunities.filter((o) => o.status === "open" || o.status === "contacted")

    const LOB_LABELS: Record<string, { en: string; el: string }> = {
        motor: { en: "Motor", el: "Αυτοκίνητο" },
        health: { en: "Health", el: "Υγεία" },
        home: { en: "Home", el: "Κατοικία" },
        life: { en: "Life", el: "Ζωή" },
        travel: { en: "Travel", el: "Ταξίδι" },
    }

    return (
        <div className="grid grid-cols-12 gap-5">
            {/* Coverage Health Score */}
            <div className="col-span-4">
                <BrandCard className="p-6 flex flex-col items-center text-center">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                        {language === "el" ? "Βαθμός Υγείας Κάλυψης" : "Coverage Health Score"}
                    </h3>
                    <div className="relative mb-4">
                        <svg width={120} height={120} className="transform -rotate-90">
                            <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" strokeWidth={8} className="text-slate-200 dark:text-slate-700" />
                            <circle
                                cx={60} cy={60} r={52} fill="none"
                                stroke={healthScore >= 70 ? "#29685B" : healthScore >= 40 ? "#f59e0b" : "#ef4444"}
                                strokeWidth={8}
                                strokeDasharray={2 * Math.PI * 52}
                                strokeDashoffset={2 * Math.PI * 52 * (1 - healthScore / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-700"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-3xl font-black ${scoreColor}`}>{healthScore}</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {healthScore >= 70
                            ? (language === "el" ? "Καλή κάλυψη" : "Good coverage")
                            : healthScore >= 40
                                ? (language === "el" ? "Χρειάζεται βελτίωση" : "Needs improvement")
                                : (language === "el" ? "Κρίσιμα κενά" : "Critical gaps")}
                    </p>
                </BrandCard>
            </div>

            {/* Active Policies Summary */}
            <div className="col-span-8">
                <BrandCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary dark:text-mint" />
                            {language === "el" ? "Ενεργά Ασφαλιστήρια" : "Active Policies"}
                            <span className="text-xs text-slate-400 font-normal">({activePolicies.length})</span>
                        </h3>
                    </div>
                    {activePolicies.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-slate-500">
                                {language === "el"
                                    ? "Δεν υπάρχουν ενεργά ασφαλιστήρια ακόμα."
                                    : "No active policies yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activePolicies.map((policy) => (
                                <div
                                    key={policy.policyId}
                                    className="flex items-center gap-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft dark:bg-primary/15">
                                        <Shield className="h-4 w-4 text-primary dark:text-mint" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {LOB_LABELS[policy.lineOfBusiness]?.[language] || policy.lineOfBusiness}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {policy.insurerName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            {formatDateGreek(policy.endDate)}
                                        </div>
                                        {policy.status === "expiring_soon" && (
                                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                {language === "el" ? "Λήγει σύντομα" : "Expiring soon"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </BrandCard>
            </div>

            {/* Identified Gaps */}
            {openOpportunities.length > 0 && (
                <div className="col-span-12">
                    <BrandCard className="p-5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {language === "el" ? "Εντοπισμένα Κενά" : "Identified Gaps"}
                            <span className="text-xs text-slate-400 font-normal">({openOpportunities.length})</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {openOpportunities.map((opp) => {
                                const severityColors = {
                                    critical: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
                                    high: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                                    medium: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                                    low: "border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/20",
                                }
                                return (
                                    <div
                                        key={opp.opportunityId}
                                        className={`border-l-4 rounded-xl p-4 ${severityColors[opp.severity] || severityColors.medium}`}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {opp.gapTitle}
                                            </p>
                                            {opp.conversionLikelihood && (
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    opp.conversionLikelihood === "high"
                                                        ? "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
                                                        : opp.conversionLikelihood === "medium"
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                }`}>
                                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                                    {opp.conversionScore != null ? `${opp.conversionScore}%` : opp.conversionLikelihood}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            {opp.notes}
                                        </p>
                                        {onCreateProposal && (
                                            <button
                                                type="button"
                                                onClick={() => onCreateProposal(opp.gapId)}
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint hover:underline cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3" />
                                                {language === "el" ? "Δημιουργία Πρότασης" : "Create Proposal"}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </BrandCard>
                </div>
            )}

            {/* Family Unit Visualization */}
            {customer.crossSell && (
                <div className="col-span-12">
                    <BrandCard className="p-5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-primary dark:text-mint" />
                            {language === "el" ? "Ανάγκες Κάλυψης" : "Coverage Needs"}
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="text-center">
                                <div className="text-3xl font-black text-slate-900 dark:text-white">
                                    {customer.crossSell.coverageScore}%
                                </div>
                                <p className="text-xs text-slate-500">
                                    {language === "el" ? "Κάλυψη" : "Coverage"}
                                </p>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                                {customer.crossSell.existingLines.map((line) => (
                                    <span
                                        key={line}
                                        className="rounded-full bg-primary-soft dark:bg-primary/15 px-3 py-1 text-xs font-medium text-[#166534] dark:text-mint"
                                    >
                                        {LOB_LABELS[line]?.[language] || line}
                                    </span>
                                ))}
                                {customer.crossSell.missingLines.map((line) => (
                                    <span
                                        key={line.lob}
                                        className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                                    >
                                        {line.label[language] || line.lob}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </BrandCard>
                </div>
            )}
        </div>
    )
}
