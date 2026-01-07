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
        <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>

                {/* Message */}
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                    {t.wallet.noPolicies}
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-8 max-w-md mx-auto">
                    {t.wallet.noPoliciesDesc}
                </p>

                {/* CTAs */}
                <div className="flex justify-center max-w-md mx-auto">
                    <button
                        onClick={onAddManually}
                        className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        {t.wallet.addPolicy}
                    </button>
                </div>
            </div>
        </div>
    )
}
