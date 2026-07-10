"use client"

import React from "react"
import { TrendingUp, ArrowUp, ArrowDown, DollarSign, Calendar, Briefcase } from "lucide-react"
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
    const { language } = useLanguage()

    if (isLoading) return <RevenuePulseSkeleton />

    const stats = [
        {
            label: language === "el" ? "Μηνιαία Έσοδα" : "Monthly Revenue",
            value: formatCurrencyCompact(metrics.mrr, language),
            icon: DollarSign,
            change: metrics.monthlyGrowthPercent,
        },
        {
            label: language === "el" ? "Ανανεώσεις Μήνα" : "Renewals This Month",
            value: String(metrics.renewalsDueThisMonth),
            subValue: formatCurrencyCompact(metrics.renewalsDueAmount, language),
            icon: Calendar,
        },
        {
            label: language === "el" ? "Pipeline Προμηθειών" : "Commission Pipeline",
            value: formatCurrencyCompact(metrics.commissionPipeline, language),
            icon: Briefcase,
            gated: isPipelineGated,
        },
    ]

    return (
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === "el" ? "Παλμός Εσόδων" : "Revenue Pulse"}
                </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className="relative rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] p-3"
                        >
                            {stat.gated && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm dark:bg-slate-900/60">
                                    <span className="text-xs font-medium text-slate-500">
                                        Pro+
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-medium">{stat.label}</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                {stat.value}
                            </p>
                            {stat.subValue && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {stat.subValue}
                                </p>
                            )}
                            {stat.change !== undefined && (
                                <div className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${
                                    stat.change >= 0
                                        ? "text-[#166534] dark:text-mint"
                                        : "text-red-600 dark:text-red-400"
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
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        </BrandCard>
    )
}
