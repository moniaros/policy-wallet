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
import { Shield, Lock, CreditCard, Menu, X } from 'lucide-react'
import { trackJourneyEvent } from '@/lib/journey/funnel'

export default function PricingPage() {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const { language, setLanguage } = useLanguage()
    const copy = subscriptionCopy
    const supabase = createClient()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

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

    useEffect(() => {
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        if (params.get("success") === "true") {
            trackJourneyEvent("upgrade_completed", {
                source: "public_pricing_return",
            })
        }
    }, [])

    const handleSelectPlan = async (tier: 'free' | 'plus' | 'pro') => {
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

        if (tier === 'plus' || tier === 'pro') {
            trackJourneyEvent("upgrade_started", {
                tier,
                source: "public_pricing",
            })
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 selection:bg-[#64748B]/20 selection:text-[#0F172A]">
            {/* Header - Floating Pill */}
            <header className="fixed top-4 left-4 right-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full bg-white/80 dark:bg-slate-900/80 px-6 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A] dark:text-white">Policy</span><span className="text-[#64748B] dark:text-slate-400">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 font-medium text-[#475569] dark:text-slate-300 md:flex text-[14px]">
                        <Link href="/product" className="hover:text-[#0F172A] dark:hover:text-white transition-colors">{language === 'el' ? 'Προϊόντα' : 'Products'}</Link>
                        <Link href="/pricing" className="text-[#0F172A] dark:text-white transition-colors">{language === 'el' ? 'Τιμολόγηση' : 'Pricing'}</Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLanguage('el')} className={`text-xs font-semibold transition-colors ${language === 'el' ? 'text-[#0F172A] dark:text-white' : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'}`}>EL</button>
                            <span className="text-[#E2E8F0] dark:text-slate-700">|</span>
                            <button onClick={() => setLanguage('en')} className={`text-xs font-semibold transition-colors ${language === 'en' ? 'text-[#0F172A] dark:text-white' : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'}`}>EN</button>
                        </div>
                        <ThemeToggle />
                        {session ? (
                            <Link href="/wallet" className="font-medium text-[#0F172A] dark:text-white hover:text-[#64748B] transition-colors text-[14px]">
                                {language === 'el' ? 'Πίνακας Ελέγχου' : 'Dashboard'}
                            </Link>
                        ) : (
                            <>
                                <Link href="/auth/signin" className="font-medium text-[#0F172A] dark:text-white hover:text-[#64748B] transition-colors text-[14px]">
                                    {language === 'el' ? 'Σύνδεση' : 'Log in'}
                                </Link>
                                <Link href="/auth/signup" className="rounded-full bg-[#29685B] dark:bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white dark:text-white transition-colors hover:bg-[#1C4E44] dark:hover:bg-[#1C4E44]">
                                    {language === 'el' ? 'Ξεκινήστε' : 'Get started'}
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4 md:hidden">
                        <ThemeToggle />
                        <button className="p-2 -mr-2 text-[#0F172A] dark:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* FULL-SCREEN MOBILE MENU (Arc Style) */}
            <div className={`fixed inset-0 z-[100] bg-[#29685B] dark:bg-[#29685B] backdrop-blur-3xl text-white dark:text-white flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}>
                <div className="flex h-16 items-center justify-between px-6 pt-4 max-w-[1400px] w-full mx-auto">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="text-white">Policy</span><span className="text-white/80">Wallet</span>
                    </Link>
                    <button className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col justify-center px-8 sm:px-12 pb-24 max-w-[1400px] w-full mx-auto">
                    <nav className="flex flex-col gap-6 text-[44px] sm:text-[56px] font-medium tracking-tight mb-12 leading-tight">
                        <Link href="/product" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {language === 'el' ? 'Προϊόντα' : 'Products'}
                        </Link>
                        <Link href="/pricing" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {language === 'el' ? 'Τιμολόγηση' : 'Pricing'}
                        </Link>
                        <div className="flex items-center gap-4 mt-4 text-[18px] font-bold">
                            <button onClick={() => { setLanguage('el'); setIsMobileMenuOpen(false) }} className={`transition-colors text-white ${language === 'el' ? 'opacity-100' : 'opacity-50'}`}>EL</button>
                            <span className="text-white/20">|</span>
                            <button onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false) }} className={`transition-colors text-white ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}>EN</button>
                        </div>
                    </nav>

                    <div className="flex flex-col gap-4 mt-auto">
                        {session ? (
                            <Link href="/wallet" className="w-full rounded-2xl bg-[#1C4E44] border border-transparent px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]" onClick={() => setIsMobileMenuOpen(false)}>
                                {language === 'el' ? 'Πίνακας Ελέγχου' : 'Dashboard'}
                            </Link>
                        ) : (
                            <>
                                <Link href="/auth/signin" className="w-full rounded-2xl bg-[#1C4E44] border border-transparent px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]" onClick={() => setIsMobileMenuOpen(false)}>
                                    {language === 'el' ? 'Σύνδεση' : 'Log in'}
                                </Link>
                                <Link href="/auth/signup" className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-transform active:scale-[0.98] hover:bg-[#2C6E61]" onClick={() => setIsMobileMenuOpen(false)}>
                                    {language === 'el' ? 'Ξεκινήστε' : 'Get started'}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

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
                            tier="plus"
                            language={language}
                            isHighlighted={true}
                            onSelectPlan={handleSelectPlan}
                        />
                        <PricingCard
                            tier="pro"
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
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1A1C1D] text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#29685B]/20 rounded-full blur-3xl" />

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
                        className="inline-flex rounded-[4px] bg-[#89D9B2] px-6 py-3 text-[16px] font-bold text-[#1A1A1A] transition-opacity hover:opacity-90 mt-8"
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
