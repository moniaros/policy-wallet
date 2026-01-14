"use client"

import { useLanguage } from "@/contexts/LanguageContext"

interface EmptyStateProps {
    onAddManually?: () => void
    onUploadDocument?: () => void
    viaAgentInvite?: boolean
}

export function EmptyState({ onAddManually, onUploadDocument, viaAgentInvite = false }: EmptyStateProps) {
    const { t } = useLanguage()

    return (
        <div className="max-w-md mx-auto px-4 py-20 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="text-center relative z-10">
                {/* Icon */}
                <div className="relative mx-auto w-24 h-24 bg-stone-50 dark:bg-stone-900 rounded-3xl flex items-center justify-center mb-8 border border-stone-100 dark:border-stone-800 shadow-xl shadow-teal-900/5 group">
                    <svg className="w-10 h-10 text-stone-300 dark:text-stone-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-50/50 to-transparent dark:from-teal-900/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Message */}
                <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-3 tracking-tight">
                    {t.wallet.noPolicies}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 mb-10 leading-relaxed font-medium">
                    {t.wallet.noPoliciesDesc}
                </p>

                {/* CTAs */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={onAddManually}
                        className="w-full px-6 py-4 bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-teal-600/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {t.wallet.addPolicy}
                    </button>
                    {onUploadDocument && (
                        <button
                            onClick={onUploadDocument}
                            className="w-full px-6 py-4 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-900 dark:text-white font-bold rounded-2xl border border-stone-200 dark:border-stone-700 transition-colors"
                        >
                            Upload PDF
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
