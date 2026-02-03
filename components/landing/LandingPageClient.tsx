"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { HeroCarousel } from "./HeroCarousel"
import { ThemeToggle } from "@/components/ThemeToggle"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { copy as professionalCopy } from "@/lib/copy"
import { useTheme } from "next-themes"
import { Shield, Lock, Zap, Users, CheckCircle, Star, ArrowRight, FileText, Brain, Smartphone } from "lucide-react"

export function LandingPageClient() {
    const { language, setLanguage } = useLanguage()
    const { theme } = useTheme()

    const copy = {
        title: {
            en: "Your Insurance, Consolidated",
            el: "Η Ασφάλειά σας, Συγκεντρωμένη"
        },
        subtitle: {
            en: "The neutral wallet to manage all your policies in one place. AI-powered insights, zero spam.",
            el: "Το ουδέτερο πορτοφόλι για τη διαχείριση όλων των συμβολαίων σας. Τεχνητή νοημοσύνη, χωρίς spam."
        },
        signIn: {
            en: "Sign In",
            el: "Σύνδεση"
        },
        joinPolicyholder: {
            en: "Get Started Free",
            el: "Ξεκινήστε Δωρεάν"
        },
        joinAgent: {
            en: "For Agents",
            el: "Για Πράκτορες"
        },
        features: {
            title: {
                en: "Everything You Need to Manage Your Insurance",
                el: "Όλα όσα χρειάζεστε για τη διαχείριση των ασφαλειών σας"
            },
            items: [
                {
                    icon: Shield,
                    title: { en: "Secure & Private", el: "Ασφαλές & Ιδιωτικό" },
                    description: { en: "Bank-level encryption keeps your policies safe and confidential", el: "Κρυπτογράφηση τραπεζικού επιπέδου για την ασφάλεια των δεδομένων σας" }
                },
                {
                    icon: Brain,
                    title: { en: "AI-Powered Analysis", el: "Ανάλυση με AI" },
                    description: { en: "Automatically detect coverage gaps and get personalized recommendations", el: "Αυτόματη ανίχνευση κενών κάλυψης και εξατομικευμένες συστάσεις" }
                },
                {
                    icon: Smartphone,
                    title: { en: "Digital Wallet Ready", el: "Ψηφιακό Πορτοφόλι" },
                    description: { en: "Add policies to Apple Wallet and Google Wallet for instant access", el: "Προσθέστε συμβόλαια στο Apple Wallet και Google Wallet" }
                },
                {
                    icon: FileText,
                    title: { en: "All Policies, One Place", el: "Όλα σε Ένα Μέρος" },
                    description: { en: "Upload and manage policies from any insurer in a single dashboard", el: "Ανεβάστε και διαχειριστείτε συμβόλαια από οποιονδήποτε ασφαλιστή" }
                },
                {
                    icon: Zap,
                    title: { en: "Instant Insights", el: "Άμεσες Πληροφορίες" },
                    description: { en: "Get real-time notifications for renewals and important deadlines", el: "Λάβετε ειδοποιήσεις για ανανεώσεις και σημαντικές προθεσμίες" }
                },
                {
                    icon: Users,
                    title: { en: "Share with Agents", el: "Κοινοποίηση σε Πράκτορες" },
                    description: { en: "Securely share policies with your trusted insurance agents", el: "Μοιραστείτε με ασφάλεια τα συμβόλαιά σας με τους πράκτορές σας" }
                }
            ]
        },
        testimonials: {
            title: {
                en: "Trusted by Thousands of Policyholders",
                el: "Εμπιστεύονται χιλιάδες ασφαλισμένοι"
            },
            items: [
                {
                    name: { en: "Maria K.", el: "Μαρία Κ." },
                    role: { en: "Policyholder", el: "Ασφαλισμένη" },
                    text: { en: "Finally, all my insurance policies in one place. The AI analysis helped me discover I was underinsured for my home!", el: "Επιτέλους, όλα τα ασφαλιστήρια μου σε ένα μέρος. Η ανάλυση AI με βοήθησε να ανακαλύψω ότι ήμουν υποασφαλισμένη!" },
                    rating: 5
                },
                {
                    name: { en: "Nikos P.", el: "Νίκος Π." },
                    role: { en: "Insurance Agent", el: "Ασφαλιστικός Πράκτορας" },
                    text: { en: "PolicyWallet transformed how I work with clients. They can now share their policies instantly, saving hours of back-and-forth.", el: "Το PolicyWallet άλλαξε τον τρόπο που δουλεύω με τους πελάτες. Τώρα μοιράζονται άμεσα τα συμβόλαιά τους." },
                    rating: 5
                },
                {
                    name: { en: "Sophia L.", el: "Σοφία Λ." },
                    role: { en: "Business Owner", el: "Επιχειρηματίας" },
                    text: { en: "Managing 12 different policies was a nightmare. Now I have everything organized and get alerts before renewals. Game changer!", el: "Η διαχείριση 12 διαφορετικών συμβολαίων ήταν εφιάλτης. Τώρα έχω τα πάντα οργανωμένα!" },
                    rating: 5
                }
            ]
        },
        cta: {
            title: {
                en: "Ready to Take Control of Your Insurance?",
                el: "Έτοιμοι να πάρετε τον έλεγχο των ασφαλειών σας;"
            },
            subtitle: {
                en: "Join thousands of users who simplified their insurance management",
                el: "Ενταχθείτε σε χιλιάδες χρήστες που απλοποίησαν τη διαχείριση των ασφαλειών τους"
            },
            button: {
                en: "Start Free Today",
                el: "Ξεκινήστε Δωρεάν Σήμερα"
            }
        },
        stats: {
            items: [
                { value: "10,000+", label: { en: "Active Users", el: "Ενεργοί Χρήστες" } },
                { value: "50,000+", label: { en: "Policies Managed", el: "Συμβόλαια Διαχειρίζονται" } },
                { value: "99.9%", label: { en: "Uptime", el: "Διαθεσιμότητα" } },
                { value: "24/7", label: { en: "Support", el: "Υποστήριξη" } }
            ]
        },
        footer: {
            en: "PolicyWallet. All rights reserved.",
            el: "PolicyWallet. Με επιφύλαξη παντός δικαιώματος."
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="px-6 py-4 flex justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-xl shadow-blue-500/10 transition-all duration-300">
                    <PolicyWalletLogo size="md" language={language} />

                    <nav className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setLanguage('el')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${language === 'el' ? 'bg-white dark:bg-slate-700 shadow-md text-sky-700 dark:text-sky-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                GR
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${language === 'en' ? 'bg-white dark:bg-slate-700 shadow-md text-sky-700 dark:text-sky-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                EN
                            </button>
                        </div>

                        <ThemeToggle />

                        <Link href="/auth/signin" className="hidden md:block font-bold text-sm hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer">
                            {copy.signIn[language]}
                        </Link>

                        <Link href="/auth/signup" className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all cursor-pointer">
                            {copy.joinPolicyholder[language]}
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 pt-32 pb-20 px-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-400/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    {/* Hero Content */}
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-full text-sm font-semibold text-sky-700 dark:text-sky-400 mb-8">
                            <Lock className="w-4 h-4" />
                            <span>Trusted by 10,000+ users worldwide</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-700 via-cyan-600 to-sky-700 dark:from-sky-400 dark:via-cyan-400 dark:to-sky-400">
                                {copy.title[language]}
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                            {copy.subtitle[language]}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                            <Link
                                href="/auth/signup?role=policyholder"
                                className="group px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-lg font-black shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>{copy.joinPolicyholder[language]}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                            </Link>
                            <Link
                                href="/auth/signup?role=agent"
                                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-black shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>{copy.joinAgent[language]}</span>
                            </Link>
                        </div>

                        {/* Carousel */}
                        <div className="w-full max-w-5xl mx-auto">
                            <HeroCarousel />
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-32">
                        {copy.stats.items.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-sky-600 to-cyan-600 dark:from-sky-400 dark:to-cyan-400 mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm md:text-base font-semibold text-slate-600 dark:text-slate-400">
                                    {stat.label[language]}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Features Section */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                                {copy.features.title[language]}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {copy.features.items.map((feature, index) => {
                                const Icon = feature.icon
                                return (
                                    <div
                                        key={index}
                                        className="group p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
                                            <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                            {feature.title[language]}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {feature.description[language]}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Testimonials Section */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                                {copy.testimonials.title[language]}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {copy.testimonials.items.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer"
                                >
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed italic">
                                        "{testimonial.text[language]}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {testimonial.name[language].charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {testimonial.name[language]}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                                {testimonial.role[language]}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Final CTA Section */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-cyan-600 rounded-3xl blur-xl opacity-20" />
                        <div className="relative p-12 md:p-16 bg-gradient-to-r from-sky-600 to-cyan-600 rounded-3xl shadow-2xl text-center text-white">
                            <h2 className="text-4xl md:text-5xl font-black mb-6">
                                {copy.cta.title[language]}
                            </h2>
                            <p className="text-xl md:text-2xl mb-8 text-sky-100 max-w-2xl mx-auto">
                                {copy.cta.subtitle[language]}
                            </p>
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-sky-700 rounded-2xl text-xl font-black shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all cursor-pointer"
                            >
                                <span>{copy.cta.button[language]}</span>
                                <ArrowRight className="w-6 h-6" strokeWidth={3} />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm font-medium border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            <span className="font-bold text-slate-900 dark:text-white">PolicyWallet</span>
                        </div>
                        <div className="flex gap-6">
                            <Link href="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer">
                                {language === 'en' ? 'Privacy' : 'Απόρρητο'}
                            </Link>
                            <Link href="/terms" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer">
                                {language === 'en' ? 'Terms' : 'Όροι'}
                            </Link>
                        </div>
                        <div>
                            &copy; {new Date().getFullYear()} {copy.footer[language]}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
