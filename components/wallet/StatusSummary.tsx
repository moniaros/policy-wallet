"use client"

import { useLanguage } from '@/contexts/LanguageContext'

interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    actionNeededCount: number
}

export function StatusSummary({ activeCount, expiringCount, actionNeededCount }: StatusSummaryProps) {
    const { t, language } = useLanguage()

    const totalPolicies = activeCount + expiringCount + actionNeededCount

    return (
        <div className="mb-8">
            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Policies */}
                <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center">
                            <span className="text-lg">📋</span>
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                        {totalPolicies}
                    </p>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">
                        {language === 'el' ? 'Σύνολο' : 'Total'}
                    </p>
                </div>

                {/* Active */}
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-teal-700 dark:text-teal-300">
                        {activeCount}
                    </p>
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mt-1">
                        {t.policyStatus.active}
                    </p>
                </div>

                {/* Expiring Soon */}
                <div className={`border rounded-2xl p-4 sm:p-5 transition-all ${expiringCount > 0
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                        : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expiringCount > 0
                                ? 'bg-amber-100 dark:bg-amber-900/50'
                                : 'bg-stone-100 dark:bg-stone-700'
                            }`}>
                            <span className="text-lg">⏰</span>
                        </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${expiringCount > 0
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}>
                        {expiringCount}
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${expiringCount > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}>
                        {t.policyStatus.expiringSoon}
                    </p>
                </div>

                {/* Action Needed */}
                <div className={`border rounded-2xl p-4 sm:p-5 transition-all ${actionNeededCount > 0
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 animate-pulse'
                        : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${actionNeededCount > 0
                                ? 'bg-red-100 dark:bg-red-900/50'
                                : 'bg-stone-100 dark:bg-stone-700'
                            }`}>
                            <span className="text-lg">⚠️</span>
                        </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${actionNeededCount > 0
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}>
                        {actionNeededCount}
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${actionNeededCount > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}>
                        {t.policyStatus.actionNeeded}
                    </p>
                </div>
            </div>

            {/* Alert Banner for Urgent Items */}
            {(expiringCount > 0 || actionNeededCount > 0) && (
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-900/10 dark:to-red-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 dark:text-white">
                            {language === 'el' ? 'Απαιτείται προσοχή' : 'Attention needed'}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                            {expiringCount > 0 && `${expiringCount} ${language === 'el' ? 'λήγουν σύντομα' : 'expiring soon'}`}
                            {expiringCount > 0 && actionNeededCount > 0 && ' • '}
                            {actionNeededCount > 0 && `${actionNeededCount} ${language === 'el' ? 'χρειάζονται ενέργεια' : 'need action'}`}
                        </p>
                    </div>
                    <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </div>
    )
}
