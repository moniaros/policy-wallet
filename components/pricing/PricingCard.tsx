"use client"

import React from "react"
import { Check, Sparkles, X } from "lucide-react"
import type {
    BillingPeriod,
    LocalizedText,
    PublicPricingPlan,
} from "@/lib/pricing/public-pricing-content"

export interface PricingCardProps {
    plan: PublicPricingPlan
    language: "el" | "en"
    billingPeriod: BillingPeriod
    actionLabel: LocalizedText
    isLoading?: boolean
    onSelectPlan: (plan: PublicPricingPlan) => void
    className?: string
}

export function PricingCard({
    plan,
    language,
    billingPeriod,
    actionLabel,
    isLoading = false,
    onSelectPlan,
    className = "",
}: PricingCardProps) {
    const annualAvailable = Boolean(plan.pricing.annual)
    const displayAnnual = billingPeriod === "annual" && annualAvailable
    const pricing = displayAnnual ? plan.pricing.annual! : plan.pricing.monthly

    return (
        <div
            className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.isHighlighted
                    ? "scale-105 border-2 border-[#D9D0C1] bg-[#EBE5D9] shadow-2xl shadow-[#D9D0C1]/50 dark:border-slate-700 dark:bg-slate-900"
                    : "border-2 border-slate-200 bg-white hover:border-[#29685B] hover:shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#29685B]"
            } ${className}`}
        >
            {plan.badge && !isLoading && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#29685B] px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                    <Sparkles className="h-4 w-4" />
                    {plan.badge[language]}
                </div>
            )}

            <div className="mb-6 text-center">
                <h3 className="mb-2 text-2xl font-black text-slate-900 dark:text-white">{plan.name[language]}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description[language]}</p>
            </div>

            <div className="mb-8 text-center">
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{pricing.amount}</span>
                    <span className="text-lg text-slate-600 dark:text-slate-400">{pricing.period[language]}</span>
                </div>
                {displayAnnual && plan.pricing.annual?.savings && (
                    <p className="mt-2 text-xs font-semibold text-[#29685B] dark:text-[#89D9B2]">
                        {plan.pricing.annual.savings[language]}
                    </p>
                )}
            </div>

            <ul className="mb-8 space-y-3">
                {plan.features.map((feature, idx) => (
                    <li
                        key={`${plan.key}-${idx}`}
                        className={`flex items-start gap-3 ${
                            feature.highlight
                                ? "font-semibold text-[#29685B] dark:text-[#89D9B2]"
                                : "text-slate-700 dark:text-slate-300"
                        }`}
                    >
                        {feature.included ? (
                            <Check
                                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                                    feature.highlight
                                        ? "text-[#29685B] dark:text-[#89D9B2]"
                                        : "text-slate-800 dark:text-slate-200"
                                }`}
                            />
                        ) : (
                            <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-600" />
                        )}
                        <span className="text-sm leading-tight">{feature.label[language]}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSelectPlan(plan)}
                disabled={isLoading}
                className={`w-full rounded-xl px-6 py-3.5 text-base font-bold transition-all duration-200 ${
                    plan.isHighlighted
                        ? "bg-[#29685B] text-white shadow-lg shadow-[#29685B]/30 hover:bg-[#1C4E44]"
                        : "border-2 border-slate-300 bg-white text-slate-900 hover:border-[#29685B] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-[#89D9B2] dark:hover:bg-slate-700"
                } ${isLoading ? "cursor-not-allowed opacity-60" : ""}`}
            >
                {isLoading ? (language === "el" ? "Παρακαλώ περιμένετε..." : "Please wait...") : actionLabel[language]}
            </button>
        </div>
    )
}

