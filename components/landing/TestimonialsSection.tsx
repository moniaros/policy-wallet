"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

interface TestimonialsSectionProps {
    t: {
        title: string
        subtitle: string
        items: Array<{
            name: string
            role: string
            avatar: string
            rating: number
            text: string
        }>
    }
}

export function TestimonialsSection({ t }: TestimonialsSectionProps) {
    return (
        <section className="relative py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
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

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {t.items.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 * index }}
                            className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                        >
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                {/* Avatar */}
                                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{testimonial.avatar}</span>
                                </div>

                                {/* Name & Role */}
                                <div>
                                    <h4 className="font-semibold text-slate-900">{testimonial.name}</h4>
                                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>

                            {/* Testimonial Text */}
                            <blockquote className="text-slate-700 leading-relaxed italic">
                                "{testimonial.text}"
                            </blockquote>

                            {/* Quote Mark */}
                            <div className="mt-4 text-6xl text-indigo-100 leading-none">"</div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-12"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-full">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full border-2 border-white" />
                            ))}
                        </div>
                        <span className="text-sm font-medium text-slate-700 ml-2">
                            Trusted by 5,000+ users
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
