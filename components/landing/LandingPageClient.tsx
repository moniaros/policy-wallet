"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { HeroCarousel } from "./HeroCarousel"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useTheme } from "next-themes"

export function LandingPageClient() {
    const { language, setLanguage } = useLanguage()
    const { theme } = useTheme()

    const copy = {
        title: {
            en: (
                <>
                    Your Insurance, <span className="text-teal-600">Consolidated</span>.
                </>
            ),
            el: (
                <>
                    Η Ασφάλειά σας, <span className="text-teal-600">Συγκεντρωμένη</span>.
                </>
            )
        },
        subtitle: {
            en: "The neutral wallet to manage all your policies in one place. No spam, just clarity.",
            el: "Το ουδέτερο πορτοφόλι για τη διαχείριση όλων των συμβολαίων σας. Χωρίς spam, μόνο διαφάνεια."
        },
        signIn: {
            en: "Sign In",
            el: "Σύνδεση"
        },
        joinPolicyholder: {
            en: "Join as Policyholder",
            el: "Εγγραφή ως Ασφαλισμένος"
        },
        joinAgent: {
            en: "For Agents",
            el: "Για Πράκτορες"
        },
        footer: {
            en: "PolicyWallet. All rights reserved.",
            el: "PolicyWallet. Με επιφύλαξη παντός δικαιώματος."
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
                <div className="font-black text-xl text-teal-700 dark:text-teal-500 tracking-tight flex items-center gap-2">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    PolicyWallet
                </div>

                <nav className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                        <button
                            onClick={() => setLanguage('el')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'el' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-700 dark:text-teal-400' : 'text-stone-500'}`}
                        >
                            GR
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-700 dark:text-teal-400' : 'text-stone-500'}`}
                        >
                            EN
                        </button>
                    </div>

                    <ThemeToggle />

                    <Link href="/auth/signin" className="hidden sm:block font-bold text-sm hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                        {copy.signIn[language]}
                    </Link>

                    <Link href="/auth/signup" className="px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        {copy.joinPolicyholder[language]}
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" />

                <div className="relative z-10 w-full max-w-5xl flex flex-col items-center text-center">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-br from-stone-900 to-stone-600 dark:from-white dark:to-stone-400 leading-tight">
                        {copy.title[language]}
                    </h1>

                    <p className="text-xl md:text-2xl text-stone-600 dark:text-stone-300 max-w-2xl mb-12 font-medium leading-relaxed">
                        {copy.subtitle[language]}
                    </p>

                    {/* Carousel */}
                    <div className="w-full mb-16">
                        <HeroCarousel />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link
                            href="/auth/signup?role=policyholder"
                            className="px-8 py-4 bg-teal-600 text-white rounded-2xl text-lg font-black shadow-xl shadow-teal-600/30 hover:bg-teal-700 hover:shadow-2xl hover:shadow-teal-600/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                        >
                            <span>{copy.joinPolicyholder[language]}</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                        <Link
                            href="/auth/signup?role=agent"
                            className="px-8 py-4 bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 rounded-2xl text-lg font-black shadow-lg hover:bg-stone-50 dark:hover:bg-stone-700 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                        >
                            <span>{copy.joinAgent[language]}</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-stone-400 text-sm font-medium border-t border-stone-200 dark:border-stone-800">
                &copy; {new Date().getFullYear()} {copy.footer[language]}
            </footer>
        </div>
    )
}
