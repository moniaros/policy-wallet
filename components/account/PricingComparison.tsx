"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Star, Shield, Zap } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { useLanguage } from '@/contexts/LanguageContext'

interface PricingComparisonProps {
    currentPlanId?: string
    onSelectPlan: (planId: string) => void
    isLoading?: boolean
}

interface PlanTier {
    id: string
    name: Record<string, string>
    description: Record<string, string>
    price: Record<string, string>
    period: Record<string, string>
    badge?: Record<string, string>
    popular?: boolean
    annual?: {
        price: Record<string, string>
        period: Record<string, string>
        savings: Record<string, string>
    }
    icon: any
    features: Array<{ name: string; included: boolean }>
}

export function PricingComparison({ currentPlanId, onSelectPlan, isLoading }: PricingComparisonProps) {
    const { language } = useLanguage()
    const copy = subscriptionCopy
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

    const tiers: PlanTier[] = [
        {
            id: 'free',
            ...copy.tiers.free,
            icon: Shield,
            features: [
                { name: copy.features.policyLimit[language].replace('{count}', '3'), included: true },
                { name: copy.features.basicAI[language], included: true },
                { name: copy.features.documentStorage[language], included: true },
                { name: copy.features.advancedAI[language], included: false },
                { name: copy.features.emailNotifications[language], included: false },
                { name: copy.features.interactiveQA[language], included: false },
            ]
        },
        {
            id: 'essential',
            ...copy.tiers.essential,
            icon: Zap,
            popular: true,
            features: [
                { name: copy.features.unlimitedPolicies[language], included: true },
                { name: copy.features.advancedAI[language], included: true },
                { name: copy.features.documentStorage[language], included: true },
                { name: copy.features.emailNotifications[language], included: true },
                { name: copy.features.interactiveQA[language], included: true },
                { name: copy.features.prioritySupport[language], included: false },
            ]
        },
        {
            id: 'professional',
            ...copy.tiers.professional,
            icon: Star,
            features: [
                { name: copy.features.unlimitedPolicies[language], included: true },
                { name: copy.features.advancedAnalytics[language], included: true },
                { name: copy.features.agentCollaboration[language], included: true },
                { name: copy.features.prioritySupport[language], included: true },
                { name: copy.features.digitalWallet[language], included: true },
                { name: copy.features.automaticGapDetection[language], included: true },
                { name: language === 'el' ? 'Προσαρμοσμένη Αναφορά' : 'Custom Reporting', included: true },
                { name: language === 'el' ? 'Premium Υποστήριξη' : '24/7 Premium Support', included: true },
            ]
        }
    ]

    const comparisonFeatures = [
        { name: copy.features.policyLimit[language].replace('{count}', '∞'), free: "3", essential: "Unlimited", professional: "Unlimited" },
        { name: copy.features.advancedAI[language], free: false, essential: true, professional: true },
        { name: copy.features.emailNotifications[language], free: false, essential: true, professional: true },
        { name: copy.features.interactiveQA[language], free: false, essential: true, professional: true },
        { name: copy.features.prioritySupport[language], free: false, essential: false, professional: true },
        { name: copy.features.digitalWallet[language], free: false, essential: false, professional: true },
        { name: copy.features.agentCollaboration[language], free: false, essential: false, professional: true },
        { name: copy.features.automaticGapDetection[language], free: false, essential: false, professional: true },
    ]

    return (
        <div className="w-full max-w-7xl mx-auto px-4">

            {/* Billing Toggle (Visual Only for now as per copy) */}
            <div className="flex justify-center mb-12">
                <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl flex items-center relative">
                    <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 ${billingPeriod === 'monthly'
                            ? 'text-stone-900 dark:text-white shadow-sm bg-white dark:bg-stone-700'
                            : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'
                            }`}
                    >
                        {language === 'el' ? 'Μηνιαία' : 'Monthly'}
                    </button>
                    <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 ${billingPeriod === 'annual'
                            ? 'text-stone-900 dark:text-white shadow-sm bg-white dark:bg-stone-700'
                            : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'
                            }`}
                    >
                        {language === 'el' ? 'Ετήσια' : 'Yearly'}
                        <span className="absolute -top-3 -right-3 bg-teal-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                            -20%
                        </span>
                    </button>

                    {/* Animated Background */}
                    <motion.div
                        layoutId="billingToggle"
                        className="absolute inset-y-1 rounded-xl bg-white dark:bg-stone-700 shadow-sm z-0"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{
                            width: '50%',
                            left: billingPeriod === 'monthly' ? '4px' : '50%'
                        }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tiers.map((tier, index) => {
                    const isCurrent = currentPlanId === tier.id
                    const isPopular = tier.popular

                    return (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-[32px] p-8 border hover:shadow-2xl transition-all duration-300 group flex flex-col ${isPopular
                                ? 'bg-white dark:bg-stone-900 border-teal-500 dark:border-teal-500 shadow-xl shadow-teal-500/10 scale-105 z-10'
                                : 'bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 hover:border-teal-200 dark:hover:border-teal-900'
                                }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                    {tier.badge?.[language] || 'Popular'}
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isPopular ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                                    }`}>
                                    <tier.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">
                                    {tier.name[language]}
                                </h3>
                                <p className="text-sm text-stone-500 h-10">
                                    {tier.description[language]}
                                </p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter">
                                        {billingPeriod === 'annual' ? tier.annual?.price[language] : tier.price[language]}
                                    </span>
                                    <span className="text-sm font-bold text-stone-400">
                                        {billingPeriod === 'annual' ? tier.annual?.period[language] : tier.period[language]}
                                    </span>
                                </div>
                                {billingPeriod === 'annual' && tier.annual?.savings && (
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 rounded-lg mt-2 inline-block">
                                        {tier.annual.savings[language]}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {tier.features.map((feature, i) => (
                                    <div key={i} className={`flex items-start gap-3 text-sm ${feature.included
                                        ? 'text-stone-700 dark:text-stone-300'
                                        : 'text-stone-400 line-through decoration-stone-300'
                                        }`}>
                                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${feature.included
                                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                            : 'bg-stone-100 dark:bg-stone-800 text-stone-300'
                                            }`}>
                                            {feature.included ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                        </div>
                                        <span className="font-medium">{feature.name}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => onSelectPlan(tier.id)}
                                disabled={isCurrent || isLoading}
                                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${isCurrent
                                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-default'
                                    : isPopular
                                        ? 'bg-teal-600 dark:bg-teal-500 text-white hover:bg-teal-700 dark:hover:bg-teal-400 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 active:scale-95'
                                        : 'bg-white dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 text-stone-900 dark:text-white hover:border-teal-500 dark:hover:border-teal-500 active:scale-95'
                                    }`}
                            >
                                {isCurrent
                                    ? copy.cta.currentPlan[language]
                                    : isLoading
                                        ? copy.cta.upgrade[language] + '...'
                                        : copy.cta.upgrade[language]}
                            </button>
                        </motion.div>
                    )
                })}
            </div>

            {/* In-depth Comparison Table */}
            <div className="mt-24 mb-16 overflow-hidden">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                        {language === 'el' ? 'Σύγκριση Δυνατοτήτων' : 'Compare Features'}
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-[32px] border border-stone-100 dark:border-stone-800">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-900/50">
                                <th className="px-8 py-6 text-sm font-black text-stone-400 uppercase tracking-widest">Feature</th>
                                <th className="px-8 py-6 text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">Free</th>
                                <th className="px-8 py-6 text-sm font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Essential</th>
                                <th className="px-8 py-6 text-sm font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Professional</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                            {comparisonFeatures.map((feat, i) => (
                                <tr key={i} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20 transition-colors">
                                    <td className="px-8 py-5 text-sm font-bold text-stone-700 dark:text-stone-300">{feat.name}</td>
                                    <td className="px-8 py-5">
                                        {typeof feat.free === 'string' ? (
                                            <span className="text-sm font-bold text-stone-500">{feat.free}</span>
                                        ) : feat.free ? (
                                            <Check className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <X className="w-5 h-5 text-stone-300" />
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {typeof feat.essential === 'string' ? (
                                            <span className="text-sm font-bold text-teal-600">{feat.essential}</span>
                                        ) : feat.essential ? (
                                            <Check className="w-5 h-5 text-teal-500" />
                                        ) : (
                                            <X className="w-5 h-5 text-stone-200" />
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {typeof feat.professional === 'string' ? (
                                            <span className="text-sm font-bold text-purple-600">{feat.professional}</span>
                                        ) : feat.professional ? (
                                            <Check className="w-5 h-5 text-purple-500" />
                                        ) : (
                                            <X className="w-5 h-5 text-stone-200" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-16 bg-stone-50 dark:bg-stone-900/50 rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-8 relative z-10">
                    {copy.headings.faq.title[language]}
                </h2>
                <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto relative z-10">
                    {copy.faq.map((item, i) => (
                        <div key={i}>
                            <h4 className="font-bold text-stone-900 dark:text-white mb-2">{item.question[language]}</h4>
                            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{item.answer[language]}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
