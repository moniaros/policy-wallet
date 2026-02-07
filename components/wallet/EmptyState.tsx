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

                {/* Big Plus Button with Premium Styling */}
                <div className="relative mx-auto w-fit mb-12">
                    <div className="absolute inset-0 bg-teal-500 blur-3xl opacity-20 dark:opacity-40 animate-pulse" />
                    <button
                        onClick={onAddManually}
                        className="group relative w-32 h-32 rounded-[2.5rem] bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center shadow-2xl shadow-stone-950/40 dark:shadow-white/10 transition-all duration-500 hover:scale-110 active:scale-95 group"
                    >
                        <div className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-stone-400/50 dark:border-stone-500/50 scale-110 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700" />
                        <svg className="w-14 h-14 relative z-10 font-bold group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-2 duration-1000">
                            {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Tap to Start'}
                        </p>
                    </div>
                </div>

                {/* Categories Shortcut */}
                <div className="mt-20 pt-10 border-t border-stone-100 dark:border-stone-800">
                    <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-6">Supported Categories</p>
                    <div className="flex flex-wrap justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                        {['🚗', '❤️', '🏠', '🛡️', '✈️'].map((icon, i) => (
                            <div key={i} className="text-2xl hover:scale-125 transition-transform">{icon}</div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
