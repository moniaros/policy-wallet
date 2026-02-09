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
    canUseAdvancedAnalytics,
    canUseAgentCollaboration,
    policies = []
}: CoverageInsightsClientProps) {
    const lang = userLanguage === 'el' ? 'el' : 'en'
    const router = useRouter()
    const [hiddenInsights, setHiddenInsights] = useState<Set<string>>(new Set())

    const isFreeTier = tier === 'free'

    const copy = {
        summaryTitle: lang === 'el' ? 'Σύνοψη κάλυψης' : 'Coverage summary',
        liteTitle: lang === 'el' ? 'Προβολή lite insights' : 'Lite insights mode',
        liteDescription: lang === 'el'
            ? 'Βλέπεις τα 2 πιο σημαντικά σημεία. Αναβάθμιση για πλήρη προτεραιοποίηση.'
            : 'You are seeing the top 2 points. Upgrade for full prioritization.',
        upgrade: lang === 'el' ? 'Αναβάθμιση' : 'Upgrade',
        reviewSectionTitle: lang === 'el' ? 'Σημεία που αξίζει να ελέγξεις' : 'Points worth reviewing',
        allGoodTitle: lang === 'el' ? 'Δεν εντοπίστηκαν κενά' : 'No gaps detected',
        allGoodDescription: lang === 'el' ? 'Η κάλυψή σου φαίνεται ενημερωμένη.' : 'Your coverage appears up to date.',
        checkedAndGood: lang === 'el' ? 'Τι ελέγξαμε και είναι εντάξει' : 'Checked and looks good',
        nextSteps: lang === 'el' ? 'Επόμενα βήματα' : 'Next steps',
        backToWallet: lang === 'el' ? 'Επιστροφή στο πορτοφόλι' : 'Back to wallet',
        unlockFull: lang === 'el' ? 'Ξεκλείδωσε πλήρη ανάλυση' : 'Unlock full analysis',
        coverageSettings: lang === 'el' ? 'Ρυθμίσεις κάλυψης' : 'Coverage settings',
        independentNote: lang === 'el'
            ? 'Το PolicyWallet παραμένει ανεξάρτητη πλατφόρμα που υποστηρίζει καλύτερες αποφάσεις κάλυψης.'
            : 'PolicyWallet remains an independent platform designed to support better coverage decisions.',
        policiesWithPoints: lang === 'el' ? 'Συμβόλαια με σημεία ελέγχου' : 'Policies with points',
        totalPolicies: lang === 'el' ? 'Σύνολο συμβολαίων' : 'Total policies',
        dismissSuccess: lang === 'el' ? 'Η σύσταση αποκρύφτηκε' : 'Insight dismissed',
        dismissFail: lang === 'el' ? 'Αποτυχία ενημέρωσης' : 'Failed to update',
        noLinkedPolicy: lang === 'el' ? 'Δεν βρέθηκε συνδεδεμένο συμβόλαιο' : 'No linked policy found',
        reviewPolicy: lang === 'el' ? 'Προβολή συμβολαίου' : 'Review policy',
        addNote: lang === 'el' ? 'Σημείωση' : 'Add note',
        ignore: lang === 'el' ? 'Αγνόηση' : 'Ignore',
        immediateReview: lang === 'el' ? 'Συνιστάται άμεσος έλεγχος' : 'Immediate review recommended',
        noImmediateAction: lang === 'el' ? 'Δεν απαιτείται άμεση ενέργεια' : 'No immediate action required',
    }

    const getConfidenceLevel = (score: number) => {
        if (score >= 80) {
            return {
                label: { el: 'Ισχυρή', en: 'Strong' },
                desc: {
                    el: 'Η συνολική κάλυψη είναι σταθερή και ισορροπημένη.',
                    en: 'Your overall coverage is stable and balanced.'
                },
                summary: { el: 'Η κάλυψή σου είναι ισχυρή.', en: 'Your coverage is strong.' },
                color: 'text-emerald-600',
                bg: 'bg-emerald-100 dark:bg-emerald-900/30'
            }
        }

        if (score >= 50) {
            return {
                label: { el: 'Επαρκής', en: 'Sufficient' },
                desc: {
                    el: 'Καλύπτεις τα βασικά, αλλά υπάρχουν σημεία για βελτίωση.',
                    en: 'You cover the basics, but a few points need attention.'
                },
                summary: { el: 'Η κάλυψή σου είναι επαρκής.', en: 'Your coverage is sufficient.' },
                color: 'text-amber-600',
                bg: 'bg-amber-100 dark:bg-amber-900/30'
            }
        }

        return {
            label: { el: 'Ανεπαρκής', en: 'Insufficient' },
            desc: {
                el: 'Υπάρχουν κενά που μπορεί να αυξήσουν τον κίνδυνό σου.',
                en: 'There are gaps that may increase your exposure.'
            },
            summary: { el: 'Η κάλυψή σου χρειάζεται ενίσχυση.', en: 'Your coverage needs attention.' },
            color: 'text-red-600',
            bg: 'bg-red-100 dark:bg-red-900/30'
        }
    }

    const confidence = getConfidenceLevel(stats.healthScore)
    const visibleGaps = gaps.filter((g) => !hiddenInsights.has(g.id))
    const maxVisibleInsights = isFreeTier ? 2 : 6

    const summaryText = visibleGaps.length > 0
        ? (lang === 'el'
            ? `${confidence.summary.el} Εντοπίστηκαν ${visibleGaps.length} σημεία προς έλεγχο.`
            : `${confidence.summary.en} ${visibleGaps.length} points were identified for review.`)
        : (lang === 'el' ? `${confidence.summary.el} Δεν εντοπίστηκαν κενά.` : `${confidence.summary.en} No gaps detected.`)

    const insights: InsightData[] = useMemo(() => {
        return visibleGaps.slice(0, maxVisibleInsights).map((gap) => ({
            id: gap.id,
            type: (gap.policy?.lineOfBusiness || 'other').toLowerCase() as any,
            title: gap.title || (lang === 'el' ? 'Σημείο κάλυψης προς έλεγχο' : 'Coverage point to review'),
            whyItMatters: gap.description || (lang === 'el' ? 'Αυτό το σημείο επηρεάζει το επίπεδο προστασίας σου.' : 'This point affects your protection level.'),
            severity: (gap.severity || 'medium') as any,
            checkedItems: lang === 'el'
                ? ['Όρια κάλυψης', 'Νομικές απαιτήσεις', 'Σενάρια αυξημένου κινδύνου']
                : ['Coverage limits', 'Legal requirements', 'Higher-risk scenarios'],
            primaryAction: { label: copy.reviewPolicy, type: 'primary' },
            secondaryActions: [
                { label: copy.addNote, type: 'secondary' },
                { label: copy.ignore, type: 'secondary' }
            ],
            microcopy: gap.severity === 'critical' ? copy.immediateReview : copy.noImmediateAction,
            isPlusFeature: !canUseAdvancedAnalytics,
        }))
    }, [visibleGaps, maxVisibleInsights, lang, canUseAdvancedAnalytics, copy])

    const policiesWithIssues = new Set(gaps.map((g) => g.policyId).filter(Boolean))
    const policiesOk = policies.filter((p) => !policiesWithIssues.has(p.id))

    const handleAction = async (type: string, id: string, label: string) => {
        if (label === copy.ignore) {
            setHiddenInsights((prev) => new Set(prev).add(id))
            try {
                await updateGapStatus(id, 'dismissed')
                toast.success(copy.dismissSuccess)
            } catch {
                toast.error(copy.dismissFail)
            }
            return
        }

        if (label === copy.reviewPolicy || type === 'primary') {
            const gap = gaps.find((g) => g.id === id)
            if (gap?.policyId) {
                router.push(`/wallet/${gap.policyId}`)
            } else {
                toast.info(copy.noLinkedPolicy)
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
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10">
                <div className="mb-7 text-center">
                    <h1 className="text-base font-medium text-stone-500 dark:text-stone-400 mb-2">{copy.summaryTitle}</h1>
                    <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white leading-tight">{summaryText}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    <div className={`rounded-2xl p-4 ${confidence.bg}`}>
                        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${confidence.color}`}>{confidence.label[lang]}</p>
                        <p className="text-sm text-stone-800 dark:text-stone-100">{confidence.desc[lang]}</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-1">{copy.policiesWithPoints}</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">{stats.totalGaps}</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-1">{copy.totalPolicies}</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">{stats.totalPolicies}</p>
                    </div>
                </div>

                {isFreeTier && (
                    <div className="mb-8 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-violet-600 dark:text-violet-300 mt-0.5" />
                            <div>
                                <p className="font-bold text-violet-900 dark:text-violet-100">{copy.liteTitle}</p>
                                <p className="text-sm text-violet-800 dark:text-violet-200">{copy.liteDescription}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/upgrade?reason=feature_locked')}
                            className="px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <Crown className="w-4 h-4" />
                            {copy.upgrade}
                        </button>
                    </div>
                )}

                <div className="mb-10">
                    <h2 className="text-lg font-black text-stone-900 dark:text-white mb-5 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {copy.reviewSectionTitle}
                    </h2>

                    <div className="space-y-4">
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
                            <div className="text-center py-10 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                                <Sparkles className="w-8 h-8 text-teal-500 mx-auto mb-3" />
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{copy.allGoodTitle}</p>
                                <p className="text-stone-500 text-sm">{copy.allGoodDescription}</p>
                            </div>
                        )}
                    </div>
                </div>

                {policiesOk.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-3 px-1">{copy.checkedAndGood}</h3>
                        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
                            {policiesOk.map((policy) => (
                                <div key={policy.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900 dark:text-white text-sm">{policy.lineOfBusiness?.name || (lang === 'el' ? 'Ασφαλιστήριο' : 'Policy')}</div>
                                            <div className="text-xs text-stone-500">{policy.insurerName}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded">OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-stone-200 dark:border-stone-800 text-center">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4">{copy.nextSteps}</h3>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                        <button
                            onClick={() => router.push('/wallet')}
                            className="flex-1 py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>{copy.backToWallet}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => router.push(isFreeTier ? '/upgrade?reason=feature_locked' : '/account')}
                            className="flex-1 py-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Activity className="w-4 h-4" />
                            {isFreeTier ? copy.unlockFull : copy.coverageSettings}
                        </button>
                    </div>
                    <p className="text-xs text-stone-400 mt-5 max-w-md mx-auto leading-relaxed">{copy.independentNote}</p>
                </div>
            </div>
        </div>
    )
}
