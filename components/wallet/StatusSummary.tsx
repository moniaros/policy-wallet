"use client"

import { useLanguage } from '@/contexts/LanguageContext'

interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    actionNeededCount: number
}

export function StatusSummary({ activeCount, expiringCount, actionNeededCount }: StatusSummaryProps) {
    const { t } = useLanguage()

    return (
        <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">
                {t.wallet.title}
            </h1>

            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
                        {activeCount} {t.policyStatus.active}
                    </span>
                </div>

                {expiringCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                            {expiringCount} {t.policyStatus.expiringSoon}
                        </span>
                    </div>
                )}

                {actionNeededCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
                        <span className="text-sm font-bold text-red-800 dark:text-red-300">
                            {actionNeededCount} {t.policyStatus.actionNeeded}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
