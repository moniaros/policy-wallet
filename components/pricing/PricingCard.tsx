"use client"

import React from "react"
import { Check, Sparkles, X } from "lucide-react"
import type {
    BillingPeriod,
    LocalizedText,
    PublicPricingPlan,
} from "@/lib/pricing/public-pricing-content"

const WAIT_LABEL: LocalizedText = { el: "Παρακαλώ περιμένετε...", en: "Please wait..." }
const NOT_INCLUDED_LABEL: LocalizedText = { el: "Δεν περιλαμβάνεται: ", en: "Not included: " }

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
                    ? "scale-105 border-2 border-[#29685B] bg-[#F0FDF4] dark:bg-emerald-900/20 shadow-xl shadow-[#29685B]/10 dark:border-[#89D9B2]/60 dark:bg-slate-900"
                    : "border border-slate-200 dark:border-white/10 bg-white hover:border-[#A7F3D0] hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#89D9B2]/50"
            } ${className}`}
        >
            {plan.badge && !isLoading && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#29685B] px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                    <Sparkles className="h-4 w-4" />
                    {plan.badge[language]}
                </div>
            )}

            <div className="mb-6 text-center">
                <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{plan.name[language]}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description[language]}</p>
            </div>

            <div className="mb-8 text-center">
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-slate-900 dark:text-white">{pricing.amount}</span>
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
                            <X aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        )}
                        <span className="text-sm leading-tight">
                            {/* The X icon alone is invisible to screen readers
                                and text extractors — without this prefix the
                                Free card READS as including full AI analysis. */}
                            {!feature.included && (
                                <span className="sr-only">{NOT_INCLUDED_LABEL[language]}</span>
                            )}
                            {feature.label[language]}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSelectPlan(plan)}
                disabled={isLoading}
                className={`w-full cursor-pointer ${
                    plan.isHighlighted ? "pw-primary-button" : "pw-secondary-button"
                } pw-btn-lg ${isLoading ? "cursor-not-allowed opacity-60" : ""}`}
            >
                {isLoading ? WAIT_LABEL[language] : actionLabel[language]}
            </button>
        </div>
    )
}

