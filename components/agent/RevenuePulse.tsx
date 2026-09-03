"use client"

import React from "react"
import { TrendingUp, ArrowUp, ArrowDown, Euro, Calendar, Briefcase } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact } from "@/lib/agent/format"
import type { RevenueMetrics } from "./types"

interface RevenuePulseProps {
    metrics: RevenueMetrics
    isLoading?: boolean
    isPipelineGated?: boolean
}

export function RevenuePulse({ metrics, isLoading, isPipelineGated }: RevenuePulseProps) {
    const { t, language } = useLanguage()

    if (isLoading) return <RevenuePulseSkeleton />

    const stats = [
        {
            label: t.agentDashboard.monthlyRevenue,
            value: formatCurrencyCompact(metrics.mrr, language),
            icon: Euro,
            change: metrics.monthlyGrowthPercent,
        },
        {
            label: t.agentDashboard.renewalsThisMonth,
            value: String(metrics.renewalsDueThisMonth),
            subValue: formatCurrencyCompact(metrics.renewalsDueAmount, language),
            icon: Calendar,
        },
        {
            label: t.agentDashboard.commissionPipeline,
            value: formatCurrencyCompact(metrics.commissionPipeline, language),
            icon: Briefcase,
            gated: isPipelineGated,
        },
    ]

    return (
        <BrandCard className="pw-pad">
            <CardHead icon={TrendingUp} title={t.agentDashboard.revenuePulse} />

            {/* Three fact cells on the sunken surface. */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="pw-subcard relative px-3.5 py-3">
                            {stat.gated && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-sm">
                                    <span className="text-caption font-semibold text-muted-foreground">
                                        {t.agentDashboard.proPlusBadge}
                                    </span>
                                </div>
                            )}
                            <p className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                                <span className="min-w-0">{stat.label}</span>
                            </p>
                            <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground">
                                {stat.value}
                            </p>
                            {stat.subValue && (
                                <p className="text-caption tabular-nums text-muted-foreground">
                                    {stat.subValue}
                                </p>
                            )}
                            {stat.change !== undefined && (
                                <p className={`mt-1 flex items-center gap-0.5 text-caption font-semibold tabular-nums ${
                                    stat.change >= 0 ? "text-status-success" : "text-status-danger"
                                }`}>
                                    {stat.change >= 0 ? (
                                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                                    ) : (
                                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                                    )}
                                    {Math.abs(stat.change).toFixed(1)}%
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>
        </BrandCard>
    )
}

export function RevenuePulseSkeleton() {
    return (
        <BrandCard className="pw-pad">
            <div className="mb-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-[10px]" />
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        </BrandCard>
    )
}
