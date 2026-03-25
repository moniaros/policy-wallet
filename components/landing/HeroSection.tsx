"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Play, Shield, X, Upload, Sparkles, BarChart3, Users, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { TrustBadges } from "./TrustBadges"

interface HeroSectionProps {
    t: {
        badge: string
        title: string
        titleHighlight: string
        subtitle: string
        ctaPrimary: string
        ctaSecondary: string
        trustedBy: string
    }
}

export function HeroSection({ t }: HeroSectionProps) {
    const [showDemo, setShowDemo] = useState(false)
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50">
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-full shadow-sm mb-8"
                    >
                        <span className="text-sm font-medium text-indigo-600">{t.badge}</span>
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
                    >
                        {t.title}
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto mb-12"
                    >
                        {t.subtitle}
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                    >
                        {/* Primary CTA */}
                        <Link
                            href="/auth/signup"
                            className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                        >
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                            <span className="relative flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                {t.ctaPrimary}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>

                        {/* Secondary CTA */}
                        <button
                            type="button"
                            onClick={() => setShowDemo(true)}
                            className="group px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 flex items-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            {t.ctaSecondary}
                        </button>
                    </motion.div>

                    {/* Trusted By */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <p className="text-sm text-slate-500">{t.trustedBy}</p>
                        <TrustBadges />
                    </motion.div>

                    {/* Hero Image/Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="mt-20"
                    >
                        <div className="relative max-w-5xl mx-auto">
                            {/* Glass Card Container */}
                            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl p-2 sm:p-4">
                                {/* Dashboard Mockup */}
                                <div className="relative aspect-video bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden p-4 sm:p-6">
                                    {/* Mock Dashboard Grid */}
                                    <div className="grid grid-cols-3 gap-3 sm:gap-4 h-full">
                                        {/* KPI Cards Row */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200/50 flex flex-col justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                    <Shield className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-medium text-slate-500">Active Policies</span>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">7</p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200/50 flex flex-col justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-medium text-slate-500">Coverage</span>
                                            </div>
                                            <div className="flex items-end gap-1">
                                                <p className="text-xl sm:text-2xl font-bold text-emerald-600">87%</p>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200/50 flex flex-col justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4 text-violet-600" />
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-medium text-slate-500">AI Insights</span>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">3</p>
                                        </div>

                                        {/* Main Content Area */}
                                        <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200/50">
                                            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2">Renewal Timeline</p>
                                            <div className="space-y-2">
                                                {[
                                                    { name: "Motor", days: 12, color: "bg-red-500" },
                                                    { name: "Home", days: 45, color: "bg-amber-500" },
                                                    { name: "Health", days: 89, color: "bg-emerald-500" },
                                                ].map((r) => (
                                                    <div key={r.name} className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-6 ${r.color} rounded-full`} />
                                                        <span className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 flex-1">{r.name}</span>
                                                        <span className="text-[10px] sm:text-xs font-medium text-slate-500">{r.days}d</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Savings Card */}
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 shadow-sm flex flex-col justify-between text-white">
                                            <p className="text-[10px] sm:text-xs font-medium text-emerald-100">Savings Found</p>
                                            <p className="text-lg sm:text-xl font-bold">€450<span className="text-xs font-normal text-emerald-200">/yr</span></p>
                                        </div>
                                    </div>

                                    {/* Floating AI Analysis Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1, duration: 0.5 }}
                                        className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2.5 sm:p-3 border border-emerald-200"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">AI Analysis Complete</p>
                                                <p className="text-[10px] text-slate-500">3 gaps identified</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/20 to-transparent rounded-3xl blur-3xl -z-10" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span className="text-xs">Scroll</span>
                    <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex items-start justify-center p-2">
                        <motion.div
                            animate={{ y: [0, 12, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Demo Modal */}
            <AnimatePresence>
                {showDemo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDemo(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">How PolicyWallet Works</h2>
                                <button type="button" onClick={() => setShowDemo(false)} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {[
                                    { icon: Upload, color: "bg-indigo-100 text-indigo-600", title: "1. Upload Your Policies", desc: "Take a photo or upload a PDF of any insurance policy. Our AI reads it instantly." },
                                    { icon: Sparkles, color: "bg-violet-100 text-violet-600", title: "2. AI Analyzes Coverage", desc: "Our AI extracts key details, detects coverage gaps, and finds savings opportunities." },
                                    { icon: BarChart3, color: "bg-emerald-100 text-emerald-600", title: "3. Track & Optimize", desc: "Monitor all policies in one dashboard. Get renewal alerts and coverage insights." },
                                    { icon: Users, color: "bg-teal-100 text-teal-600", title: "4. Connect With Your Agent", desc: "Collaborate with your insurance advisor directly through the app." },
                                ].map((step, i) => (
                                    <motion.div
                                        key={step.title}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.15 }}
                                        className="flex items-start gap-4"
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0`}>
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{step.title}</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">{step.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100">
                                <Link
                                    href="/auth/signup"
                                    className="block w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                                >
                                    Get Started Free <ArrowRight className="w-5 h-5 inline ml-1" />
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

interface StatsBarProps {
    t: {
        policies: string
        savings: string
        users: string
    }
}

export function StatsBar({ t }: StatsBarProps) {
    return (
        <section className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="text-4xl font-bold mb-2">{t.policies}</div>
                        <div className="text-indigo-200">Managed β διαχείριση</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <div className="text-4xl font-bold mb-2">{t.savings}</div>
                        <div className="text-indigo-200">Total Savings / Συνολικές Εξοικονομήσεις</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="text-4xl font-bold mb-2">{t.users}</div>
                        <div className="text-indigo-200">Happy Users / Ευχαριστημένοι Χρήστες</div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
