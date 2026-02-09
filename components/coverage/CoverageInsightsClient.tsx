"use client"

import React, { useMemo, useState } from 'react'
import {
    Shield,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    ArrowRight,
    Lock,
    Crown,
    Activity,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { InsightCard, InsightData } from './InsightCard'
import { updateGapStatus } from '@/app/(protected)/coverage-insights/actions'
import { toast } from 'sonner'

type PlanTier = 'free' | 'plus' | 'pro'

interface CoverageInsightsClientProps {
    gaps: any[]
    stats: {
        critical: number
        high: number
        medium: number
        low: number
        healthScore: number
        totalGaps: number
        totalPolicies: number
        totalCoverage: number
    }
    userLanguage: string
    tier: PlanTier
    isPaid: boolean
    canUseAdvancedAnalytics: boolean
    canUseAgentCollaboration: boolean
    policies?: Array<{
        id: string
        insurerName: string
        lineOfBusiness: { code: string; name: string }
    }>
}

export function CoverageInsightsClient({
    gaps,
    stats,
    userLanguage,
    tier,
    isPaid,
    canUseAdvancedAnalytics,
    canUseAgentCollaboration,
    policies = []
}: CoverageInsightsClientProps) {
    const lang = userLanguage === 'el' ? 'el' : 'en'
    const router = useRouter()
    const [hiddenInsights, setHiddenInsights] = useState<Set<string>>(new Set())

    const isFreeTier = tier === 'free'

    const getConfidenceLevel = (score: number) => {
        if (score >= 80) return {
            label: { el: '?S????', en: 'STRONG' },
            desc: { el: '? s??????? sa? ?????? e??a? sta?e?? ?a? ?a?? ?s????p?µ???.', en: 'Your overall coverage is stable and well balanced.' },
            summary: { el: '? ?????? sa? e??a? ?s????.', en: 'Your coverage is strong.' },
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30'
        }
        if (score >= 50) return {
            label: { el: '??????S', en: 'SUFFICIENT' },
            desc: { el: '?a??pteste sta ﬂas???, a??? ?p?????? s?µe?a p?? a???e? ?a de?te.', en: 'You are covered on basics, but a few points are worth reviewing.' },
            summary: { el: '? ?????? sa? e??a? epa???? sta ﬂas???.', en: 'Your coverage is sufficient on basics.' },
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
        }
        return {
            label: { el: '????????S', en: 'INSUFFICIENT' },
            desc: { el: '?p?????? ?e?? p?? µp??e? ?a sa? e???s??? ??????µ???.', en: 'There are gaps that can expose you financially.' },
            summary: { el: '? ?????? sa? ??e???eta? p??s???.', en: 'Your coverage needs attention.' },
            color: 'text-red-600',
            bg: 'bg-red-100 dark:bg-red-900/30'
        }
    }

    const confidence = getConfidenceLevel(stats.healthScore)
    const visibleGaps = gaps.filter(g => !hiddenInsights.has(g.id))
    const maxVisibleInsights = isFreeTier ? 2 : 6

    const summaryText = visibleGaps.length > 0
        ? (lang === 'el'
            ? `${confidence.summary.el} ?p?????? ${visibleGaps.length} s?µe?a p?? a???e? ?a ??????ete.`
            : `${confidence.summary.en} There are ${visibleGaps.length} points worth reviewing.`)
        : (lang === 'el'
            ? `${confidence.summary.el} ?e? e?t?p?st??a? ?e??.`
            : `${confidence.summary.en} No gaps detected.`)

    const insights: InsightData[] = useMemo(() => {
        return visibleGaps.slice(0, maxVisibleInsights).map(gap => ({
            id: gap.id,
            type: (gap.policy?.lineOfBusiness || 'other').toLowerCase() as any,
            title: gap.title || (lang === 'el' ? 'S?µe?? p??? ??e???' : 'Coverage point to review'),
            whyItMatters: gap.description || (lang === 'el' ? '??t? t? s?µe?? ep??e??e? t?? ?????? sa?.' : 'This point affects your protection level.'),
            severity: (gap.severity || 'medium') as any,
            checkedItems: lang === 'el'
                ? ['???a ??????? s?µﬂ??a???', '??µ???? apa?t?se??', 'Se????a a???µ???? ???d????']
                : ['Coverage limits', 'Legal requirements', 'Higher-risk scenarios'],
            primaryAction: {
                label: lang === 'el' ? '???ﬂ??? s?µﬂ??a???' : 'Review policy',
                type: 'primary'
            },
            secondaryActions: [
                { label: lang === 'el' ? 'S?µe??s?' : 'Add note', type: 'secondary' },
                { label: lang === 'el' ? '?????s?' : 'Ignore', type: 'secondary' }
            ],
            microcopy: gap.severity === 'critical'
                ? (lang === 'el' ? 'S???st?ta? ?µes? a???????s?' : 'Immediate review recommended')
                : (lang === 'el' ? '?e? apa?te?ta? ?µes? e????e?a' : 'No immediate action required'),
            isPlusFeature: !canUseAdvancedAnalytics,
        }))
    }, [visibleGaps, maxVisibleInsights, lang, canUseAdvancedAnalytics])

    const policiesWithIssues = new Set(gaps.map(g => g.policyId).filter(Boolean))
    const policiesOk = policies.filter(p => !policiesWithIssues.has(p.id))

    const handleAction = async (type: string, id: string, label: string) => {
        const isIgnore = label === '?????s?' || label === 'Ignore'
        const isReview = label === '???ﬂ??? s?µﬂ??a???' || label === 'Review policy'

        if (isIgnore) {
            setHiddenInsights(prev => new Set(prev).add(id))
            try {
                await updateGapStatus(id, 'dismissed')
                toast.success(lang === 'el' ? '? s?stas? a??e???et????e' : 'Insight dismissed')
            } catch {
                toast.error(lang === 'el' ? '?p?t???a e??µ???s??' : 'Failed to update')
            }
            return
        }

        if (isReview || type === 'primary') {
            const gap = gaps.find(g => g.id === id)
            if (gap?.policyId) {
                router.push(`/wallet/${gap.policyId}`)
            } else {
                toast.info(lang === 'el' ? '?e? ﬂ?????e s?s?et?sµ??? s?µﬂ??a??' : 'No linked policy found')
            }
            return
        }

        if (canUseAgentCollaboration) {
            router.push('/account')
        } else {
            router.push('/upgrade?reason=feature_locked')
        }
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                <div className="mb-8 text-center">
                    <h1 className="text-xl font-medium text-stone-500 dark:text-stone-400 mb-2">
                        {lang === 'el' ? 'S????? ???????' : 'Coverage Summary'}
                    </h1>
                    <p className="text-2xl font-black text-stone-900 dark:text-white leading-tight">
                        {summaryText}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className={`rounded-2xl p-4 ${confidence.bg}`}>
                        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${confidence.color}`}>{confidence.label[lang]}</p>
                        <p className="text-sm text-stone-800 dark:text-stone-100">{confidence.desc[lang]}</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-1">{lang === 'el' ? '????t???? µe s?µe?a' : 'Policies with points'}</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">{stats.totalGaps}</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-1">{lang === 'el' ? 'S??????? s?µﬂ??a?a' : 'Total policies'}</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">{stats.totalPolicies}</p>
                    </div>
                </div>

                {isFreeTier && (
                    <div className="mb-10 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-violet-600 dark:text-violet-300 mt-0.5" />
                            <div>
                                <p className="font-bold text-violet-900 dark:text-violet-100">{lang === 'el' ? '???ﬂ??? Lite Insights' : 'Lite insights mode'}</p>
                                <p className="text-sm text-violet-800 dark:text-violet-200">
                                    {lang === 'el'
                                        ? '???pete ta 2 p?? s?µa?t??? s?µe?a. ??aﬂa?µ?ste ??a p???? a????s? ?a? p??te?a??p???s? ???? t?? ?e???.'
                                        : 'You are seeing the top 2 points. Upgrade for full analysis and prioritization across all gaps.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/upgrade?reason=feature_locked')}
                            className="px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Crown className="w-4 h-4" />
                            {lang === 'el' ? '??aﬂ??µ?s?' : 'Upgrade'}
                        </button>
                    </div>
                )}

                <div className="mb-12">
                    <h2 className="text-lg font-black text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {lang === 'el' ? 'S?µe?a p?? a???e? ?a de?te' : 'Points worth reviewing'}
                    </h2>

                    <div className="space-y-6">
                        {insights.length > 0 ? (
                            insights.map((insight) => (
                                <InsightCard
                                    key={insight.id}
                                    insight={insight}
                                    language={lang}
                                    onAction={handleAction}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                                <Sparkles className="w-8 h-8 text-teal-500 mx-auto mb-3" />
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{lang === 'el' ? '??a fa????ta? e?t??e?' : 'Everything looks good'}</p>
                                <p className="text-stone-500 text-sm">{lang === 'el' ? '?e? e?t?p?st??a? s?µe?a p?? ??e?????ta? t?? p??s??? sa?.' : 'No points need your attention right now.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {policiesOk.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 px-2">
                            {lang === 'el' ? '?? e????aµe ?a? e??a? ?a??' : 'What we checked and looks good'}
                        </h3>
                        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
                            {policiesOk.map((policy) => (
                                <div key={policy.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900 dark:text-white text-sm">
                                                {(policy.lineOfBusiness as any)?.name || (lang === 'el' ? '?sfa??st????' : 'Policy')}
                                            </div>
                                            <div className="text-xs text-stone-500">{policy.insurerName}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-stone-400 bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded">OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-8 border-t border-stone-200 dark:border-stone-800 text-center">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-6">
                        {lang === 'el' ? '?p?µe?a ﬂ?µata' : 'Next steps'}
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                        <button
                            onClick={() => router.push('/wallet')}
                            className="flex-1 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>{lang === 'el' ? '?p?st??f? st? Wallet' : 'Back to Wallet'}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={() => router.push(isFreeTier ? '/upgrade?reason=feature_locked' : '/account')}
                            className="flex-1 py-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <Activity className="w-4 h-4" />
                            {isFreeTier
                                ? (lang === 'el' ? '?e??e?d?µa p?????? a????s??' : 'Unlock full analysis')
                                : (lang === 'el' ? '???µ?se?? ???????' : 'Coverage settings')}
                        </button>
                    </div>
                    <p className="text-xs text-stone-400 mt-6 max-w-md mx-auto leading-relaxed">
                        {lang === 'el'
                            ? '? PolicyWallet pa?aµ??e? a?e???t?t? p?atf??µa. ?? p????f???e? st??e???? se ?a??te?e? ap?f?se?? ???????.'
                            : 'PolicyWallet remains an independent platform. Insights are designed to support better coverage decisions.'}
                    </p>
                </div>
            </div>
        </div>
    )
}
