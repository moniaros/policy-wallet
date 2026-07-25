"use client"

import React from "react"
import { Shield, AlertTriangle, Users, Plus, Calendar, ArrowUpRight } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRelationshipScoreColor } from "@/lib/agent/health-score"
import { branchLabel } from "@/lib/insurance/taxonomy"
import { formatDateShort } from "@/lib/agent/format"
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
    const { language, t } = useLanguage()
    const scoreColor = getRelationshipScoreColor(healthScore)

    const activePolicies = policies.filter((p) => p.status === "active" || p.status === "expiring_soon")
    const openOpportunities = opportunities.filter((o) => o.status === "open" || o.status === "contacted")

    return (
        <div className="grid grid-cols-12 gap-5">
            {/*
                Not a coverage verdict. This donut renders computeClientRelationshipScore,
                40 of whose 100 points are the agent's own contact recency and the
                client's account state — yet it was headed «Βαθμός υγείας κάλυψης» and
                captioned «Κρίσιμα κενά» below 40, asserting critical gaps for a client
                whose gap SEVERITIES were never consulted. It now describes the
                relationship, which is what it measures.
            */}
            <div className="col-span-4">
                <BrandCard className="p-6 flex flex-col items-center text-center">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
                        {t.clientOverview.healthScore}
                    </h3>
                    <div className="relative mb-4">
                        <svg width={120} height={120} className="transform -rotate-90">
                            <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" strokeWidth={8} className="text-neutral-200 dark:text-neutral-700" />
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
                    <p className="text-sm text-muted-foreground">
                        {healthScore >= 70
                            ? t.clientOverview.goodCoverage
                            : healthScore >= 40
                                ? t.clientOverview.needsImprovement
                                : t.clientOverview.criticalGaps}
                    </p>
                    <p className="mt-2 text-micro leading-snug text-muted-foreground">
                        {t.clientOverview.healthScoreHint}
                    </p>
                </BrandCard>
            </div>

            {/* Active Policies Summary */}
            <div className="col-span-8">
                <BrandCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary dark:text-mint" />
                            {t.clientOverview.activePolicies}
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">({activePolicies.length})</span>
                        </h3>
                    </div>
                    {activePolicies.length === 0 ? (
                        <EmptyState
                            className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                            icon={Shield}
                            headline={t.emptyStates.overviewPolicies.headline}
                            description={t.emptyStates.overviewPolicies.description}
                        />
                    ) : (
                        <div className="space-y-2">
                            {activePolicies.map((policy) => (
                                <div
                                    key={policy.policyId}
                                    className="flex items-center gap-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 p-3"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft dark:bg-primary/15">
                                        <Shield className="h-4 w-4 text-primary dark:text-mint" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {/* Was a hand-kept map of five lines, so anything outside it —
                                            motorbike, truck, renters, pet, liability, legal
                                            expenses, every business line — rendered its raw id
                                            ("motorbike") to the agent. The taxonomy already owns
                                            these labels, in both languages, for the whole
                                            vocabulary. */}
                                            {branchLabel(policy.lineOfBusiness, language === 'el' ? 'el' : 'en')}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {policy.insurerName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <Calendar className="h-3 w-3" />
                                            {formatDateShort(policy.endDate, language)}
                                        </div>
                                        {policy.status === "expiring_soon" && (
                                            <span className="text-kicker font-medium text-amber-700 dark:text-amber-400">
                                                {t.clientOverview.expiringSoon}
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
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {t.clientOverview.identifiedGaps}
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">({openOpportunities.length})</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {openOpportunities.map((opp) => {
                                const severityColors = {
                                    critical: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
                                    high: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                                    medium: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                                    low: "border-l-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/20",
                                }
                                return (
                                    <div
                                        key={opp.opportunityId}
                                        className={`border-l-4 rounded-xl p-4 ${severityColors[opp.severity] || severityColors.medium}`}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-foreground">
                                                {opp.gapTitle}
                                            </p>
                                            {opp.conversionLikelihood && (
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-kicker font-semibold ${
                                                    opp.conversionLikelihood === "high"
                                                        ? "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
                                                        : opp.conversionLikelihood === "medium"
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                                }`}>
                                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                                    {/* When there's no numeric score, fall back to the LOCALISED
                                                        likelihood label (as OpportunitiesClient does) — the raw
                                                        "high"/"medium"/"low" enum was shown to Greek agents. */}
                                                    {opp.conversionScore != null ? `${opp.conversionScore}%` : t.agentPages.opportunities.likelihood[opp.conversionLikelihood]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                                            {opp.notes}
                                        </p>
                                        {onCreateProposal && (
                                            <button
                                                type="button"
                                                onClick={() => onCreateProposal(opp.gapId)}
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint hover:underline cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3" />
                                                {t.clientOverview.createProposal}
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
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-primary dark:text-mint" />
                            {t.clientOverview.coverageNeeds}
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="text-center">
                                <div className="text-3xl font-black text-foreground">
                                    {customer.crossSell.coverageScore}%
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {t.clientOverview.coverage}
                                </p>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                                {customer.crossSell.existingLines.map((line) => (
                                    <span
                                        key={line}
                                        className="rounded-full bg-primary-soft dark:bg-primary/15 px-3 py-1 text-xs font-medium text-[#166534] dark:text-mint"
                                    >
                                        {branchLabel(line, language === 'el' ? 'el' : 'en')}
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
