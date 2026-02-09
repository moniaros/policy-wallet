"use client"

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import {
    Search,
    Upload,
    Shield,
    Users,
    Bell,
    CreditCard,
    BookOpen,
    ArrowRight,
    Mail,
    MessageCircle,
    X,
    ChevronRight,
    Sparkles,
} from 'lucide-react'

type CategoryKey = 'all' | 'gettingStarted' | 'policyManagement' | 'accountSecure' | 'billing' | 'mobileApp'

interface HelpArticleCard {
    id: string
    title: string
    subtitle: string
    readTime: string
    categoryKey: Exclude<CategoryKey, 'all'>
    categoryLabel: string
}

function mapArticleToCategory(articleId: string): Exclude<CategoryKey, 'all'> {
    switch (articleId) {
        case 'upload-policy':
            return 'gettingStarted'
        case 'sharing-access':
        case 'premium-features':
        case 'notifications':
            return 'policyManagement'
        case 'reset-password':
            return 'accountSecure'
        case 'update-payment':
            return 'billing'
        case 'install-pwa':
            return 'mobileApp'
        default:
            return 'gettingStarted'
    }
}

function getCategoryIcon(category: CategoryKey) {
    switch (category) {
        case 'gettingStarted':
            return Upload
        case 'policyManagement':
            return Shield
        case 'accountSecure':
            return Users
        case 'billing':
            return CreditCard
        case 'mobileApp':
            return Bell
        default:
            return BookOpen
    }
}

