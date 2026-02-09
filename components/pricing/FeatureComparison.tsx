"use client"

import React from 'react'
import { Check, X } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { ENTITLEMENT_LIMITS } from '@/lib/subscription-entitlements'

export interface FeatureComparisonProps {
    language: 'el' | 'en'
    className?: string
}

interface ComparisonFeature {
    name: { el: string; en: string }
    free: boolean | string
    plus: boolean | string
    pro: boolean | string
    category?: { el: string; en: string }
}

export function FeatureComparison({ language, className = '' }: FeatureComparisonProps) {
    const copy = subscriptionCopy

    const features: ComparisonFeature[] = [
        {
            category: { el: 'Διαχείριση Συμβολαίων', en: 'Policy Management' },
            name: { el: 'Αριθμός Συμβολαίων', en: 'Number of Policies' },
            free: String(ENTITLEMENT_LIMITS.free.policies),
            plus: String(ENTITLEMENT_LIMITS.plus.policies),
            pro: copy.messages.unlimited[language],
        },
        {
            category: { el: 'Ανάλυση με AI', en: 'AI Analysis' },
            name: { el: 'AI Αναλύσεις ανά μήνα', en: 'AI analyses per month' },
            free: String(ENTITLEMENT_LIMITS.free.aiAnalysisPerMonth),
            plus: String(ENTITLEMENT_LIMITS.plus.aiAnalysisPerMonth),
            pro: copy.messages.unlimited[language],
        },
        {
            name: { el: 'AI ερωτήσεις ανά ημέρα', en: 'AI questions per day' },
            free: String(ENTITLEMENT_LIMITS.free.questionsPerDay),
            plus: String(ENTITLEMENT_LIMITS.plus.questionsPerDay),
            pro: copy.messages.unlimited[language],
        },
        {
            name: { el: 'Gap αναλύσεις ανά ημέρα', en: 'Gap analyses per day' },
            free: String(ENTITLEMENT_LIMITS.free.gapAnalysisPerDay),
            plus: String(ENTITLEMENT_LIMITS.plus.gapAnalysisPerDay),
            pro: copy.messages.unlimited[language],
        },
        {
            name: copy.features.interactiveQA,
            free: ENTITLEMENT_LIMITS.free.interactiveQA,
            plus: ENTITLEMENT_LIMITS.plus.interactiveQA,
            pro: ENTITLEMENT_LIMITS.pro.interactiveQA,
        },
        {
            category: { el: 'Ειδοποιήσεις & Analytics', en: 'Notifications & Analytics' },
            name: copy.features.emailNotifications,
            free: ENTITLEMENT_LIMITS.free.notifications,
            plus: ENTITLEMENT_LIMITS.plus.notifications,
            pro: ENTITLEMENT_LIMITS.pro.notifications,
        },
        {
            name: copy.features.advancedAnalytics,
            free: ENTITLEMENT_LIMITS.free.advancedAnalytics,
            plus: ENTITLEMENT_LIMITS.plus.advancedAnalytics,
            pro: ENTITLEMENT_LIMITS.pro.advancedAnalytics,
        },
        {
            category: { el: 'Συνεργασία', en: 'Collaboration' },
            name: copy.features.agentCollaboration,
            free: ENTITLEMENT_LIMITS.free.agentCollaboration,
            plus: ENTITLEMENT_LIMITS.plus.agentCollaboration,
            pro: ENTITLEMENT_LIMITS.pro.agentCollaboration,
        },
    ]

    let currentCategory: string | null = null

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                        <th className="text-left py-4 px-6 text-slate-900 dark:text-white font-bold">
                            {language === 'el' ? 'Χαρακτηριστικό' : 'Feature'}
                        </th>
                        <th className="text-center py-4 px-6 text-slate-900 dark:text-white font-bold">
                            {copy.tiers.free.name[language]}
                        </th>
                        <th className="text-center py-4 px-6 text-slate-900 dark:text-white font-bold">
                            {copy.tiers.plus.name[language]}
                        </th>
                        <th className="text-center py-4 px-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-t-xl">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-black">
                                    {copy.tiers.pro.name[language]}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full text-center">
                                    {copy.tiers.pro.badge?.[language] || 'PRO'}
                                </span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {features.map((feature, idx) => {
                        const showCategory = feature.category && feature.category[language] !== currentCategory
                        if (showCategory && feature.category) currentCategory = feature.category[language]

                        return (
                            <React.Fragment key={idx}>
                                {showCategory && feature.category && (
                                    <tr className="bg-slate-100 dark:bg-slate-800">
                                        <td
                                            colSpan={4}
                                            className="py-3 px-6 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
                                        >
                                            {feature.category[language]}
                                        </td>
                                    </tr>
                                )}
                                <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                                        {feature.name[language]}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {renderCell(feature.free)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {renderCell(feature.plus)}
                                    </td>
                                    <td className="py-4 px-6 text-center bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10">
                                        {renderCell(feature.pro)}
                                    </td>
                                </tr>
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

function renderCell(value: boolean | string) {
    if (typeof value === 'boolean') {
        return value ? (
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
        ) : (
            <X className="w-5 h-5 text-slate-400 dark:text-slate-600 mx-auto" />
        )
    }
    return <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</span>
}
