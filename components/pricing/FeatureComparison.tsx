"use client"

import React from "react"
import { Check, X } from "lucide-react"
import {
    FEATURE_COLUMN_HEADER,
    type PublicPricingComparisonRow,
    type PublicPricingPlan,
} from "@/lib/pricing/public-pricing-content"

export interface FeatureComparisonProps {
    language: "el" | "en"
    plans: PublicPricingPlan[]
    rows: PublicPricingComparisonRow[]
    className?: string
}

export function FeatureComparison({ language, plans, rows, className = "" }: FeatureComparisonProps) {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white">
                            {FEATURE_COLUMN_HEADER[language]}
                        </th>
                        {plans.map((plan) => (
                            <th
                                key={plan.key}
                                className={`px-6 py-4 text-center font-bold ${
                                    plan.isHighlighted
                                        ? "rounded-t-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30"
                                        : ""
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`${plan.isHighlighted ? "font-black text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
                                        {plan.name[language]}
                                    </span>
                                    {plan.badge && (
                                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-center text-xs font-bold text-white">
                                            {plan.badge[language]}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const categoryLabel = row.category?.[language] ?? null
                        const previousCategory = rows[idx - 1]?.category?.[language] ?? null
                        const showCategory = Boolean(categoryLabel && categoryLabel !== previousCategory)

                        return (
                            <React.Fragment key={`${row.name.en}-${idx}`}>
                                {showCategory && (
                                    <tr className="bg-slate-100 dark:bg-slate-800">
                                        <td
                                            colSpan={plans.length + 1}
                                            className="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300"
                                        >
                                            {categoryLabel}
                                        </td>
                                    </tr>
                                )}
                                <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{row.name[language]}</td>
                                    {plans.map((plan) => (
                                        <td
                                            key={`${row.name.en}-${plan.key}`}
                                            className={`px-6 py-4 text-center ${
                                                plan.isHighlighted
                                                    ? "bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10"
                                                    : ""
                                            }`}
                                        >
                                            {renderCell(row.values[plan.key])}
                                        </td>
                                    ))}
                                </tr>
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

function renderCell(value: boolean | string | undefined) {
    if (typeof value === "boolean") {
        return value ? (
            <div className="flex items-center justify-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft dark:bg-primary/20">
                    <Check className="h-4 w-4 text-primary dark:text-mint" />
                </span>
            </div>
        ) : (
            <div className="flex items-center justify-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                </span>
            </div>
        )
    }

    if (typeof value === "string" && value.trim().length > 0) {
        return <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</span>
    }

    return (
        <div className="flex items-center justify-center">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">—</span>
            </span>
        </div>
    )
}
