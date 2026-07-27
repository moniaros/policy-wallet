"use client"

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Share2, Printer, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { siteConfig } from '@/lib/seo/site'

export default function ArticlePage() {
    const params = useParams()
    const router = useRouter()
    const { t, language } = useLanguage()
    const slug = params.slug as string
    const copy = t.help.article

    // Resolve the article in the active language (fallback to EN).
    const resolved = helpArticles[language]?.[slug] || helpArticles.en?.[slug]

    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

    const recordFeedback = (value: 'up' | 'down') => {
        setFeedback(value)
        toast.success(copy.thanksFeedback)
    }

    async function onShareArticle() {
        const url = typeof window !== 'undefined' ? window.location.href : ''

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: resolved?.title,
                    text: resolved?.subtitle,
                    url,
                })
            } catch (error) {
                // Dismissing the native share sheet rejects with AbortError.
                // Unhandled, that surfaced as a console error on every cancel —
                // a normal user action is not a failure, so it stays silent;
                // anything else falls through to the clipboard path below.
                if ((error as Error)?.name === 'AbortError') return
                if (navigator.clipboard && url) {
                    await navigator.clipboard.writeText(url)
                    toast.success(copy.linkCopied)
                }
            }
            return
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
            try {
                await navigator.clipboard.writeText(url)
                toast.success(copy.linkCopied)
            } catch (error) {
                console.error('[help/article] copy link failed', error)
                toast.error(copy.linkCopyFailed)
            }
        }
    }

    if (!resolved) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4 text-foreground">{copy.notFound}</h1>
                <Button onClick={() => router.push('/help')}>{copy.backToHelp}</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/help')}
                    className="mb-8 hover:bg-muted -ml-4 text-muted-foreground"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.common.back}
                </Button>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint text-xs font-bold uppercase tracking-widest rounded-full">
                            {resolved.category}
                        </span>
                        <div className="flex items-center text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                            <Clock className="w-3 h-3 mr-1" />
                            {resolved.readTime}
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-4 leading-tight">
                        {resolved.title}
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed border-l-4 border-primary pl-6">
                        {resolved.subtitle}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border">
                            {resolved.sections.map((section, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="mb-10 last:mb-0"
                                >
                                    {section.heading && (
                                        <h2 className="text-2xl font-bold text-foreground mb-4 tracking-tight">
                                            {section.heading}
                                        </h2>
                                    )}

                                    <p className="text-foreground text-base md:text-lg leading-relaxed mb-5">
                                        {section.text}
                                    </p>

                                    {section.list && (
                                        <ul className="space-y-3 mb-5 bg-muted p-5 rounded-2xl">
                                            {section.list.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-foreground">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                                                    <span className="leading-relaxed">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {section.note && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl">
                                            <p className="text-amber-900 dark:text-amber-200 text-sm font-medium">{section.note}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card rounded-2xl border border-border">
                            <span className="text-foreground font-medium">{feedback ? copy.thanksFeedback : copy.helpful}</span>
                            {!feedback && (
                                <div className="flex gap-3">
                                    <Button variant="outline" size="sm" onClick={() => recordFeedback('up')} className="rounded-xl border-border bg-card">
                                        <ThumbsUp className="w-4 h-4 mr-2" /> {copy.yes}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => recordFeedback('down')} className="rounded-xl border-border bg-card">
                                        <ThumbsDown className="w-4 h-4 mr-2" /> {copy.no}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-card rounded-3xl p-6 border border-border sticky top-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-5">{copy.actions}</h3>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-border hover:bg-muted"
                                    onClick={onShareArticle}
                                >
                                    <Share2 className="w-4 h-4 mr-3" /> {copy.share}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-border hover:bg-muted"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="w-4 h-4 mr-3" /> {copy.print}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-border hover:bg-muted"
                                    onClick={() => router.push('/wallet')}
                                >
                                    <ArrowRight className="w-4 h-4 mr-3" /> {t.help.openWallet}
                                </Button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border">
                                <h3 className="text-base font-bold text-foreground mb-2">{copy.personalizedHelp}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{copy.supportDescription}</p>
                                <a
                                    href={`mailto:${siteConfig.contactEmail}`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                                >
                                    {copy.contactSupport}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
