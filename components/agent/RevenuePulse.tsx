"use client"

import React from "react"
import { TrendingUp, ArrowUp, ArrowDown, Euro, Calendar, Briefcase } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
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
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-foreground">
                    {t.agentDashboard.revenuePulse}
                </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className="relative rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] p-3"
                        >
                            {stat.gated && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm dark:bg-neutral-900/60">
                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        {t.agentDashboard.proPlusBadge}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-micro font-medium">{stat.label}</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stat.value}
                            </p>
                            {stat.subValue && (
                                <p className="text-xs text-muted-foreground">
                                    {stat.subValue}
                                </p>
                            )}
                            {stat.change !== undefined && (
                                <div className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${
                                    stat.change >= 0
                                        ? "text-[#166534] dark:text-mint"
                                        : "text-red-700 dark:text-red-400"
                                }`}>
                                    {stat.change >= 0 ? (
                                        <ArrowUp className="h-3 w-3" />
                                    ) : (
                                        <ArrowDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(stat.change).toFixed(1)}%
                                </div>
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
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        </BrandCard>
    )
}
