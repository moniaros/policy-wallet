"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface AISectionProps {
    t: {
        badge: string
        title: string
        titleHighlight: string
        subtitle: string
        features: Array<{
            title: string
            description: string
            icon: LucideIcon
            color: string
        }>
    }
}

export function AISection({ t }: AISectionProps) {
    return (
        <section className="relative py-20 bg-gradient-to-br from-slate-50 to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6"
                    >
                        <span className="text-sm font-semibold text-purple-700">{t.badge}</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
                    >
                        {t.title}{" "}
                        <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-600 max-w-3xl mx-auto"
                    >
                        {t.subtitle}
                    </motion.p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {t.features.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * index }}
                                className="group relative bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-8 hover:border-purple-300 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                            >
                                {/* Glow Effect on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />

                                {/* Icon */}
                                <div className="relative mb-6">
                                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-slate-900 mb-3 relative">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed relative">
                                    {feature.description}
                                </p>

                                {/* Corner Accent */}
                                <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
