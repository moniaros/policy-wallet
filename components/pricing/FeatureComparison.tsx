"use client"

import React from 'react'
import { Check, X } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'

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
            free: '3',
            plus: '10',
            pro: copy.messages.unlimited[language],
        },
        {
            name: copy.features.documentStorage,
            free: true,
            plus: true,
            pro: true,
        },
        {
            category: { el: 'Ανάλυση με AI', en: 'AI Analysis' },
            name: { el: 'Εξαγωγή Δεδομένων', en: 'Data Extraction' },
            free: true,
            plus: true,
            pro: true,
        },
        {
            name: { el: 'Ποιότητα Ανάλυσης', en: 'Analysis Quality' },
            free: copy.features.basicAI[language],
            plus: copy.features.basicAI[language],
            pro: copy.features.advancedAI[language],
        },
        {
            name: { el: 'Εντοπισμός Κενών Κάλυψης', en: 'Gap Detection' },
            free: copy.features.manualGapDetection[language],
            plus: copy.features.manualGapDetection[language],
            pro: copy.features.automaticGapDetection[language],
        },
        {
            name: copy.features.interactiveQA,
            free: false,
            plus: false,
            pro: true,
        },
        {
            category: { el: 'Ειδοποιήσεις & Υπενθυμίσεις', en: 'Notifications & Reminders' },
            name: copy.features.emailNotifications,
            free: false,
            plus: true,
            pro: true,
        },
        {
            name: { el: 'Υπενθυμίσεις Ανανέωσης', en: 'Renewal Reminders' },
            free: false,
            plus: true,
            pro: true,
        },
        {
            name: { el: 'Προληπτικές Ειδοποιήσεις', en: 'Proactive Alerts' },
            free: false,
            plus: false,
            pro: true,
        },
        {
            category: { el: 'Reports & Analytics', en: 'Reports & Analytics' },
            name: copy.features.basicInsights,
            free: true,
            plus: true,
            pro: true,
        },
        {
            name: copy.features.advancedAnalytics,
            free: false,
            plus: false,
            pro: true,
        },
        {
            category: { el: 'Support & Collaboration', en: 'Support & Collaboration' },
            name: { el: 'Email Support', en: 'Email Support' },
            free: true,
            plus: true,
            pro: true,
        },
        {
            name: copy.features.prioritySupport,
            free: false,
            plus: false,
            pro: true,
        },
        {
            name: copy.features.agentCollaboration,
            free: false,
            plus: true,
            pro: true,
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
                        if (showCategory && feature.category) {
                            currentCategory = feature.category[language]
                        }

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
                                        {renderCell(feature.free, language)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {renderCell(feature.plus, language)}
                                    </td>
                                    <td className="py-4 px-6 text-center bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10">
                                        {renderCell(feature.pro, language)}
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

function renderCell(value: boolean | string, language: 'el' | 'en') {
    if (typeof value === 'boolean') {
        return value ? (
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
        ) : (
            <X className="w-5 h-5 text-slate-400 dark:text-slate-600 mx-auto" />
        )
    }
    return <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</span>
}
