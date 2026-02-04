"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PricingCard } from '@/components/pricing/PricingCard'
import { FeatureComparison } from '@/components/pricing/FeatureComparison'
import { PricingFAQ } from '@/components/pricing/PricingFAQ'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { Shield, Lock, CreditCard } from 'lucide-react'

export default function PricingPage() {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const { language, setLanguage } = useLanguage()
    const copy = subscriptionCopy
    const supabase = createClient()

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const handleSelectPlan = async (tier: 'free' | 'essential' | 'professional') => {
        if (!session) {
            // Redirect to signup with plan parameter
            router.push(`/auth/signup?plan=${tier}`)
            return
        }

        if (tier === 'free') {
            // Already on free plan or downgrading
            router.push('/account')
            return
        }

        if (tier === 'essential' || tier === 'professional') {
            // Redirect to checkout
            try {
                const response = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tier }),
                })
                const data = await response.json()
                if (data.url) {
                    window.location.href = data.url
                }
            } catch (error) {
                console.error('Failed to create checkout session:', error)
            }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/">
                            <PolicyWalletLogo size="sm" language={language} />
                        </Link>

                        <nav className="flex items-center gap-4">
                            {/* Language Toggle */}
                            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setLanguage('el')}
                                    className={`px-3 py-1.5 text-sm font-bold rounded transition-all ${language === 'el'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    ΕΛ
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1.5 text-sm font-bold rounded transition-all ${language === 'en'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    EN
                                </button>
                            </div>

                            <ThemeToggle />

                            {session ? (
                                <Link
                                    href="/wallet"
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    {language === 'el' ? 'Πίνακας Ελέγχου' : 'Dashboard'}
                                </Link>
                            ) : (
                                <Link
                                    href="/auth/signin"
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    {language === 'el' ? 'Σύνδεση' : 'Sign In'}
                                </Link>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
                        {copy.headings.pricing.title[language]}
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto">
                        {copy.headings.pricing.subtitle[language]}
                    </p>

                    {/* Trust Signals */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400 mb-12">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>{copy.trust.secure[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>{copy.trust.noHiddenFees[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>{copy.trust.cancelAnytime[language]}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <PricingCard
                            tier="free"
                            language={language}
                            onSelectPlan={handleSelectPlan}
                        />
                        <PricingCard
                            tier="essential"
                            language={language}
                            isHighlighted={true}
                            onSelectPlan={handleSelectPlan}
                        />
                        <PricingCard
                            tier="professional"
                            language={language}
                            onSelectPlan={handleSelectPlan}
                        />
                    </div>
                </div>
            </section>

            {/* Feature Comparison */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-12 text-center">
                        {copy.headings.comparison.title[language]}
                    </h2>
                    <FeatureComparison language={language} />
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-12 text-center">
                        {copy.headings.faq.title[language]}
                    </h2>
                    <PricingFAQ language={language} />
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-black mb-4">
                        {language === 'el'
                            ? 'Ξεκινήστε Σήμερα'
                            : 'Get Started Today'}
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        {language === 'el'
                            ? 'Δοκιμάστε δωρεάν και αναβαθμίστε όποτε χρειάζεστε περισσότερα'
                            : 'Try free and upgrade when you need more'}
                    </p>
                    <button
                        onClick={() => handleSelectPlan('free')}
                        className="px-8 py-4 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {copy.cta.getStarted[language]}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <PolicyWalletLogo size="md" language={language} variant="light" className="mb-4 mx-auto" />
                    <p className="text-slate-400 text-sm">
                        © 2024 PolicyWallet. {language === 'el' ? 'Με επιφύλαξη παντός δικαιώματος.' : 'All rights reserved.'}
                    </p>
                </div>
            </footer>
        </div>
    )
}
