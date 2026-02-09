"use client"

import React from 'react'
import { Check, X, Sparkles } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { ENTITLEMENT_LIMITS } from '@/lib/subscription-entitlements'

export interface PricingCardProps {
    tier: 'free' | 'plus' | 'pro'
    language: 'el' | 'en'
    isHighlighted?: boolean
    currentTier?: 'free' | 'plus' | 'pro' | null
    onSelectPlan: (tier: 'free' | 'plus' | 'pro') => void
    className?: string
}

interface Feature {
    label: { el: string; en: string }
    included: boolean
    highlight?: boolean
}

export function PricingCard({
    tier,
    language,
    isHighlighted = false,
    currentTier = null,
    onSelectPlan,
    className = '',
}: PricingCardProps) {
    const copy = subscriptionCopy
    const tierData = copy.tiers[tier]
    const isCurrentPlan = currentTier === tier
    const limits = ENTITLEMENT_LIMITS[tier]

    const features: Feature[] = [
        limits.policies === null
            ? { label: copy.features.unlimitedPolicies, included: true, highlight: true }
            : {
                label: {
                    el: `Μέχρι ${limits.policies} συμβόλαια`,
                    en: `Up to ${limits.policies} policies`,
                },
                included: true,
                highlight: tier !== 'free',
            },
        { label: tier === 'free' ? copy.features.basicAI : copy.features.advancedAI, included: true, highlight: tier !== 'free' },
        { label: tier === 'free' ? copy.features.manualGapDetection : copy.features.automaticGapDetection, included: true, highlight: tier !== 'free' },
        { label: copy.features.documentStorage, included: true },
        { label: copy.features.emailNotifications, included: limits.notifications },
        { label: copy.features.interactiveQA, included: limits.interactiveQA },
        { label: copy.features.advancedAnalytics, included: limits.advancedAnalytics },
        { label: copy.features.agentCollaboration, included: limits.agentCollaboration },
    ]

    return (
        <div
            className={`
        relative rounded-2xl p-8 transition-all duration-300
        ${isHighlighted
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-500 dark:border-blue-400 shadow-2xl shadow-blue-500/20 scale-105'
                    : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl'
                }
        ${className}
      `}
        >
            {isHighlighted && !isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {'badge' in tierData && tierData.badge[language]}
                </div>
            )}

            {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-full shadow-lg">
                    {copy.cta.currentPlan[language]}
                </div>
            )}

            <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    {tierData.name[language]}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {tierData.description[language]}
                </p>
            </div>

            <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">
                        {tierData.price[language]}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-lg">
                        {tierData.period[language]}
                    </span>
                </div>
                {tier !== 'free' && 'annual' in tierData && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {language === 'el' ? 'ή ' : 'or '}{tierData.annual.price[language]}{tierData.annual.period[language]}
                    </p>
                )}
            </div>

            <ul className="space-y-3 mb-8">
                {features.map((feature, idx) => (
                    <li
                        key={idx}
                        className={`flex items-start gap-3 ${feature.highlight ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                            }`}
                    >
                        {feature.included ? (
                            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${feature.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`} />
                        ) : (
                            <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-600" />
                        )}
                        <span className="text-sm leading-tight">{feature.label[language]}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSelectPlan(tier)}
                disabled={isCurrentPlan}
                className={`
          w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all duration-200
          ${isCurrentPlan
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                        : tier !== 'free'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }
        `}
            >
                {isCurrentPlan
                    ? copy.cta.currentPlan[language]
                    : tier === 'plus'
                        ? copy.cta.startPlus[language]
                        : tier === 'pro'
                            ? copy.cta.startPro[language]
                            : copy.cta.getStarted[language]
                }
            </button>

            {tier !== 'free' && !isCurrentPlan && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                    {copy.trust.cancelAnytime[language]}
                </p>
            )}
        </div>
    )
}
