"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Check } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { trackJourneyEvent } from '@/lib/journey/funnel'

export interface UpgradePromptProps {
    reason: 'policy_limit' | 'feature_locked' | 'notifications_disabled' | 'daily_limit' | 'gap_limit' | 'token_limit'
    language: 'el' | 'en'
    onDismiss?: () => void
    className?: string
}

export function UpgradePrompt({
    reason,
    language,
    onDismiss,
    className = '',
}: UpgradePromptProps) {
    const router = useRouter()
    const copy = subscriptionCopy

    useEffect(() => {
        trackJourneyEvent('upgrade_prompt_viewed', {
            reason,
            location: 'upgrade_prompt_component',
        })
    }, [reason])

    const messages = {
        policy_limit: {
            title: {
                el: 'Ξεκλειδώστε περισσότερα συμβόλαια',
                en: 'Unlock More Policy Capacity',
            },
            description: {
                el: 'Έχετε φτάσει το όριο συμβολαίων του πλάνου σας. Αναβαθμίστε για να συνεχίσετε χωρίς περιορισμό.',
                en: "You've reached your plan's policy limit. Upgrade to continue without friction.",
            },
        },
        feature_locked: {
            title: {
                el: 'Χαρακτηριστικό επί πληρωμή πλάνου',
                en: 'Paid Plan Feature',
            },
            description: {
                el: 'Αυτό το χαρακτηριστικό είναι διαθέσιμο σε επί πληρωμή πλάνα. Αναβαθμίστε για πρόσβαση.',
                en: 'This feature is available on paid plans. Upgrade to unlock access.',
            },
        },
        notifications_disabled: {
            title: {
                el: 'Ενεργοποιήστε ειδοποιήσεις',
                en: 'Enable Notifications',
            },
            description: {
                el: 'Οι αυτόματες ειδοποιήσεις email είναι διαθέσιμες σε επί πληρωμή πλάνα.',
                en: 'Automatic email notifications are available on paid plans.',
            },
        },
        daily_limit: {
            title: {
                el: 'Φτάσατε το ημερήσιο όριο AI ερωτήσεων',
                en: 'Daily AI Question Limit Reached',
            },
            description: {
                el: 'Αναβαθμίστε για περισσότερες ημερήσιες ερωτήσεις και ταχύτερη ανάλυση αποφάσεων.',
                en: 'Upgrade for more daily AI questions and faster decision support.',
            },
        },
        gap_limit: {
            title: {
                el: 'Φτάσατε το όριο αναλύσεων κενού κάλυψης',
                en: 'Gap Analysis Limit Reached',
            },
            description: {
                el: 'Αναβαθμίστε για περισσότερες αναλύσεις κενού κάλυψης και πληρέστερη εικόνα κινδύνου.',
                en: 'Upgrade for more gap analyses and fuller risk visibility.',
            },
        },
        token_limit: {
            title: {
                el: 'Εξαντλήθηκαν τα AI tokens του μήνα',
                en: 'Monthly AI Tokens Exhausted',
            },
            description: {
                el: 'Αναβαθμίστε το πλάνο σας ή αγοράστε επιπλέον tokens για να συνεχίσετε τις αναλύσεις AI.',
                en: 'Upgrade your plan or buy extra tokens to continue AI analyses.',
            },
        },
    }

    const message = messages[reason]

    const benefits = [
        copy.features.unlimitedPolicies[language],
        copy.features.advancedAI[language],
        copy.features.emailNotifications[language],
        copy.features.interactiveQA[language],
    ]

    const handleUpgrade = () => {
        trackJourneyEvent('upgrade_started', {
            source: 'upgrade_prompt_component',
        })
        router.push('/upgrade')
    }

    return (
        <div
            className={`relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-6 ${className}`}
        >
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {message.title[language]}
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                {message.description[language]}
            </p>

            <ul className="space-y-2 mb-6">
                {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{benefit}</span>
                    </li>
                ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleUpgrade}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-200"
                >
                    {copy.cta.upgrade[language]}
                </button>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors"
                    >
                        {({ el: 'Αργότερα', en: 'Maybe Later' } as const)[language]}
                    </button>
                )}
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                {copy.trust.cancelAnytime[language]} • {copy.trust.noHiddenFees[language]}
            </p>
        </div>
    )
}
