"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Check } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'

export interface UpgradePromptProps {
    reason: 'policy_limit' | 'feature_locked' | 'notifications_disabled' | 'daily_limit' | 'gap_limit'
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

    const messages = {
        policy_limit: {
            title: {
                el: 'Ξεκλειδώστε Απεριόριστα Συμβόλαια',
                en: 'Unlock Unlimited Policies',
            },
            description: {
                el: 'Έχετε φτάσει το όριο των 3 συμβολαίων. Αναβαθμίστε σε Premium για απεριόριστα συμβόλαια και προηγμένες δυνατότητες AI.',
                en: 'You\'ve reached your 3-policy limit. Upgrade to Premium for unlimited policies and advanced AI features.',
            },
        },
        feature_locked: {
            title: {
                el: 'Χαρακτηριστικό Premium',
                en: 'Premium Feature',
            },
            description: {
                el: 'Αυτό το χαρακτηριστικό είναι διαθέσιμο μόνο στο Premium πλάνο. Αναβαθμίστε για να το ξεκλειδώσετε.',
                en: 'This feature is only available on the Premium plan. Upgrade to unlock it.',
            },
        },
        notifications_disabled: {
            title: {
                el: 'Ενεργοποιήστε Ειδοποιήσεις',
                en: 'Enable Notifications',
            },
            description: {
                el: 'Οι αυτόματες ειδοποιήσεις email για ανανεώσεις και προθεσμίες είναι διαθέσιμες μόνο στο Premium πλάνο.',
                en: 'Automatic email notifications for renewals and deadlines are only available on the Premium plan.',
            },
        },
        daily_limit: {
            title: {
                el: 'Όριο Ημερήσιων Ερωτήσεων',
                en: 'Daily Question Limit Reached',
            },
            description: {
                el: 'Έχετε φτάσει το ημερήσιο όριο των 10 ερωτήσεων. Αναβαθμίστε για 500 ερωτήσεις/μήνα μόνο με €4.99.',
                en: 'You have reached your daily limit of 10 questions. Upgrade for 500 questions/month for just €4.99.',
            },
        },
        gap_limit: {
            title: {
                el: 'Όριο Ανάλυσης Κενών',
                en: 'Gap Analysis Limit Reached',
            },
            description: {
                el: 'Έχετε φτάσει το όριο των 2 αναλύσεων ανά ημέρα. Αναβαθμίστε για απεριόριστες αναλύσεις.',
                en: 'You have reached your limit of 2 analyses per day. Upgrade for unlimited analyses.',
            },
        }
    }

    const message = messages[reason]

    const benefits = [
        copy.features.unlimitedPolicies[language],
        copy.features.advancedAI[language],
        copy.features.emailNotifications[language],
        copy.features.interactiveQA[language],
    ]

    const handleUpgrade = () => {
        router.push('/upgrade')
    }

    const ctaText = (reason === 'daily_limit' || reason === 'gap_limit')
        ? (language === 'el' ? 'Ξεκλειδώστε με €4.99' : 'Unlock for €4.99')
        : copy.cta.upgrade[language]

    return (
        <div
            className={`relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-6 ${className}`}
        >
            {/* Dismiss Button */}
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            {/* Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {message.title[language]}
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                {message.description[language]}
            </p>

            {/* Benefits */}
            <ul className="space-y-2 mb-6">
                {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{benefit}</span>
                    </li>
                ))}
            </ul>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleUpgrade}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-200"
                >
                    {ctaText}
                </button>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors"
                    >
                        {language === 'el' ? 'Αργότερα' : 'Maybe Later'}
                    </button>
                )}
            </div>

            {/* Trust Signal */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                {copy.trust.cancelAnytime[language]} • {copy.trust.noHiddenFees[language]}
            </p>
        </div>
    )
}
