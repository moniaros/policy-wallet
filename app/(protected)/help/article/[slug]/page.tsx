"use client"

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Tag, Share2, Printer, ThumbsUp, ThumbsDown } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ArticlePage() {
    const params = useParams()
    const router = useRouter()
    const { language, t } = useLanguage()
    const slug = params.slug as string

    // Get article based on language and slug
    // Fallback to English if not found in current language, or show 404 content
    const article = helpArticles[language]?.[slug] || helpArticles['en']?.[slug]

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
                <Button onClick={() => router.push('/help')}>Return to Help Center</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/50 dark:bg-transparent pb-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push('/help')}
                    className="mb-8 hover:bg-stone-100 dark:hover:bg-stone-800 -ml-4 text-stone-600 dark:text-stone-400"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.common.back}
                </Button>

                {/* Article Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-widest rounded-full">
                            {article.category}
                        </span>
                        <div className="flex items-center text-stone-400 text-xs font-medium uppercase tracking-widest">
                            <Clock className="w-3 h-3 mr-1" />
                            {article.readTime}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tight mb-6 leading-tight">
                        {article.title}
                    </h1>

                    <p className="text-xl text-stone-500 dark:text-stone-400 font-medium leading-relaxed border-l-4 border-teal-500 pl-6">
                        {article.subtitle}
                    </p>
                </motion.div>

                {/* Article Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-stone-900 rounded-[40px] p-8 md:p-12 shadow-sm border border-stone-100 dark:border-stone-800">
                            {article.sections.map((section, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="mb-12 last:mb-0"
                                >
                                    {section.heading && (
                                        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4 tracking-tight">
                                            {section.heading}
                                        </h2>
                                    )}

                                    <p className="text-stone-600 dark:text-stone-300 text-lg leading-relaxed mb-6">
                                        {section.text}
                                    </p>

                                    {section.list && (
                                        <ul className="space-y-3 mb-6 bg-stone-50 dark:bg-stone-800/50 p-6 rounded-3xl">
                                            {section.list.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-stone-600 dark:text-stone-300">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 shrink-0" />
                                                    <span className="leading-relaxed">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {section.note && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-6 rounded-3xl">
                                            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                                                {section.note}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Feedback Section */}
                        <div className="mt-12 flex items-center justify-between p-8 bg-stone-100 dark:bg-stone-900/50 rounded-3xl">
                            <span className="text-stone-500 font-medium">Was this article helpful?</span>
                            <div className="flex gap-4">
                                <Button variant="outline" size="sm" className="rounded-xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                                    <ThumbsUp className="w-4 h-4 mr-2" /> Yes
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                                    <ThumbsDown className="w-4 h-4 mr-2" /> No
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-stone-900 rounded-[32px] p-6 border border-stone-100 dark:border-stone-800 sticky top-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-6">Actions</h3>
                            <div className="space-y-4">
                                <Button variant="outline" className="w-full justify-start rounded-xl h-12 font-medium border-stone-200 dark:border-stone-800 hover:bg-stone-50" onClick={() => { }}>
                                    <Share2 className="w-4 h-4 mr-3" /> Share Article
                                </Button>
                                <Button variant="outline" className="w-full justify-start rounded-xl h-12 font-medium border-stone-200 dark:border-stone-800 hover:bg-stone-50" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-3" /> Print Guide
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-stone-100 dark:border-stone-800">
                                <h3 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-4">Need personalized help?</h3>
                                <p className="text-sm text-stone-500 mb-4">Our expert agents can guide you through this process.</p>
                                <Button className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">
                                    Contact Support
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
