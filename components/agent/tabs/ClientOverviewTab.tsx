"use client"

import React from "react"
import { Shield, AlertTriangle, Users, Plus, Calendar, ArrowUpRight, Handshake } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { branchLabel } from "@/lib/insurance/taxonomy"
import { formatDateShort } from "@/lib/agent/format"
import type { Customer, Policy, Opportunity } from "../types"
import { displayInsurerName } from '@/lib/wallet/policy-identity'

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

    const activePolicies = policies.filter((p) => p.status === "active" || p.status === "expiring_soon")
    const openOpportunities = opportunities.filter((o) => o.status === "open" || o.status === "contacted")

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            {/*
                Not a coverage verdict. This number is computeClientRelationshipScore,
                40 of whose 100 points are the agent's own contact recency and the
                client's account state — yet it was headed «Βαθμός υγείας κάλυψης» and
                captioned «Κρίσιμα κενά» below 40, asserting critical gaps for a client
                whose gap SEVERITIES were never consulted. It now describes the
                relationship, which is what it measures — and as a fact cell, not a
                ring: a gauge invites reading a ratio as a grade.
            */}
            <section className="pw-card pw-pad lg:col-span-1">
                <CardHead as="h3" icon={Handshake} title={t.clientOverview.healthScore} />
                <p className="mt-4 text-display font-semibold leading-none tracking-tight tabular-nums text-foreground">
                    {healthScore}
                    <span className="text-title text-muted-foreground">/100</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                    {healthScore >= 70
                        ? t.clientOverview.goodCoverage
                        : healthScore >= 40
                            ? t.clientOverview.needsImprovement
                            : t.clientOverview.criticalGaps}
                </p>
                <p className="mt-2 text-caption leading-snug text-muted-foreground">
                    {t.clientOverview.healthScoreHint}
                </p>
            </section>

            {/* Active Policies Summary */}
            <section className="pw-card pw-pad lg:col-span-2">
                <CardHead
                    as="h3"
                    icon={Shield}
                    title={t.clientOverview.activePolicies}
                    meta={<span className="tabular-nums">{activePolicies.length}</span>}
                />
                {activePolicies.length === 0 ? (
                    <EmptyState
                        className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                        icon={Shield}
                        headline={t.emptyStates.overviewPolicies.headline}
                        description={t.emptyStates.overviewPolicies.description}
                    />
                ) : (
                    <ul className="mt-4 space-y-2">
                        {activePolicies.map((policy) => (
                            <li
                                key={policy.policyId}
                                className="pw-subcard flex items-center gap-3 p-3"
                            >
                                <span className="pw-card-chip" aria-hidden="true">
                                    <Shield className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        {/* Was a hand-kept map of five lines, so anything outside it —
                                        motorbike, truck, renters, pet, liability, legal
                                        expenses, every business line — rendered its raw id
                                        ("motorbike") to the agent. The taxonomy already owns
                                        these labels, in both languages, for the whole
                                        vocabulary. */}
                                        {branchLabel(policy.lineOfBusiness, language === 'el' ? 'el' : 'en')}
                                    </p>
                                    <p className="text-caption text-muted-foreground">
                                        {displayInsurerName(policy.insurerName)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="flex items-center justify-end gap-1 text-caption text-muted-foreground">
                                        <Calendar className="h-3 w-3" aria-hidden="true" />
                                        {formatDateShort(policy.endDate, language)}
                                    </p>
                                    {policy.status === "expiring_soon" && (
                                        <span className="mt-1 inline-flex rounded-full bg-status-warning-tint px-2 py-0.5 text-caption font-semibold text-status-warning">
                                            {t.clientOverview.expiringSoon}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Identified Gaps — tiles on the sunken surface. The severity used
                to paint a coloured side bar per tile; severity is not a verdict
                until an underwriter says so, so the tile carries the finding, the
                likelihood pill and the note, and nothing else. */}
            {openOpportunities.length > 0 && (
                <section className="pw-card pw-pad lg:col-span-3">
                    <CardHead
                        as="h3"
                        icon={AlertTriangle}
                        title={t.clientOverview.identifiedGaps}
                        meta={<span className="tabular-nums">{openOpportunities.length}</span>}
                    />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {openOpportunities.map((opp) => (
                            <div key={opp.opportunityId} className="pw-subcard p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">
                                        {opp.gapTitle}
                                    </p>
                                    {opp.conversionLikelihood && (
                                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-caption font-semibold ${
                                            opp.conversionLikelihood === "high"
                                                ? "bg-status-success-tint text-status-success"
                                                : opp.conversionLikelihood === "medium"
                                                    ? "bg-status-warning-tint text-status-warning"
                                                    : "bg-muted text-muted-foreground"
                                        }`}>
                                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                            {/* When there's no numeric score, fall back to the LOCALISED
                                                likelihood label (as OpportunitiesClient does) — the raw
                                                "high"/"medium"/"low" enum was shown to Greek agents. */}
                                            {opp.conversionScore != null ? `${opp.conversionScore}%` : t.agentPages.opportunities.likelihood[opp.conversionLikelihood]}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">
                                    {opp.notes}
                                </p>
                                {onCreateProposal && (
                                    <button
                                        type="button"
                                        onClick={() => onCreateProposal(opp.gapId)}
                                        className="mt-2 inline-flex min-h-9 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                                    >
                                        <Plus className="h-3 w-3" aria-hidden="true" />
                                        {t.clientOverview.createProposal}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Family Unit Visualization */}
            {customer.crossSell && (
                <section className="pw-card pw-pad lg:col-span-3">
                    <CardHead as="h3" icon={Users} title={t.clientOverview.coverageNeeds} />
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1 sm:border-r sm:border-border sm:pr-4">
                            {/* B1.7: the coverage percentage was a breadth grade over a
                                fixed line list. The count it derived from is what a
                                reader can check — the lines themselves are listed
                                beside it. */}
                            <p className="text-caption leading-snug text-muted-foreground">
                                {t.clientOverview.linesHeld}
                            </p>
                            <p className="text-title font-semibold leading-none tracking-tight tabular-nums text-foreground" data-count="client.linesHeldCount">
                                {customer.crossSell.existingLines.length}
                            </p>
                        </div>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                            {customer.crossSell.existingLines.map((line) => (
                                <span
                                    key={line}
                                    className="rounded-full bg-status-success-tint px-2.5 py-1 text-caption font-semibold text-status-success"
                                >
                                    {branchLabel(line, language === 'el' ? 'el' : 'en')}
                                </span>
                            ))}
                            {customer.crossSell.missingLines.map((line) => (
                                <span
                                    key={line.lob}
                                    className="rounded-full bg-status-warning-tint px-2.5 py-1 text-caption font-semibold text-status-warning"
                                >
                                    {line.label[language] || line.lob}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
