"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { subscriptionCopy, formatMessage } from '@/lib/subscription-copy'
import { Crown, Calendar, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'

import { SubscriptionTier } from '@/lib/subscription-limits'

export interface CurrentPlanCardProps {
    subscription: {
        tier: SubscriptionTier
        status: 'active' | 'canceled' | 'past_due'
        currentPeriodEnd?: Date
        policiesUsed: number
        policiesLimit: number | null
    }
    language: 'el' | 'en'
    onUpgrade: () => void
    onManage: () => void
    onCancel: () => void
}

export function CurrentPlanCard({
    subscription,
    language,
    onUpgrade,
    onManage,
    onCancel,
}: CurrentPlanCardProps) {
    const router = useRouter()
    const copy = subscriptionCopy
    const { tier, status, currentPeriodEnd, policiesUsed, policiesLimit } = subscription

    const isPremium = tier !== 'free'
    const isCanceled = status === 'canceled'
    const isPastDue = status === 'past_due'

    // Calculate usage percentage
    const usagePercentage = policiesLimit
        ? Math.min((policiesUsed / policiesLimit) * 100, 100)
        : 0

    return (
        <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 p-8 shadow-sm group relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {isPremium && <Crown className="w-5 h-5 text-yellow-500" />}
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {copy.tiers[tier].name[language]}
                        </h3>
                        {isCanceled && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-full">
                                {language === 'el' ? 'Ακυρωμένο' : 'Canceled'}
                            </span>
                        )}
                        {isPastDue && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                                {language === 'el' ? 'Εκκρεμεί Πληρωμή' : 'Past Due'}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {copy.tiers[tier].description[language]}
                    </p>
                </div>
                {isPremium && (
                    <div className="text-right">
                        <div className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">
                            {copy.tiers[tier].price[language]}
                        </div>
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">
                            {copy.tiers[tier].period[language]}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Messages */}
            {isPastDue && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 relative z-10">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                            {copy.messages.paymentFailed[language]}
                        </p>
                        <button
                            onClick={onManage}
                            className="text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
                        >
                            {copy.cta.updatePayment[language]}
                        </button>
                    </div>
                </div>
            )}

            {isCanceled && currentPeriodEnd && (
                <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3 relative z-10">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-900 dark:text-orange-200">
                        {formatMessage(copy.messages.canceledAccess[language], {
                            date: currentPeriodEnd.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US'),
                        })}
                    </p>
                </div>
            )}

            {/* Usage Stats */}
            <div className="mb-8 relative z-10">
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                        {language === 'el' ? 'Χρήση Συμβολαίων' : 'Policy Usage'}
                    </span>
                    <span className="text-sm font-black text-stone-900 dark:text-white mt-1">
                        {policiesLimit
                            ? formatMessage(copy.messages.policiesUsed[language], {
                                used: policiesUsed,
                                limit: policiesLimit,
                            })
                            : `${policiesUsed} ${copy.messages.unlimited[language]}`}
                    </span>
                </div>
                {policiesLimit && (
                    <div className="w-full bg-stone-50 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${usagePercentage >= 90
                                ? 'bg-red-500'
                                : usagePercentage >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-primary'
                                }`}
                            style={{ width: `${usagePercentage}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Next Billing (Premium only) */}
            {isPremium && currentPeriodEnd && !isCanceled && (
                <div className="mb-8 flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400 relative z-10">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {formatMessage(copy.messages.nextBilling[language], {
                            date: currentPeriodEnd.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US'),
                        })}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                {!isPremium && (
                    <button
                        onClick={onUpgrade}
                        className="flex-1 px-8 py-4 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                        {copy.cta.upgrade[language]}
                    </button>
                )}

                {isPremium && !isCanceled && (
                    <>
                        <button
                            onClick={onManage}
                            className="flex-1 px-8 py-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                        >
                            {copy.cta.manage[language]}
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-8 py-4 text-stone-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            {copy.cta.cancel[language]}
                        </button>
                    </>
                )}

                {isCanceled && (
                    <button
                        onClick={onUpgrade}
                        className="flex-1 px-8 py-4 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                        {copy.cta.reactivate[language]}
                    </button>
                )}
            </div>

            {/* Premium Benefits (Free tier only) */}
            {!isPremium && (
                <div className="mt-8 pt-8 border-t border-stone-50 dark:border-stone-800 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">
                        {language === 'el' ? 'Αναβαθμίστε για:' : 'Upgrade for:'}
                    </p>
                    <ul className="space-y-3">
                        {[
                            copy.features.unlimitedPolicies,
                            copy.features.advancedAI,
                            copy.features.emailNotifications,
                            copy.features.interactiveQA,
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-3 text-sm font-bold text-stone-700 dark:text-stone-300">
                                <CheckCircle2 className="w-4 h-4 text-primary dark:text-mint flex-shrink-0" />
                                <span>{feature[language]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
