"use client"

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/src/design-system/primitives'
import { useLanguage } from '@/contexts/LanguageContext'
import { helpArticles } from '@/lib/help-content'
import type { GuideSummary } from '@/lib/guides/content'
// The published contact route: Terms and the privacy policy both name this
// address, and /contact renders it. The Help page offered a .com address on a
// domain the company does not own — so the one CTA a stuck policyholder reaches
// for sent their mail nowhere.
import { siteConfig } from '@/lib/seo/site'
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
    GraduationCap,
} from 'lucide-react'

function stripDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

type CategoryKey = 'all' | 'gettingStarted' | 'policyManagement' | 'accountSecure' | 'billing' | 'mobileApp' | 'insuranceBasics'

interface HelpArticleCard {
    id: string
    title: string
    subtitle: string
    readTime: string
    categoryKey: Exclude<CategoryKey, 'all'>
    categoryLabel: string
    /** Where the card navigates: help articles → /help/article/<id>, guides → /guides/<slug>. */
    href: string
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
        case 'insuranceBasics':
            return GraduationCap
        default:
            return BookOpen
    }
}

export function HelpClient({ guideSummaries }: { guideSummaries: GuideSummary[] }) {
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
        insuranceBasics: t.help.categories.insuranceBasics,
    }

    const articles = useMemo<HelpArticleCard[]>(() => {
        const helpCards = Object.values(localeArticles).map((article) => {
            const categoryKey = mapArticleToCategory(article.id)
            return {
                id: article.id,
                title: article.title,
                subtitle: article.subtitle,
                readTime: article.readTime,
                categoryKey,
                categoryLabel: categoryLabels[categoryKey],
                href: `/help/article/${article.id}`,
            }
        })

        // The insurance guides (authored once in lib/guides, rendered at
        // /guides/<slug>) surfaced here as first-class, searchable help cards —
        // education at the moment a stuck user comes looking for it.
        const guideCards: HelpArticleCard[] = guideSummaries.map((g) => ({
            id: `guide-${g.slug}`,
            title: g.title[language] ?? g.title.en,
            subtitle: g.summary[language] ?? g.summary.en,
            readTime: `${g.readingMinutes} ${t.help.minRead}`,
            categoryKey: 'insuranceBasics',
            categoryLabel: categoryLabels.insuranceBasics,
            href: `/guides/${g.slug}`,
        }))

        return [...helpCards, ...guideCards]
    }, [localeArticles, categoryLabels, guideSummaries, language, t.help.minRead])

    const featuredOrder = ['upload-policy', 'sharing-access', 'premium-features']
    const featured = useMemo(() => {
        const byId = new Map(articles.map((a) => [a.id, a]))
        return featuredOrder.map((id) => byId.get(id)).filter(Boolean) as HelpArticleCard[]
    }, [articles])

    const filtered = useMemo(() => {
        const q = stripDiacritics(query.trim().toLowerCase())

        return articles.filter((a) => {
            const byQuery =
                q.length === 0 ||
                stripDiacritics(a.title.toLowerCase()).includes(q) ||
                stripDiacritics(a.subtitle.toLowerCase()).includes(q) ||
                stripDiacritics(a.categoryLabel.toLowerCase()).includes(q)

            const byCategory = activeCategory === 'all' || a.categoryKey === activeCategory

            return byQuery && byCategory
        })
    }, [articles, query, activeCategory])

    const taskShortcuts = [
        {
            id: 'wallet-upload',
            icon: Upload,
            label: t.help.shortcuts.uploadLabel,
            desc: t.help.shortcuts.uploadDesc,
            href: '/wallet',
        },
        {
            id: 'coverage-insights',
            icon: Sparkles,
            label: t.help.shortcuts.coverageLabel,
            desc: t.help.shortcuts.coverageDesc,
            href: '/protection',
        },
        {
            id: 'share-collab',
            icon: Users,
            label: t.help.shortcuts.shareLabel,
            desc: t.help.shortcuts.shareDesc,
            href: '/help/article/sharing-access',
        },
        {
            id: 'billing-plans',
            icon: CreditCard,
            label: t.help.shortcuts.billingLabel,
            desc: t.help.shortcuts.billingDesc,
            href: '/me',
        },
    ]

    const hasFilters = query.trim().length > 0 || activeCategory !== 'all'

    return (
        <div className="pb-20">
            <PageHeader title={t.help.pageTitle} subtitle={t.help.pageSubtitle} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
                <section className="rounded-g-sheet border border-border-subtle bg-surface-raised p-5 sm:p-7 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-fg-primary tracking-tight">
                                {t.help.todayTitle}
                            </h2>
                            <p className="mt-1 text-sm text-fg-secondary max-w-2xl">
                                {t.help.todaySubtitle}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* One action here. The email CTA used to sit beside this,
                                duplicating the full email-support card in the support
                                band below — two identical mailto CTAs on one screen.
                                Support entry points live in the support band. */}
                            <button
                                onClick={() => router.push('/wallet')}
                                className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-g-control bg-action-primary-bg text-fg-on-brand text-sm font-bold hover:bg-action-primary-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            >
                                {t.help.openWallet}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 relative">
                        <Search className="w-5 h-5 text-fg-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                        <Input
                            type="text"
                            aria-label={t.help.searchPlaceholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.help.searchPlaceholder}
                            className="pl-12 pr-12"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                aria-label={t.help.clearFilters}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-surface-sunken transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                                    aria-pressed={isActive}
                                    className={`inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-g-control text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                                        isActive
                                            ? 'bg-action-primary-bg text-fg-on-brand'
                                            : 'bg-surface-sunken text-fg-secondary hover:bg-surface-wash'
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
                        <h2 className="text-lg font-black text-fg-primary tracking-tight mb-4">
                            {t.help.quickActions}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {taskShortcuts.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => router.push(task.href)}
                                    className="text-left p-5 rounded-g-card bg-surface-raised border border-border-subtle hover:border-border-focus hover:shadow-g-raised transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                    <div className="w-10 h-10 rounded-g-control bg-surface-wash text-fg-brand flex items-center justify-center mb-3">
                                        <task.icon className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-sm text-fg-primary mb-1">{task.label}</p>
                                    <p className="text-xs text-fg-secondary leading-relaxed">{task.desc}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-fg-primary tracking-tight">
                            {hasFilters ? t.help.results : t.help.featuredGuides}
                        </h2>
                        {hasFilters && (
                            <button
                                onClick={() => {
                                    setActiveCategory('all')
                                    setQuery('')
                                }}
                                className="rounded text-xs font-bold text-fg-brand hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            >
                                {t.help.clearFilters}
                            </button>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="bg-surface-raised rounded-g-card border border-border-subtle p-10 text-center">
                            <p className="text-sm font-bold text-fg-primary mb-2">
                                {t.help.noArticles}
                            </p>
                            <p className="text-xs text-fg-secondary">
                                {t.help.noArticlesHint}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(hasFilters ? filtered : featured).map((article) => (
                                <button
                                    key={article.id}
                                    onClick={() => router.push(article.href)}
                                    className="text-left h-full p-5 rounded-g-card bg-surface-raised border border-border-subtle hover:border-border-focus hover:shadow-g-raised transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-g-app-caption font-semibold text-fg-secondary">
                                            {article.categoryLabel}
                                        </span>
                                        <span className="text-g-app-caption font-bold text-fg-secondary">{article.readTime}</span>
                                    </div>
                                    <h3 className="text-base font-black text-fg-primary mb-2 leading-tight group-hover:text-fg-brand  transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-sm text-fg-secondary line-clamp-2 mb-4" title={article.subtitle}>{article.subtitle}</p>
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-fg-brand">
                                        {t.help.openGuide}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-g-card bg-surface-raised border border-border-subtle p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-g-control bg-surface-wash text-fg-brand flex items-center justify-center">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <h3 className="min-w-0 text-base font-black text-fg-primary">{t.help.dictionaryTitle}</h3>
                        </div>
                        <p className="text-sm text-fg-secondary mb-5">{t.help.dictionaryDesc}</p>
                        <button
                            onClick={() => router.push('/lexiko')}
                            className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-g-control bg-action-primary-bg text-fg-on-brand text-sm font-bold hover:bg-action-primary-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                            {t.help.openDictionary}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="rounded-g-card bg-surface-raised border border-border-subtle p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-g-control bg-surface-wash text-fg-brand flex items-center justify-center">
                                <Mail className="w-5 h-5" />
                            </div>
                            <h3 className="min-w-0 text-base font-black text-fg-primary">{t.help.emailSupport}</h3>
                        </div>
                        <p className="text-sm text-fg-secondary mb-5">{t.help.emailDesc}</p>
                        <a
                            href={`mailto:${siteConfig.contactEmail}`}
                            className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-g-control border border-border-subtle text-fg-primary text-sm font-bold hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            {t.help.sendEmail}
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>

                    <div className="rounded-g-card bg-surface-raised border border-border-subtle p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-g-control bg-surface-wash text-fg-brand flex items-center justify-center">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <h3 className="min-w-0 text-base font-black text-fg-primary">{t.help.communityChat}</h3>
                        </div>
                        <p className="text-sm text-fg-secondary mb-5">{t.help.communityDesc}</p>
                        <button
                            onClick={() => router.push('/agent')}
                            className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-g-control border border-border-subtle text-fg-primary text-sm font-bold hover:bg-surface-sunken transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            {t.help.openAdvisorPage}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
