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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6">
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
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {copy.tiers[tier].price[language]}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            {copy.tiers[tier].period[language]}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Messages */}
            {isPastDue && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
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
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-900 dark:text-orange-200">
                        {formatMessage(copy.messages.canceledAccess[language], {
                            date: currentPeriodEnd.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US'),
                        })}
                    </p>
                </div>
            )}

            {/* Usage Stats */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {language === 'el' ? 'Χρήση Συμβολαίων' : 'Policy Usage'}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {policiesLimit
                            ? formatMessage(copy.messages.policiesUsed[language], {
                                used: policiesUsed,
                                limit: policiesLimit,
                            })
                            : `${policiesUsed} ${copy.messages.unlimited[language]}`}
                    </span>
                </div>
                {policiesLimit && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${usagePercentage >= 100
                                ? 'bg-red-600'
                                : usagePercentage >= 75
                                    ? 'bg-orange-500'
                                    : 'bg-blue-600'
                                }`}
                            style={{ width: `${usagePercentage}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Next Billing (Premium only) */}
            {isPremium && currentPeriodEnd && !isCanceled && (
                <div className="mb-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {formatMessage(copy.messages.nextBilling[language], {
                            date: currentPeriodEnd.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US'),
                        })}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                {!isPremium && (
                    <button
                        onClick={onUpgrade}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-200"
                    >
                        {copy.cta.upgrade[language]}
                    </button>
                )}

                {isPremium && !isCanceled && (
                    <>
                        <button
                            onClick={onManage}
                            className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-all duration-200"
                        >
                            {copy.cta.manage[language]}
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors"
                        >
                            {copy.cta.cancel[language]}
                        </button>
                    </>
                )}

                {isCanceled && (
                    <button
                        onClick={onUpgrade}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-200"
                    >
                        {copy.cta.reactivate[language]}
                    </button>
                )}
            </div>

            {/* Premium Benefits (Free tier only) */}
            {!isPremium && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        {language === 'el' ? 'Αναβαθμίστε για:' : 'Upgrade for:'}
                    </p>
                    <ul className="space-y-2">
                        {[
                            copy.features.unlimitedPolicies,
                            copy.features.advancedAI,
                            copy.features.emailNotifications,
                            copy.features.interactiveQA,
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span>{feature[language]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
