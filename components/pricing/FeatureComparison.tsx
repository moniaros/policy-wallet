"use client"

import React from "react"
import { Check, X } from "lucide-react"
import {
    FEATURE_COLUMN_HEADER,
    type LocalizedText,
    type PublicPricingComparisonRow,
    type PublicPricingPlan,
} from "@/lib/pricing/public-pricing-content"

export interface FeatureComparisonProps {
    language: "el" | "en"
    plans: PublicPricingPlan[]
    rows: PublicPricingComparisonRow[]
    className?: string
}

const YES_NO: Record<"yes" | "no", LocalizedText> = {
    yes: { el: "Ναι", en: "Yes" },
    no: { el: "Όχι", en: "No" },
}

/**
 * The plan comparison table.
 *
 * Every included/excluded cell used to be a bare icon. A tick with no text is
 * nothing at all to a screen reader, so the entire point of the table — which
 * plan gives you what — was unreadable without sight. Each cell now carries its
 * word, visible on wide screens and screen-reader-only on narrow ones where the
 * column is too tight for it.
 *
 * The wide table also scrolls sideways on small screens, so its scroll
 * container is focusable and labelled — otherwise a keyboard user cannot reach
 * the columns past the fold.
 */
export function FeatureComparison({ language, plans, rows, className = "" }: FeatureComparisonProps) {
    const pick = (value: LocalizedText) => (language === "el" ? value.el : value.en)

    return (
        <div
            role="region"
            aria-label={pick({ el: "Σύγκριση πλάνων", en: "Plan comparison" })}
            tabIndex={0}
            className={`relative overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] ${className}`}
        >
            <table className="w-full min-w-[640px] border-collapse">
                <caption className="sr-only">
                    {pick({
                        el: "Τι περιλαμβάνει κάθε πλάνο του PolicyWallet.",
                        en: "What each PolicyWallet plan includes.",
                    })}
                </caption>
                <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                        <th scope="col" className="px-6 py-4 text-left text-body-lg font-bold text-slate-900 dark:text-white">
                            {FEATURE_COLUMN_HEADER[language]}
                        </th>
                        {plans.map((plan) => (
                            <th
                                key={plan.key}
                                scope="col"
                                className={`px-6 py-4 text-center text-body-lg font-bold ${
                                    plan.isHighlighted
                                        ? "rounded-t-xl bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] dark:from-[#29685B]/15 dark:to-[#29685B]/10"
                                        : ""
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span
                                        className={
                                            plan.isHighlighted
                                                ? "font-bold text-[#29685B] dark:text-[#A7F3D0]"
                                                : "text-slate-900 dark:text-white"
                                        }
                                    >
                                        {plan.name[language]}
                                    </span>
                                    {plan.badge && (
                                        <span className="rounded-full bg-[#29685B] px-2 py-0.5 text-center text-caption font-bold text-white">
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
                                            className="px-6 py-3 text-body-sm font-bold tracking-wide uppercase text-slate-700 dark:text-slate-300"
                                        >
                                            {categoryLabel}
                                        </td>
                                    </tr>
                                )}
                                <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                                    <th
                                        scope="row"
                                        className="px-6 py-4 text-left text-body font-normal text-slate-700 dark:text-slate-300"
                                    >
                                        {row.name[language]}
                                    </th>
                                    {plans.map((plan) => (
                                        <td
                                            key={`${row.name.en}-${plan.key}`}
                                            className={`px-6 py-4 text-center ${
                                                plan.isHighlighted
                                                    ? "bg-gradient-to-br from-[#F0FDF4]/60 to-[#ECFDF5]/60 dark:from-[#29685B]/10 dark:to-[#29685B]/5"
                                                    : ""
                                            }`}
                                        >
                                            {renderCell(row.values[plan.key], language)}
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

function renderCell(
    value: boolean | string | LocalizedText | undefined,
    language: "el" | "en"
) {
    const pick = (text: LocalizedText) => (language === "el" ? text.el : text.en)

    if (typeof value === "boolean") {
        return (
            <span className="inline-flex items-center justify-center gap-1.5">
                <span
                    aria-hidden
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                        value ? "bg-primary-soft dark:bg-primary/20" : "bg-red-100 dark:bg-red-900/30"
                    }`}
                >
                    {value ? (
                        <Check className="h-4 w-4 text-primary dark:text-mint" />
                    ) : (
                        <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                </span>
                <span className="sr-only">{pick(value ? YES_NO.yes : YES_NO.no)}</span>
            </span>
        )
    }

    if (typeof value === "string" && value.trim().length > 0) {
        return <span className="text-body-sm font-semibold text-slate-700 dark:text-slate-300">{value}</span>
    }

    if (value && typeof value === "object") {
        return <span className="text-body-sm font-semibold text-slate-700 dark:text-slate-300">{pick(value)}</span>
    }

    return (
        <span className="inline-flex items-center justify-center">
            <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
                <span className="text-caption font-bold text-slate-500 dark:text-slate-400">—</span>
            </span>
            <span className="sr-only">
                {pick({ el: "Δεν περιλαμβάνεται", en: "Not included" })}
            </span>
        </span>
    )
}
