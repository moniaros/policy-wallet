"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { motion } from "framer-motion"
import { CarIcon, DocumentIcon, HeartIcon, HomeIcon, PlaneIcon } from "@/components/icons/PolicyIcons"

interface EmptyStateProps {
    onAddManually?: () => void
    onUploadDocument?: () => void
    viaAgentInvite?: boolean
}

export function EmptyState({ onAddManually }: EmptyStateProps) {
    const { language } = useLanguage()

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-lg w-full"
            >
                <p className="text-lg text-black/60 dark:text-white/70 mb-12 font-medium">
                    {language === 'el'
                        ? 'Ξεκινήστε προσθέτοντας το πρώτο σας ασφαλιστήριο συμβόλαιο.'
                        : 'Get started by adding your first insurance policy.'}
                </p>

                <div className="relative mx-auto w-fit mb-12">
                    <div className="absolute inset-0 bg-[#1FDC86] blur-3xl opacity-20 dark:opacity-35 animate-pulse" />
                    <button
                        onClick={onAddManually}
                        className="group relative w-32 h-32 rounded-[2.5rem] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-2xl shadow-black/40 dark:shadow-white/10 transition-all duration-500 hover:scale-110 active:scale-95"
                    >
                        <div className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-black/25 dark:border-white/25 scale-110 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700" />
                        <svg className="w-14 h-14 relative z-10 font-bold group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-xs font-black text-black dark:text-white uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-2 duration-1000">
                            {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Tap to Start'}
                        </p>
                    </div>
                </div>

                <div className="mt-20 pt-10 border-t border-black/10 dark:border-white/15">
                    <p className="text-[10px] font-black text-black/45 dark:text-white/55 uppercase tracking-widest mb-6">Supported Categories</p>
                    <div className="flex flex-wrap justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                        {[CarIcon, HeartIcon, HomeIcon, DocumentIcon, PlaneIcon].map((Icon, i) => (
                            <div key={i} className="w-8 h-8 text-black/70 dark:text-white/70 hover:scale-125 transition-transform">
                                <Icon className="w-8 h-8" />
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
