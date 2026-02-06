"use client"

import { motion } from "framer-motion"
import { ArrowRight, MessageCircle } from "lucide-react"
import Link from "next/link"

interface CTASectionProps {
    t: {
        title: string
        titleHighlight: string
        subtitle: string
        ctaPrimary: string
        ctaSecondary: string
        features: string[]
    }
}

export function CTASection({ t }: CTASectionProps) {
    return (
        <section className="relative py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    {/* Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6"
                    >
                        {t.title}{" "}
                        <span className="text-emerald-300">{t.titleHighlight}</span>
                    </motion.h2>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto"
                    >
                        {t.subtitle}
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                    >
                        {/* Primary CTA */}
                        <Link
                            href="/auth/signup"
                            className="group w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:bg-emerald-50 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <span className="flex items-center justify-center gap-2">
                                {t.ctaPrimary}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>

                        {/* Secondary CTA */}
                        <button className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            {t.ctaSecondary}
                        </button>
                    </motion.div>

                    {/* Features List */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto"
                    >
                        {t.features.map((feature, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-center sm:justify-start gap-2 text-white/90"
                            >
                                <svg className="w-5 h-5 text-emerald-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm sm:text-base">{feature}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
