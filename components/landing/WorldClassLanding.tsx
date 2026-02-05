"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { honestCopy } from '@/lib/honest-copy'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
    Shield,
    Brain,
    Bell,
    BarChart3,
    Wallet,
    Share2,
    Lock,
    Code,
    Heart,
    ArrowRight,
    CheckCircle2,
    Sparkles
} from 'lucide-react'

export function WorldClassLanding() {
    const { language, setLanguage } = useLanguage()
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const copy = honestCopy
    const lang = language

    const featureIcons = {
        brain: Brain,
        shield: Shield,
        bell: Bell,
        chart: BarChart3,
        wallet: Wallet,
        share: Share2
    }

    const handleEarlyAccess = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        // In production, this would call an API
        setTimeout(() => setSubmitted(false), 3000)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <PolicyWalletLogo size="sm" language={lang} />

                        <nav className="flex items-center gap-4">
                            {/* Language Toggle */}
                            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setLanguage('el')}
                                    className={`px-3 py-1.5 text-sm font-bold rounded transition-all ${lang === 'el'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    ΕΛ
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1.5 text-sm font-bold rounded transition-all ${lang === 'en'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    EN
                                </button>
                            </div>

                            <ThemeToggle />

                            <Link
                                href="/auth/signin"
                                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                                {lang === 'el' ? 'Σύνδεση' : 'Sign In'}
                            </Link>

                            <Link
                                href="/auth/signup"
                                className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                            >
                                {lang === 'el' ? 'Εγγραφή' : 'Get Started'}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Beta Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                            <Sparkles className="w-4 h-4" />
                            {copy.hero.badge[lang]}
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-tight animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                            {copy.hero.title[lang]}
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-4 leading-relaxed animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
                            {copy.brand.subtitle[lang]}
                        </p>

                        <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-200 mb-10 leading-relaxed animate-in fade-in slide-in-from-top-10 duration-700 delay-300">
                            {copy.hero.subtitle[lang]}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                            <a
                                href="#early-access"
                                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-200 flex items-center justify-center gap-2 group"
                            >
                                {copy.hero.cta.primary[lang]}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <a
                                href="#how-it-works"
                                className="px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 transition-all duration-200"
                            >
                                {copy.hero.cta.secondary[lang]}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                            {copy.howItWorks.title[lang]}
                        </h2>
                        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                            {copy.value.title[lang]}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {copy.howItWorks.steps.map((step, idx) => (
                            <div
                                key={idx}
                                className="relative p-8 bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group"
                            >
                                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                    {step.number}
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                        {step.title[lang]}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {step.description[lang]}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                            {copy.features.title[lang]}
                        </h2>
                        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                            {copy.features.subtitle[lang]}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {copy.features.items.map((feature, idx) => {
                            const Icon = featureIcons[feature.icon as keyof typeof featureIcons]
                            return (
                                <div
                                    key={idx}
                                    className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl transition-all duration-300 group"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                        {feature.title[lang]}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {feature.description[lang]}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Early Access CTA */}
            <section id="early-access" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {copy.earlyAccess.title[lang]}
                        </h2>
                        <p className="text-xl text-emerald-100 mb-8">
                            {copy.earlyAccess.subtitle[lang]}
                        </p>

                        {/* Benefits */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
                            {copy.earlyAccess.benefits.items.map((benefit, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">{benefit[lang]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleEarlyAccess} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
                        <div className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={copy.earlyAccess.form.email[lang]}
                                required
                                className="w-full px-6 py-4 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-xl border-2 border-transparent focus:border-emerald-400 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={submitted}
                                className="w-full px-6 py-4 bg-white hover:bg-emerald-50 text-emerald-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                            >
                                {submitted
                                    ? (lang === 'el' ? '✓ Επιτυχής Εγγραφή!' : '✓ Successfully Registered!')
                                    : copy.earlyAccess.form.submit[lang]
                                }
                            </button>
                        </div>
                        <p className="text-xs text-emerald-100 mt-4 text-center">
                            {copy.earlyAccess.form.consent[lang]}
                        </p>
                    </form>
                </div>
            </section>

            {/* Trust Signals */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-12 text-center">
                        {copy.trust.title[lang]}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {copy.trust.items.map((item, idx) => {
                            const icons = { lock: Lock, code: Code, heart: Heart }
                            const Icon = icons[item.icon as keyof typeof icons]
                            return (
                                <div key={idx} className="text-center p-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                        {item.title[lang]}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        {item.description[lang]}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <PolicyWalletLogo size="md" language={lang} variant="light" className="mb-4" />
                            <p className="text-slate-400 mb-4">
                                {copy.footer.tagline[lang]}
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">{copy.footer.contact.title[lang]}</h4>
                            <p className="text-slate-400 text-sm mb-2">{copy.footer.contact.address[lang]}</p>
                            <p className="text-slate-400 text-sm">{copy.footer.contact.email}</p>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">{lang === 'el' ? 'Νομικά' : 'Legal'}</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><Link href="/privacy" className="hover:text-white transition-colors">{copy.footer.legal.privacy[lang]}</Link></li>
                                <li><Link href="/terms" className="hover:text-white transition-colors">{copy.footer.legal.terms[lang]}</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
                        {copy.footer.copyright[lang]}
                    </div>
                </div>
            </footer>
        </div>
    )
}
