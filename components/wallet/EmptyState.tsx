"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { motion } from "framer-motion"

interface EmptyStateProps {
    onAddManually?: () => void
    onUploadDocument?: () => void
    viaAgentInvite?: boolean
    userName?: string
}

export function EmptyState({ onAddManually, userName }: EmptyStateProps) {
    const { t, language } = useLanguage()

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-lg w-full"
            >
                {/* Lobby Welcome */}
                <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white mb-6 tracking-tight leading-tight">
                    {language === 'el' ? 'Καλώς ορίσατε' : 'Welcome'}, <br />
                    <span className="text-teal-600 dark:text-teal-400">
                        {userName || (language === 'el' ? 'στο PolicyWallet' : 'to PolicyWallet')}
                    </span>
                </h1>

                <p className="text-lg text-stone-500 dark:text-stone-400 mb-12 font-medium">
                    {language === 'el'
                        ? 'Ξεκινήστε προσθέτοντας το πρώτο σας ασφαλιστήριο συμβόλαιο.'
                        : 'Get started by adding your first insurance policy.'}
                </p>

                {/* Big Plus Button */}
                <button
                    onClick={onAddManually}
                    className="group relative w-24 h-24 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-xl shadow-teal-600/30 transition-all duration-300 hover:scale-110 active:scale-95 mx-auto mb-8"
                >
                    <div className="absolute inset-0 rounded-full bg-teal-600/30 animate-ping opacity-75 group-hover:opacity-100" />
                    <svg className="w-10 h-10 relative z-10 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <p className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest animate-pulse">
                    {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Add Policy'}
                </p>

                {/* Optional Decorative Elements */}
                <div className="mt-16 grid grid-cols-3 gap-4 opacity-30 pointer-events-none grayscale">
                    <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse delay-75" />
                    <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse delay-150" />
                    <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse delay-300" />
                </div>
            </motion.div>
        </div>
    )
}