export default function HelpPage() {
    const { t, language } = useLanguage()
    const router = useRouter()

    const [query, setQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<CategoryKey>('all')

    const localeArticles = helpArticles[language] || helpArticles.en

    const categoryLabels = {
        all: t.common.all,
        gettingStarted: t.help.categories.gettingStarted,
        policyManagement: t.help.categories.policyManagement,
        accountSecure: t.help.categories.accountSecure,
        billing: t.help.categories.billing,
        mobileApp: t.help.categories.mobileApp,
    }

    const articles = useMemo<HelpArticleCard[]>(() => {
        return Object.values(localeArticles).map((article) => {
            const categoryKey = mapArticleToCategory(article.id)
            return {
                id: article.id,
                title: article.title,
                subtitle: article.subtitle,
                readTime: article.readTime,
                categoryKey,
                categoryLabel: categoryLabels[categoryKey],
            }
        })
    }, [localeArticles, categoryLabels])

    const featuredOrder = ['upload-policy', 'sharing-access', 'premium-features']
    const featured = useMemo(() => {
        const byId = new Map(articles.map((a) => [a.id, a]))
        return featuredOrder.map((id) => byId.get(id)).filter(Boolean) as HelpArticleCard[]
    }, [articles])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        return articles.filter((a) => {
            const byQuery =
                q.length === 0 ||
                a.title.toLowerCase().includes(q) ||
                a.subtitle.toLowerCase().includes(q) ||
                a.categoryLabel.toLowerCase().includes(q)

            const byCategory = activeCategory === 'all' || a.categoryKey === activeCategory

            return byQuery && byCategory
        })
    }, [articles, query, activeCategory])

    const taskShortcuts = [
        {
            id: 'wallet-upload',
            icon: Upload,
            label: language === 'el' ? 'Ανέβασε νέο ασφαλιστήριο' : 'Upload a new policy',
            desc: language === 'el' ? 'Ξεκίνα από το πορτοφόλι σου σε λιγότερο από 1 λεπτό.' : 'Start from your wallet in under a minute.',
            href: '/wallet',
        },
        {
            id: 'coverage-insights',
            icon: Sparkles,
            label: language === 'el' ? 'Δες τις καλύψεις σου καθαρά' : 'Understand your coverage clearly',
            desc: language === 'el' ? 'Άνοιξε τα coverage insights και εντόπισε τα επόμενα βήματα.' : 'Open coverage insights and find your next best actions.',
            href: '/coverage-insights',
        },
        {
            id: 'share-collab',
            icon: Users,
            label: language === 'el' ? 'Κοινοποίηση με σύμβουλο ή οικογένεια' : 'Share with agent or family',
            desc: language === 'el' ? 'Συνεργασία με πλήρη έλεγχο δικαιωμάτων.' : 'Collaborate with full permission control.',
            href: '/help/article/sharing-access',
        },
        {
            id: 'billing-plans',
            icon: CreditCard,
            label: language === 'el' ? 'Χρέωση και συνδρομή' : 'Billing and plans',
            desc: language === 'el' ? 'Διαχείριση κάρτας, πλάνου και αναβαθμίσεων.' : 'Manage card, plan, and upgrades.',
            href: '/account',
        },
    ]

    const hasFilters = query.trim().length > 0 || activeCategory !== 'all'

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-20">
            <PageHeader title={t.help.pageTitle} subtitle={t.help.pageSubtitle} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
                <section className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-7 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                                {language === 'el' ? 'Τι θέλεις να κάνεις σήμερα;' : 'What do you need to do today?'}
                            </h2>
                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-2xl">
                                {language === 'el'
                                    ? 'Βρες άμεσα οδηγούς για ανέβασμα ασφαλιστηρίου, κατανόηση καλύψεων και συνεργασία με τον σύμβουλό σου.'
                                    : 'Get instant guidance on uploading policies, understanding coverage, and collaborating with your agent.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/wallet')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                {language === 'el' ? 'Άνοιγμα πορτοφολιού' : 'Open wallet'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <a
                                href="mailto:support@policywallet.com"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                            >
                                {t.help.sendEmail}
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 relative">
                        <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.help.searchPlaceholder}
                            className="w-full pl-12 pr-12 py-3.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                        {(Object.keys(categoryLabels) as CategoryKey[]).map((category) => {
                            const Icon = getCategoryIcon(category)
                            const isActive = activeCategory === category

                            return (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                        isActive
                                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {categoryLabels[category]}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {!hasFilters && (
                    <section>
                        <h2 className="text-lg font-black text-stone-900 dark:text-white tracking-tight mb-4">
                            {language === 'el' ? 'Γρήγορες ενέργειες' : 'Quick actions'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {taskShortcuts.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => router.push(task.href)}
                                    className="text-left p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                                        <task.icon className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-sm text-stone-900 dark:text-white mb-1">{task.label}</p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{task.desc}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                            {hasFilters
                                ? language === 'el'
                                    ? 'Αποτελέσματα'
                                    : 'Results'
                                : t.help.featuredGuides}
                        </h2>
                        {hasFilters && (
                            <button
                                onClick={() => {
                                    setActiveCategory('all')
                                    setQuery('')
                                }}
                                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                            >
                                {language === 'el' ? 'Καθαρισμός φίλτρων' : 'Clear filters'}
                            </button>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-10 text-center">
                            <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-2">
                                {language === 'el' ? 'Δεν βρέθηκαν άρθρα' : 'No articles found'}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                {language === 'el' ? 'Δοκιμάστε διαφορετική λέξη ή κατηγορία.' : 'Try a different keyword or category.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(hasFilters ? filtered : featured).map((article) => (
                                <button
                                    key={article.id}
                                    onClick={() => router.push(`/help/article/${article.id}`)}
                                    className="text-left h-full p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold uppercase tracking-widest">
                                            {article.categoryLabel}
                                        </span>
                                        <span className="text-[10px] font-bold text-stone-400">{article.readTime}</span>
                                    </div>
                                    <h3 className="text-base font-black text-stone-900 dark:text-white mb-2 leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-4">{article.subtitle}</p>
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                                        {language === 'el' ? 'Άνοιγμα οδηγού' : 'Open guide'}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                <Mail className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-stone-900 dark:text-white">{t.help.emailSupport}</h3>
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-5">{t.help.emailDesc}</p>
                        <a
                            href="mailto:support@policywallet.com"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity"
                        >
                            {t.help.sendEmail}
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-stone-900 dark:text-white">{t.help.communityChat}</h3>
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-5">{t.help.communityDesc}</p>
                        <button
                            onClick={() => router.push('/account')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        >
                            {language === 'el' ? 'Άνοιγμα ρυθμίσεων' : 'Open settings'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
