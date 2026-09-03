"use client"

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CardHead } from '@/components/dashboard/home/CardHead'
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
            href: '/account',
        },
    ]

    const hasFilters = query.trim().length > 0 || activeCategory !== 'all'

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Direction A: the page's own header, not the sticky PageHeader —
                    the shell already pins a top bar. */}
                <header className="mb-6">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.help.pageTitle}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.help.pageSubtitle}</p>
                </header>

                <div className="space-y-4">
                    <section className="pw-card pw-pad" aria-labelledby="help-today-heading">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <h2 id="help-today-heading" className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                                    {t.help.todayTitle}
                                </h2>
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                    {t.help.todaySubtitle}
                                </p>
                            </div>
                            {/* One action here — the page's one primary. The email CTA
                                used to sit beside this, duplicating the full email-support
                                card in the support band below. Support entry points live
                                in the support band. */}
                            <button
                                type="button"
                                onClick={() => router.push('/wallet')}
                                className="pw-primary-button pw-btn-sm shrink-0 cursor-pointer"
                            >
                                {t.help.openWallet}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="relative mt-5">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <input
                                type="text"
                                aria-label={t.help.searchPlaceholder}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t.help.searchPlaceholder}
                                className="pw-input pl-11 pr-12"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    aria-label={t.help.clearFilters}
                                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {/* A segmented strip on the sunken plane — a view filter, not
                            an action, so no green pill (the wallet's filter grammar). */}
                        <div className="pw-subcard pw-scroll-strip mt-4 max-w-full gap-0.5 !rounded-full p-1">
                            {(Object.keys(categoryLabels) as CategoryKey[]).map((category) => {
                                const Icon = getCategoryIcon(category)
                                const isActive = activeCategory === category

                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setActiveCategory(category)}
                                        aria-pressed={isActive}
                                        className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            isActive
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                        {categoryLabels[category]}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {!hasFilters && (
                        <section aria-labelledby="help-quick-heading">
                            <h2 id="help-quick-heading" className="mb-3 text-body font-semibold text-foreground">
                                {t.help.quickActions}
                            </h2>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {taskShortcuts.map((task) => (
                                    <Link
                                        key={task.id}
                                        href={task.href}
                                        className="pw-card pw-pad-tight flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <span className="pw-card-chip" aria-hidden="true">
                                            <task.icon className="h-4 w-4" strokeWidth={1.75} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-foreground">{task.label}</span>
                                            <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">{task.desc}</span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    <section aria-labelledby="help-articles-heading">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 id="help-articles-heading" className="text-body font-semibold text-foreground">
                                {hasFilters ? t.help.results : t.help.featuredGuides}
                            </h2>
                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveCategory('all')
                                        setQuery('')
                                    }}
                                    className="pw-soft-button cursor-pointer !px-3.5 !text-caption"
                                >
                                    {t.help.clearFilters}
                                </button>
                            )}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="pw-card pw-pad-roomy text-center">
                                <p className="text-sm font-semibold text-foreground">{t.help.noArticles}</p>
                                <p className="mt-1 text-caption text-muted-foreground">{t.help.noArticlesHint}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {(hasFilters ? filtered : featured).map((article) => (
                                    <Link
                                        key={article.id}
                                        href={article.href}
                                        className="pw-card pw-pad group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">
                                                {article.categoryLabel}
                                            </span>
                                            <span className="text-caption text-muted-foreground">{article.readTime}</span>
                                        </div>
                                        <h3 className="mt-3 text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                                            {article.title}
                                        </h3>
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">{article.subtitle}</p>
                                        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-caption font-semibold text-primary dark:text-mint">
                                            {t.help.openGuide}
                                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-label={t.help.emailSupport}>
                        <div className="pw-card pw-pad flex flex-col">
                            <CardHead icon={GraduationCap} title={t.help.dictionaryTitle} as="h3" />
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.help.dictionaryDesc}</p>
                            <div className="mt-auto pt-4">
                                <button type="button" onClick={() => router.push('/lexiko')} className="pw-soft-button cursor-pointer">
                                    {t.help.openDictionary}
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <div className="pw-card pw-pad flex flex-col">
                            <CardHead icon={Mail} title={t.help.emailSupport} as="h3" />
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.help.emailDesc}</p>
                            <div className="mt-auto pt-4">
                                <a href={`mailto:${siteConfig.contactEmail}`} className="pw-soft-button">
                                    {t.help.sendEmail}
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </a>
                            </div>
                        </div>

                        <div className="pw-card pw-pad flex flex-col">
                            <CardHead icon={MessageCircle} title={t.help.communityChat} as="h3" />
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.help.communityDesc}</p>
                            <div className="mt-auto pt-4">
                                <Link href="/agent" className="pw-soft-button">
                                    {t.help.openAdvisorPage}
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
