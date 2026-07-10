"use client"

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Share2, Printer, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ArticlePage() {
    const params = useParams()
    const router = useRouter()
    const { language, t } = useLanguage()
    const slug = params.slug as string

    const article = helpArticles[language]?.[slug] || helpArticles.en?.[slug]

    const copy = {
        notFoundTitle: language === 'el' ? 'Το άρθρο δεν βρέθηκε' : 'Article not found',
        backToHelp: language === 'el' ? 'Επιστροφή στο κέντρο βοήθειας' : 'Return to Help Center',
        helpful: language === 'el' ? 'Ήταν χρήσιμο αυτό το άρθρο;' : 'Was this article helpful?',
        yes: language === 'el' ? 'Ναι' : 'Yes',
        no: language === 'el' ? 'Όχι' : 'No',
        actions: language === 'el' ? 'Ενέργειες' : 'Actions',
        shareArticle: language === 'el' ? 'Κοινοποίηση άρθρου' : 'Share article',
        printGuide: language === 'el' ? 'Εκτύπωση οδηγού' : 'Print guide',
        personalizedHelp: language === 'el' ? 'Θέλεις εξατομικευμένη βοήθεια;' : 'Need personalized help?',
        supportDescription:
            language === 'el'
                ? 'Η ομάδα υποστήριξης μπορεί να σε καθοδηγήσει στο επόμενο βήμα, με βάση το προφίλ και τις καλύψεις σου.'
                : 'Our support team can guide your next step based on your profile and coverage.',
        contactSupport: language === 'el' ? 'Επικοινωνία με υποστήριξη' : 'Contact support',
        openWallet: language === 'el' ? 'Άνοιγμα πορτοφολιού' : 'Open wallet',
        copyLinkSuccess: language === 'el' ? 'Ο σύνδεσμος αντιγράφηκε.' : 'Link copied.',
    }

    async function onShareArticle() {
        const url = typeof window !== 'undefined' ? window.location.href : ''

        if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({
                title: article?.title,
                text: article?.subtitle,
                url,
            })
            return
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
            await navigator.clipboard.writeText(url)
            window.alert(copy.copyLinkSuccess)
        }
    }

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4 text-stone-900 dark:text-white">{copy.notFoundTitle}</h1>
                <Button onClick={() => router.push('/help')}>{copy.backToHelp}</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/help')}
                    className="mb-8 hover:bg-stone-100 dark:hover:bg-stone-800 -ml-4 text-stone-600 dark:text-stone-300"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.common.back}
                </Button>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint text-xs font-bold uppercase tracking-widest rounded-full">
                            {article.category}
                        </span>
                        <div className="flex items-center text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-widest">
                            <Clock className="w-3 h-3 mr-1" />
                            {article.readTime}
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tight mb-4 leading-tight">
                        {article.title}
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-l-4 border-primary pl-6">
                        {article.subtitle}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 md:p-8 shadow-sm border border-stone-200 dark:border-stone-800">
                            {article.sections.map((section, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="mb-10 last:mb-0"
                                >
                                    {section.heading && (
                                        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4 tracking-tight">
                                            {section.heading}
                                        </h2>
                                    )}

                                    <p className="text-stone-700 dark:text-stone-300 text-base md:text-lg leading-relaxed mb-5">
                                        {section.text}
                                    </p>

                                    {section.list && (
                                        <ul className="space-y-3 mb-5 bg-stone-50 dark:bg-stone-800/50 p-5 rounded-2xl">
                                            {section.list.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-stone-700 dark:text-stone-300">
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

                        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                            <span className="text-stone-700 dark:text-stone-300 font-medium">{copy.helpful}</span>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" className="rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800">
                                    <ThumbsUp className="w-4 h-4 mr-2" /> {copy.yes}
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800">
                                    <ThumbsDown className="w-4 h-4 mr-2" /> {copy.no}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 sticky top-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-5">{copy.actions}</h3>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                                    onClick={onShareArticle}
                                >
                                    <Share2 className="w-4 h-4 mr-3" /> {copy.shareArticle}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="w-4 h-4 mr-3" /> {copy.printGuide}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-xl h-11 font-medium border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                                    onClick={() => router.push('/wallet')}
                                >
                                    <ArrowRight className="w-4 h-4 mr-3" /> {copy.openWallet}
                                </Button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
                                <h3 className="text-base font-bold text-stone-900 dark:text-white mb-2">{copy.personalizedHelp}</h3>
                                <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">{copy.supportDescription}</p>
                                <a
                                    href="mailto:support@policywallet.com"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-bold text-sm px-4 py-2.5 transition-colors"
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
