"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { motion, AnimatePresence } from "framer-motion"

const features = [
    {
        id: "manage",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
        title: {
            en: "Manage Everything",
            el: "Διαχείριση των Πάντων"
        },
        description: {
            en: "All your policies in one place. No more lost documents.",
            el: "Όλα τα συμβόλαιά σας σε ένα μέρος. Ποτέ ξανά χαμένα έγγραφα."
        },
        color: "bg-teal-600"
    },
    {
        id: "analyze",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
        ),
        title: {
            en: "Smart Analysis",
            el: "Έξυπνη Ανάλυση"
        },
        description: {
            en: "AI-powered insights to help you understand your coverage gap.",
            el: "AI αναλύσεις για να κατανοήσετε τα κενά στην κάλυψή σας."
        },
        color: "bg-amber-500"
    },
    {
        id: "claim",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: {
            en: "One-Tap Claim",
            el: "Αποζημίωση με ένα Κλικ"
        },
        description: {
            en: "File claims instantly with your pre-stored data.",
            el: "Υποβολή αιτημάτων άμεσα με τα αποθηκευμένα δεδομένα σας."
        },
        color: "bg-rose-500"
    }
]

export function HeroCarousel() {
    const { language } = useLanguage()
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % features.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative w-full max-w-4xl mx-auto h-[400px] flex items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-100 dark:bg-stone-800 dark:border-stone-700">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                >
                    <div className={`w-24 h-24 rounded-3xl ${features[currentIndex].color} flex items-center justify-center text-white shadow-xl mb-8 transform rotate-3`}>
                        {features[currentIndex].icon}
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-white mb-4">
                        {features[currentIndex].title[language]}
                    </h2>

                    <p className="text-xl text-stone-500 dark:text-stone-400 max-w-lg font-medium">
                        {features[currentIndex].description[language]}
                    </p>
                </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-6 flex gap-2">
                {features.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? "w-8 bg-stone-900 dark:bg-white"
                                : "bg-stone-300 dark:bg-stone-600"
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
