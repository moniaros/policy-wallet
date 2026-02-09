"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import {
    Mail,
    MessageCircle,
    FileText,
    ExternalLink,
    Search,
    ChevronRight,
    BookOpen,
    ShieldCheck,
    CreditCard,
    Smartphone,
    Zap,
    Users,
    ArrowRight,
    Star,
    Sparkles,
    PlayCircle,
    X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HelpPage() {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const kbCategories = [
        { id: 'gettingStarted', icon: Zap, label: t.help.categories.gettingStarted, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { id: 'policyManagement', icon: BookOpen, label: t.help.categories.policyManagement, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'accountSecure', icon: ShieldCheck, label: t.help.categories.accountSecure, color: 'text-teal-500', bg: 'bg-teal-500/10' },
        { id: 'billing', icon: CreditCard, label: t.help.categories.billing, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { id: 'mobileApp', icon: Smartphone, label: t.help.categories.mobileApp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { id: 'sharing', icon: Users, label: t.help.articles.sharingAccess, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ]

    // Consolidate articles for filtering
    const articles = Object.entries(helpArticles[language] || helpArticles['en']).map(([id, article]) => ({
        id,
        title: article.title,
        subtitle: article.subtitle,
        category: article.category
    }))

    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory ? article.category === selectedCategory : true
        return matchesSearch && matchesCategory
    })

    const featuredGuides = [
        {
            id: 'upload-policy',
            title: t.help.articles.uploadPolicy,
            duration: '4 min',
            tag: 'Essential',
            icon: PlayCircle,
            desc: 'Step-by-step walkthrough of adding your first digital asset.'
        },
        {
            id: 'sharing-access',
            title: t.help.articles.sharingAccess,
            duration: '2 min',
            tag: 'Collaboration',
            icon: Users,
            desc: 'How to securely grant access to family members or agents.'
        },
        {
            id: 'premium-features',
            title: t.help.articles.premiumFeatures,
            duration: '5 min',
            tag: 'Max Value',
            icon: Sparkles,
            desc: 'Unlock the full power of AI-driven insurance intelligence.'
        }
    ]

    return (
        <div className="min-h-screen bg-stone-50/50 dark:bg-transparent pb-32">
            <PageHeader
                title={t.help.pageTitle}
                subtitle={t.help.pageSubtitle}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {/* Search - Liquid Glass Style */}
                <div className="relative mb-16 max-w-3xl mx-auto">
                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl -z-10 rounded-full" />
                    <div className="relative flex items-center">
                        <div className="absolute left-6 text-stone-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            placeholder={t.help.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[32px] shadow-2xl shadow-stone-200/50 dark:shadow-none text-xl font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 transition-all outline-none"
                        />
                        <div className="absolute right-4 text-white">
                            <Button className="rounded-2xl px-8 h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold tracking-tight">
                                {t.help.search}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Categories Grid - Dynamic Interaction */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-20 text-white">
                    {kbCategories.map((cat, idx) => {
                        const isSelected = selectedCategory === cat.label
                        return (
                            <motion.button
                                key={cat.id}
                                onClick={() => setSelectedCategory(isSelected ? null : cat.label)}
                                whileHover={{ y: -8, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex flex-col items-center gap-5 p-8 rounded-[40px] border shadow-sm hover:shadow-xl hover:shadow-teal-500/5 transition-all group relative overflow-hidden ${isSelected
                                        ? 'bg-stone-900 dark:bg-white border-stone-900 dark:border-white'
                                        : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-3xl ${cat.bg} flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform duration-500`}>
                                    <cat.icon className="w-8 h-8" />
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-[0.1em] text-center leading-tight transition-colors ${isSelected ? 'text-white dark:text-stone-900' : 'text-stone-900 dark:text-stone-300'
                                    }`}>
                                    {cat.label}
                                </span>
                                {isSelected && (
                                    <motion.div
                                        layoutId="activeCategory"
                                        className="absolute inset-0 border-2 border-teal-500 rounded-[40px]"
                                    />
                                )}
                            </motion.button>
                        )
                    })}
                </div>

                {/* Show different content based on whether searching/filtering or not */}
                {searchQuery || selectedCategory ? (
                    <div className="min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                                {selectedCategory ? `${selectedCategory} Articles` : 'Search Results'}
                            </h2>
                            {(selectedCategory || searchQuery) && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedCategory(null)
                                        setSearchQuery('')
                                    }}
                                    className="text-stone-400 hover:text-stone-900 dark:hover:text-white"
                                >
                                    <X className="w-4 h-4 mr-2" /> Clear Filters
                                </Button>
                            )}
                        </div>

                        {filteredArticles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredArticles.map((article, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => router.push(`/help/article/${article.id}`)}
                                        className="flex flex-col p-8 bg-white dark:bg-stone-900 rounded-[32px] group cursor-pointer border border-transparent hover:border-teal-500/30 transition-all shadow-sm h-full"
                                    >
                                        <div className="mb-4">
                                            <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                                {article.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-3 group-hover:text-teal-600 transition-colors">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                                            {article.subtitle}
                                        </p>
                                        <div className="mt-auto pt-6 flex items-center text-teal-600 font-bold text-sm">
                                            Read Article <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-stone-400 font-medium text-lg">No articles found matching your criteria.</p>
                                <Button
                                    variant="link"
                                    className="text-teal-600"
                                    onClick={() => {
                                        setSelectedCategory(null)
                                        setSearchQuery('')
                                    }}
                                >
                                    View all articles
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Featured Tutorials - Visual Excellence */}
                        <div className="lg:col-span-8 space-y-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                                        {t.help.featuredGuides}
                                    </h2>
                                </div>
                                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-teal-600 flex items-center gap-2">
                                    {t.help.browseLibrary} <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {featuredGuides.map((guide, idx) => (
                                    <Card
                                        key={idx}
                                        onClick={() => router.push(`/help/article/${guide.id}`)}
                                        className={`group overflow-hidden border-none rounded-[48px] bg-white dark:bg-stone-900 shadow-xl shadow-stone-200/40 dark:shadow-none hover:shadow-2xl transition-all duration-500 cursor-pointer ${idx === 0 ? 'md:col-span-2' : ''}`}
                                    >
                                        <CardContent className="p-0">
                                            <div className={`relative ${idx === 0 ? 'flex flex-col md:flex-row' : ''}`}>
                                                <div className={`${idx === 0 ? 'md:w-1/2 aspect-video md:aspect-auto' : 'aspect-video'} bg-stone-100 dark:bg-stone-800 relative overflow-hidden`}>
                                                    {/* Mini Thumbnail Placeholder with Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-stone-200 dark:to-stone-700 active:scale-105 transition-transform duration-1000" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:scale-125 transition-all duration-500">
                                                            <guide.icon className="w-8 h-8" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`p-10 ${idx === 0 ? 'md:w-1/2' : ''}`}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                            {guide.tag}
                                                        </span>
                                                        <span className="text-stone-400 dark:text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                                                            {guide.duration}
                                                        </span>
                                                    </div>
                                                    <h3 className={`font-black text-stone-900 dark:text-white tracking-tight leading-tight mb-4 group-hover:text-teal-600 transition-colors ${idx === 0 ? 'text-3xl' : 'text-xl'}`}>
                                                        {guide.title}
                                                    </h3>
                                                    <p className="text-stone-500 dark:text-stone-400 font-medium text-sm leading-relaxed mb-8">
                                                        {guide.desc}
                                                    </p>
                                                    <Button variant="outline" className="rounded-2xl h-12 px-6 border-stone-200 dark:border-stone-800 font-bold hover:bg-stone-50 dark:hover:bg-stone-800 group-hover:border-teal-500 transition-all">
                                                        {t.help.startLearning}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Instant Support - Polished Sidebar */}
                        <div className="lg:col-span-4 space-y-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                    <MessageCircle className="w-5 h-5 fill-current" />
                                </div>
                                <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                                    {t.help.instantSupport}
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { title: t.help.emailSupport, desc: t.help.emailDesc, icon: Mail, action: t.help.sendEmail, link: 'mailto:support@policywallet.com', color: 'teal' },
                                    { title: t.help.communityChat, desc: t.help.communityDesc, icon: MessageCircle, action: t.help.joinDiscord, link: '#', color: 'indigo' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-8 bg-white dark:bg-stone-900 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-xl shadow-stone-200/30 dark:shadow-none hover:scale-[1.02] transition-all group"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/20 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 group-hover:rotate-12 transition-transform`}>
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                                                {item.title}
                                            </h3>
                                        </div>
                                        <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed mb-8">
                                            {item.desc}
                                        </p>
                                        <a
                                            href={item.link}
                                            className={`flex items-center justify-center gap-2 w-full py-5 bg-${item.color}-600 hover:bg-${item.color}-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[20px] transition-all shadow-lg shadow-${item.color}-600/10 active:scale-95`}
                                        >
                                            {item.action}
                                            <ArrowRight className="w-4 h-4" />
                                        </a>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Social Proof Widget */}
                            <div className="p-8 bg-teal-600 rounded-[40px] text-white overflow-hidden relative group">
                                <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t.help.liveStatus}</p>
                                    <h4 className="text-xl font-black mb-6">{t.help.agentsOnline}</h4>
                                    <div className="flex -space-x-3 mb-6">
                                        {[1, 2, 3, 4].map(n => (
                                            <div key={n} className="w-10 h-10 rounded-full border-2 border-teal-600 bg-stone-200" />
                                        ))}
                                        <div className="w-10 h-10 rounded-full border-2 border-teal-600 bg-teal-500 flex items-center justify-center text-[10px] font-bold">+8</div>
                                    </div>
                                    <Button className="w-full bg-white text-teal-600 hover:bg-stone-50 rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest">
                                        {t.help.startChat}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fallback "Quick Answers" only shown when NOT searching/filtering, at bottom */}
                {!searchQuery && !selectedCategory && (
                    <div className="mt-32 pt-24 border-t border-stone-100 dark:border-stone-800">
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight mb-12 text-center">
                            {t.help.quickAnswers}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {articles.slice(0, 6).map((article, i) => (
                                <motion.div
                                    key={i}
                                    onClick={() => router.push(`/help/article/${article.id}`)}
                                    whileHover={{ x: 4 }}
                                    className="flex items-center justify-between p-6 bg-white dark:bg-stone-900 rounded-3xl group cursor-pointer border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-all shadow-sm"
                                >
                                    <span className="font-bold text-stone-700 dark:text-stone-300 group-hover:text-teal-600 transition-colors">
                                        {article.title}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-teal-600 transition-colors" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
