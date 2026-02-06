"use client"

import { motion } from "framer-motion"

interface ValueSectionProps {
    t: {
        title: string
        subtitle: string
        forPolicyholders: {
            title: string
            subtitle: string
            features: Array<{
                icon: string
                title: string
                description: string
            }>
        }
        forAgents: {
            title: string
            subtitle: string
            features: Array<{
                icon: string
                title: string
                description: string
            }>
        }
    }
}

export function ValueSection({ t }: ValueSectionProps) {
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

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* For Policyholders */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-indigo-600 mb-2">
                                {t.forPolicyholders.title}
                            </h3>
                            <p className="text-slate-600">
                                {t.forPolicyholders.subtitle}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {t.forPolicyholders.features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 * index }}
                                    className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                                                {feature.title}
                                            </h4>
                                            <p className="text-slate-600 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* For Agents */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-purple-600 mb-2">
                                {t.forAgents.title}
                            </h3>
                            <p className="text-slate-600">
                                {t.forAgents.subtitle}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {t.forAgents.features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 * index }}
                                    className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 hover:border-purple-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                                                {feature.title}
                                            </h4>
                                            <p className="text-slate-600 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
