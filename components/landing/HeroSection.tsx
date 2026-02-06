"use client"

import { motion } from "framer-motion"
import { ArrowRight, Play, Shield } from "lucide-react"
import Link from "next/link"

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
                        <button className="group px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 flex items-center gap-2">
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

                        {/* Trust Badges */}
                        <div className="flex items-center gap-6 opacity-60">
                            {/* You can add actual company logos here */}
                            <div className="h-8 px-6 bg-slate-200 rounded-md flex items-center justify-center">
                                <span className="text-xs font-medium text-slate-500">ETHNIKI</span>
                            </div>
                            <div className="h-8 px-6 bg-slate-200 rounded-md flex items-center justify-center">
                                <span className="text-xs font-medium text-slate-500">INTERAMERICAN</span>
                            </div>
                            <div className="h-8 px-6 bg-slate-200 rounded-md flex items-center justify-center">
                                <span className="text-xs font-medium text-slate-500">NN HELLAS</span>
                            </div>
                        </div>
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
                                {/* Screenshot Placeholder */}
                                <div className="relative aspect-video bg-gradient-to-br from-indigo-100 via-purple-50 to-violet-100 rounded-2xl overflow-hidden">
                                    {/* You can replace this with actual app screenshot */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <Shield className="w-24 h-24 text-indigo-300 mx-auto mb-4" />
                                            <p className="text-slate-400 text-lg">App Dashboard Preview</p>
                                        </div>
                                    </div>

                                    {/* Floating Elements (optional decoration) */}
                                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <span className="text-emerald-600 font-bold">✓</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-700">AI Analysis Complete</p>
                                                <p className="text-xs text-slate-500">3 gaps found</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Potential savings</p>
                                                <p className="text-lg font-bold text-emerald-600">€450/year</p>
                                            </div>
                                        </div>
                                    </div>
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
