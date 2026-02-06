"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface HowItWorksSectionProps {
    t: {
        title: string
        subtitle: string
        steps: Array<{
            number: string
            title: string
            description: string
            icon: LucideIcon
        }>
    }
}

export function HowItWorksSection({ t }: HowItWorksSectionProps) {
    return (
        <section className="relative py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
                    >
                        {t.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-slate-600 max-w-3xl mx-auto"
                    >
                        {t.subtitle}
                    </motion.p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-emerald-200 -translate-y-1/2" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
                        {t.steps.map((step, index) => {
                            const Icon = step.icon
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 * index }}
                                    className="relative"
                                >
                                    {/* Card */}
                                    <div className="relative bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
                                        {/* Number Badge */}
                                        <div className="absolute -top-6 left-8 lg:left-1/2 lg:-translate-x-1/2">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-lg opacity-50" />
                                                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                                                    <span className="text-white font-bold text-lg">{step.number}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Icon */}
                                        <div className="flex justify-center mb-6 mt-4">
                                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center">
                                                <Icon className="w-10 h-10 text-indigo-600" />
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <h3 className="text-xl font-bold text-slate-900 text-center mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-slate-600 text-center leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Arrow (Mobile) */}
                                    {index < t.steps.length - 1 && (
                                        <div className="md:hidden flex justify-center my-6">
                                            <svg className="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
