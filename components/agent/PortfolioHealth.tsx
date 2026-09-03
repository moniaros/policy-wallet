"use client"

import React from "react"
import { ShieldAlert, UserCheck, AlertTriangle, Activity, Users } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import type { PortfolioHealth as PortfolioHealthData } from "./types"

interface PortfolioHealthProps {
    health: PortfolioHealthData
    isLoading?: boolean
}

/**
 * Three facts about the book, as the card anatomy's fact cells (Direction A,
 * 2026-09-03). The three rings this replaced painted each number red, amber
 * or green by threshold — «100%» in a red ring over one client with one gap
 * was a verdict on a book of one. A count is a count; the caption under it
 * says what it counts, and the advisor draws the conclusion.
 */
export function PortfolioHealth({ health, isLoading }: PortfolioHealthProps) {
    const { language, t } = useLanguage()

    if (isLoading) return <PortfolioHealthSkeleton />

    // With zero clients, the 0% cells read as *healthy* ("0% have coverage
    // gaps") when they really mean "no clients". Show a first-run prompt instead.
    if (health.totalClients === 0) {
        return (
            <BrandCard className="pw-pad">
                <CardHead icon={Activity} title={t.agentUi.portfolioHealth} />
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="max-w-xs text-caption leading-relaxed text-muted-foreground">
                        {t.agentUi.portfolioHealthEmpty}
                    </p>
                </div>
            </BrandCard>
        )
    }

    const metrics = [
        {
            label: t.agentUi.coverageGaps,
            displayValue: `${health.coverageGapPercent}%`,
            icon: ShieldAlert,
            description: language === "el"
                ? "πελατών με κενά κάλυψης"
                : "of clients have coverage gaps",
        },
        {
            label: t.agentUi.completeProfiles,
            displayValue: `${health.completeProfilePercent}%`,
            icon: UserCheck,
            description: language === "el"
                ? "πελατών με πλήρες προφίλ"
                : "of clients have complete profiles",
        },
        {
            label: t.agentUi.atRisk,
            displayValue: String(health.atRiskCount),
            icon: AlertTriangle,
            description: language === "el"
                ? "πελάτες χρειάζονται προσοχή"
                : "clients need attention",
        },
    ]

    return (
        <BrandCard className="pw-pad">
            <CardHead icon={Activity} title={t.agentUi.portfolioHealth} />

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                        <div key={metric.label} className="pw-subcard px-3.5 py-3">
                            <p className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                                <span className="min-w-0">{metric.label}</span>
                            </p>
                            <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground">
                                {metric.displayValue}
                            </p>
                            <p className="mt-0.5 text-caption text-muted-foreground">
                                {metric.description}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* MEDIC qualification health (blueprint §F): how much of the open
                pipeline's € rests on a full qualification picture, and the two
                most common holes. Hidden with an empty pipeline — no verdict
                on nothing. */}
            {health.qualification && health.qualification.pipelineCount > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-2 text-sm font-semibold text-foreground">
                        {t.agentUi.qualificationHealthTitle}
                    </p>
                    {(() => {
                        const q = health.qualification!
                        const share = q.pipelineEur > 0
                            ? Math.round((q.qualifiedEur / q.pipelineEur) * 100)
                            : 0
                        return (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{ width: `${share}%` }}
                                        />
                                    </div>
                                    <span className="text-caption font-semibold tabular-nums text-foreground">{share}%</span>
                                </div>
                                <p className="mt-1 text-caption text-muted-foreground">
                                    {t.agentUi.qualificationShareDesc}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                                    <span>
                                        <b className="font-semibold tabular-nums text-foreground">{q.missingEb}</b>{" "}
                                        {t.agentUi.qualificationMissingEb}
                                    </span>
                                    <span>
                                        <b className="font-semibold tabular-nums text-foreground">{q.unconfirmedPain}</b>{" "}
                                        {t.agentUi.qualificationUnconfirmedPain}
                                    </span>
                                </div>
                            </>
                        )
                    })()}
                </div>
            )}
        </BrandCard>
    )
}

export function PortfolioHealthSkeleton() {
    return (
        <BrandCard className="pw-pad">
            <div className="mb-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-[10px]" />
                <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        </BrandCard>
    )
}
