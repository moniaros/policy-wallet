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
        allGoodDescription: lang === 'el' ? 'Η κάλυψή σας φαίνεται ενημερωμένη.' : 'Your coverage appears up to date.',
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
                summary: { el: 'Η κάλυψή σας είναι ισχυρή.', en: 'Your coverage is strong.' },
                color: 'text-[#19b870] dark:text-[#7de8ba]',
                bg: 'bg-[#1FDC86]/12 dark:bg-[#1FDC86]/15'
            }
        }

        if (score >= 50) {
            return {
                label: { el: 'Επαρκής', en: 'Sufficient' },
                desc: {
                    el: 'Καλύπτετε τα βασικά, αλλά υπάρχουν σημεία για βελτίωση.',
                    en: 'You cover the basics, but a few points need attention.'
                },
                summary: { el: 'Η κάλυψή σας είναι επαρκής.', en: 'Your coverage is sufficient.' },
                color: 'text-amber-600',
                bg: 'bg-amber-100 dark:bg-amber-900/30'
            }
        }

        return {
            label: { el: 'Ανεπαρκής', en: 'Insufficient' },
            desc: {
                el: 'Υπάρχουν κενά που μπορεί να αυξήσουν τον κίνδυνό σας.',
                en: 'There are gaps that may increase your exposure.'
            },
            summary: { el: 'Η κάλυψή σας χρειάζεται ενίσχυση.', en: 'Your coverage needs attention.' },
            color: 'text-red-600',
            bg: 'bg-red-100 dark:bg-red-900/30'
        }
    }

    const confidence = getConfidenceLevel(stats.healthScore)
    const visibleGaps = gaps.filter((g) => !hiddenInsights.has(g.id))
    const freeUnlockedLimit = 2
    const maxVisibleInsights = isFreeTier ? freeUnlockedLimit : 6

    const summaryText = visibleGaps.length > 0
        ? (lang === 'el'
            ? `${confidence.summary.el} Εντοπίστηκαν ${visibleGaps.length} σημεία προς έλεγχο.`
            : `${confidence.summary.en} ${visibleGaps.length} points were identified for review.`)
        : (lang === 'el' ? `${confidence.summary.el} Δεν εντοπίστηκαν κενά.` : `${confidence.summary.en} No gaps detected.`)

    const insights: InsightData[] = useMemo(() => {
        return visibleGaps.slice(0, maxVisibleInsights).map((gap, index) => ({
            id: gap.id,
            type: (gap.policy?.lineOfBusiness || 'other').toLowerCase() as any,
            title: gap.title || (lang === 'el' ? 'Σημείο κάλυψης προς έλεγχο' : 'Coverage point to review'),
            whyItMatters: gap.description || (lang === 'el' ? 'Αυτό το σημείο επηρεάζει το επίπεδο προστασίας σας.' : 'This point affects your protection level.'),
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
            isPlusFeature: isFreeTier && index >= freeUnlockedLimit,
        }))
    }, [visibleGaps, maxVisibleInsights, lang, isFreeTier, freeUnlockedLimit, copy])

    const policiesWithIssues = new Set(gaps.map((g) => g.policyId).filter(Boolean))
    const policiesOk = policies.filter((p) => !policiesWithIssues.has(p.id))

    const handleAction = async (type: string, id: string, label: string) => {
        if (label === copy.ignore) {
            setHiddenInsights((prev) => new Set(prev).add(id))
            try {
                await updateGapStatus(id, 'dismissed')
                toast.success(copy.dismissSuccess)
            } catch {
                setHiddenInsights((prev) => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
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
        <div className="pw-page-shell">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10">
                <div className="mb-7 text-center">
                    <h1 className="pw-kicker mb-2">{copy.summaryTitle}</h1>
                    <p className="text-xl sm:text-2xl font-semibold text-black dark:text-white leading-tight">{summaryText}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    <div className={`rounded-2xl p-4 ${confidence.bg}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${confidence.color}`}>{confidence.label[lang]}</p>
                        <p className="text-sm text-black/85 dark:text-white/85">{confidence.desc[lang]}</p>
                    </div>
                    <div className="pw-card rounded-2xl p-4">
                        <p className="pw-kicker mb-1">{copy.policiesWithPoints}</p>
                        <p className="text-2xl font-semibold text-black dark:text-white">{policiesWithIssues.size}</p>
                    </div>
                    <div className="pw-card rounded-2xl p-4">
                        <p className="pw-kicker mb-1">{copy.totalPolicies}</p>
                        <p className="text-2xl font-semibold text-black dark:text-white">{stats.totalPolicies}</p>
                    </div>
                </div>

                {isFreeTier && (
                    <div className="mb-8 rounded-2xl border border-[#1FDC86]/35 bg-[#1FDC86]/10 dark:bg-[#1FDC86]/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-black dark:text-[#1FDC86] mt-0.5" />
                            <div>
                                <p className="font-semibold text-black dark:text-white">{copy.liteTitle}</p>
                                <p className="text-sm text-black/75 dark:text-white/80">{copy.liteDescription}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/upgrade?reason=feature_locked')}
                            className="pw-primary-button text-sm cursor-pointer"
                        >
                            <Crown className="w-4 h-4" />
                            {copy.upgrade}
                        </button>
                    </div>
                )}

                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-black dark:text-white mb-5 flex items-center gap-2">
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
                            <div className="text-center py-10 pw-card rounded-3xl">
                                <Sparkles className="w-8 h-8 text-[#1FDC86] mx-auto mb-3" />
                                <p className="text-black dark:text-white font-semibold">{copy.allGoodTitle}</p>
                                <p className="text-black/55 dark:text-white/65 text-sm">{copy.allGoodDescription}</p>
                            </div>
                        )}
                    </div>
                </div>

                {policiesOk.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-sm font-semibold text-black/55 dark:text-white/60 uppercase tracking-widest mb-3 px-1">{copy.checkedAndGood}</h3>
                        <div className="pw-card rounded-2xl divide-y divide-black/10 dark:divide-white/10">
                            {policiesOk.map((policy) => (
                                <div key={policy.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#1FDC86]/15 flex items-center justify-center text-[#1FDC86]">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-black dark:text-white text-sm">{policy.lineOfBusiness?.name || (lang === 'el' ? 'Ασφαλιστήριο' : 'Policy')}</div>
                                            <div className="text-xs text-black/55 dark:text-white/60">{policy.insurerName}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-black/70 dark:text-white/75 bg-black/5 dark:bg-white/10 px-2 py-1 rounded">OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-black/10 dark:border-white/10 text-center">
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-4">{copy.nextSteps}</h3>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                        <button
                            onClick={() => router.push('/wallet')}
                            className="flex-1 py-3.5 bg-[#1FDC86] text-white rounded-xl font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>{copy.backToWallet}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => router.push(isFreeTier ? '/upgrade?reason=feature_locked' : '/account')}
                            className="flex-1 py-3.5 bg-transparent border border-black/15 dark:border-white/20 text-black dark:text-white rounded-xl font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Activity className="w-4 h-4" />
                            {isFreeTier ? copy.unlockFull : copy.coverageSettings}
                        </button>
                    </div>
                    <p className="text-xs text-black/45 dark:text-white/55 mt-5 max-w-md mx-auto leading-relaxed">{copy.independentNote}</p>
                </div>
            </div>
        </div>
    )
}
