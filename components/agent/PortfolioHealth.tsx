"use client"

import React from "react"
import { ShieldAlert, UserCheck, AlertTriangle, Activity } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import type { PortfolioHealth as PortfolioHealthData } from "./types"

interface PortfolioHealthProps {
    health: PortfolioHealthData
    isLoading?: boolean
}

function RadialProgress({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={4}
                className="text-slate-200 dark:text-slate-700"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
            />
        </svg>
    )
}

export function PortfolioHealth({ health, isLoading }: PortfolioHealthProps) {
    const { language } = useLanguage()

    if (isLoading) return <PortfolioHealthSkeleton />

    const gapColor = health.coverageGapPercent > 30
        ? "#ef4444"
        : health.coverageGapPercent > 15
            ? "#f59e0b"
            : "#29685B"

    const profileColor = health.completeProfilePercent >= 80
        ? "#29685B"
        : health.completeProfilePercent >= 50
            ? "#f59e0b"
            : "#ef4444"

    const atRiskColor = health.atRiskCount > 5
        ? "#ef4444"
        : health.atRiskCount > 0
            ? "#f59e0b"
            : "#29685B"

    const metrics = [
        {
            label: language === "el" ? "Κενά Κάλυψης" : "Coverage Gaps",
            value: health.coverageGapPercent,
            displayValue: `${health.coverageGapPercent}%`,
            color: gapColor,
            icon: ShieldAlert,
            description: language === "el"
                ? "πελατών με κενά κάλυψης"
                : "of clients have coverage gaps",
        },
        {
            label: language === "el" ? "Πλήρη Προφίλ" : "Complete Profiles",
            value: health.completeProfilePercent,
            displayValue: `${health.completeProfilePercent}%`,
            color: profileColor,
            icon: UserCheck,
            description: language === "el"
                ? "πελατών με πλήρες προφίλ"
                : "of clients have complete profiles",
        },
        {
            label: language === "el" ? "Σε Κίνδυνο" : "At Risk",
            value: Math.min(100, (health.atRiskCount / Math.max(health.totalClients, 1)) * 100),
            displayValue: String(health.atRiskCount),
            color: atRiskColor,
            icon: AlertTriangle,
            description: language === "el"
                ? "πελάτες χρειάζονται προσοχή"
                : "clients need attention",
        },
    ]

    return (
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === "el" ? "Υγεία Χαρτοφυλακίου" : "Portfolio Health"}
                </h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                        <div key={metric.label} className="flex flex-col items-center text-center">
                            <div className="relative">
                                <RadialProgress value={metric.value} color={metric.color} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {metric.displayValue}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center gap-1">
                                <Icon className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {metric.label}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                {metric.description}
                            </p>
                        </div>
                    )
                })}
            </div>
        </BrandCard>
    )
}

export function PortfolioHealthSkeleton() {
    return (
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="mt-2 h-3 w-20" />
                        <Skeleton className="mt-1 h-2 w-24" />
                    </div>
                ))}
            </div>
        </BrandCard>
    )
}
