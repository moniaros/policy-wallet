"use client"

import { getTranslations } from "@/lib/i18n"
import { gapSeverityRank } from "@/lib/wallet/gap-report"
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
import { AiDisclaimer } from '@/components/ui/AiDisclaimer'
import { displayInsurerName } from '@/lib/wallet/policy-identity'

type PlanTier = 'free' | 'plus' | 'pro'

interface CoverageInsightsClientProps {
    gaps: any[]
    stats: {
        critical: number
        high: number
        medium: number
        low: number
        totalGaps: number
        totalPolicies: number
        totalCoverage: number
    }
    /** Lapsed policies deliberately left out of the coverage picture. */
    excludedExpired?: Array<{ id: string; label: string }>
    userLanguage: string
    tier: PlanTier
    isPaid: boolean
    /** ≥1 active policy exists. */
    hasPolicies?: boolean
    /** Deep gap analysis ran (Policy.lastAnalyzedAt set) — so 0 gaps means clean, not un-analyzed. */
    hasDeepAnalysis?: boolean
    /** Deep gap analysis is a Plus feature the current tier can't run. */
    isDeepAnalysisLocked?: boolean
    canUseAgentCollaboration: boolean
    policies?: Array<{
        id: string
        insurerName: string
        lineOfBusiness: { code: string; name: string }
    }>
}

export function CoverageInsightsClient({
    excludedExpired = [],
    gaps,
    stats,
    userLanguage,
    tier,
    isPaid,
    hasPolicies = true,
    hasDeepAnalysis = false,
    isDeepAnalysisLocked = false,
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
        policiesWithPoints: lang === 'el' ? 'Ασφαλιστήρια με σημεία ελέγχου' : 'Policies with points',
        totalPolicies: lang === 'el' ? 'Ενεργά ασφαλιστήρια' : 'Active policies',
        expiredExcludedTitle: lang === 'el'
            ? 'Ληγμένα ασφαλιστήρια δεν προσμετρώνται στην κάλυψη'
            : 'Expired policies are not counted as coverage',
        expiredExcludedBody: lang === 'el'
            ? 'Η εικόνα κάλυψης αφορά μόνο όσα ισχύουν σήμερα. Εκτός:'
            : 'This coverage picture reflects only what is in force today. Excluded:',
        dismissSuccess: lang === 'el' ? 'Η σύσταση αποκρύφτηκε' : 'Insight dismissed',
        dismissFail: lang === 'el' ? 'Αποτυχία ενημέρωσης' : 'Failed to update',
        noLinkedPolicy: lang === 'el' ? 'Δεν βρέθηκε συνδεδεμένο ασφαλιστήριο' : 'No linked policy found',
        reviewPolicy: lang === 'el' ? 'Προβολή ασφαλιστηρίου' : 'Review policy',
        addNote: lang === 'el' ? 'Σημείωση' : 'Add note',
        ignore: lang === 'el' ? 'Αγνόηση' : 'Ignore',
        immediateReview: lang === 'el' ? 'Συνιστάται άμεσος έλεγχος' : 'Immediate review recommended',
        noImmediateAction: lang === 'el' ? 'Δεν απαιτείται άμεση ενέργεια' : 'No immediate action required',
        // Add-first-policy state (no policies yet)
        addFirstTitle: lang === 'el' ? 'Προσθέστε το πρώτο σας ασφαλιστήριο' : 'Add your first policy',
        addFirstBody: lang === 'el' ? 'Προσθέστε ένα ασφαλιστήριο για να δείτε την εικόνα κάλυψής σας.' : 'Add a policy to see your coverage picture.',
        addFirstCta: lang === 'el' ? 'Προσθήκη ασφαλιστηρίου' : 'Add a policy',
        // Not-yet-deep-analyzed state (replaces a false "no gaps")
        notAnalyzedTitle: lang === 'el' ? 'Δεν έχει γίνει ακόμη πλήρης ανάλυση' : 'No full analysis yet',
        notAnalyzedBody: lang === 'el'
            ? 'Τρέξτε πλήρη ανάλυση για να ελεγχθούν τα ασφαλιστήριά σας για κενά.'
            : 'Run a full analysis to check your policies for gaps.',
        notAnalyzedLockedCta: lang === 'el' ? 'Ξεκλείδωμα με Plus' : 'Unlock with Plus',
        notAnalyzedRefreshHint: lang === 'el' ? 'Ανεβάστε ή ανανεώστε ένα ασφαλιστήριο για να ξεκινήσει.' : 'Upload or refresh a policy to start it.',
        unknownCount: '—',
    }

    const visibleGaps = gaps.filter((g) => !hiddenInsights.has(g.id))
    const freeUnlockedLimit = 2
    const maxVisibleInsights = isFreeTier ? freeUnlockedLimit : 6
    const hasSevereGap = visibleGaps.some((g) => g.severity === 'critical' || g.severity === 'high')

    // Concept B — policy-gap verdict. The SINGLE source for the headline + the
    // top tile, gated on whether deep analysis actually ran so "0 gaps" never
    // masquerades as "clean" when the Plus-gated pipeline never ran. (The
    // profile protection SCORE was removed from the product in Aug 2026 and
    // no longer exists on any policyholder surface.)
    const gapVerdict = !hasDeepAnalysis
        ? {
            label: { el: 'Εκκρεμεί', en: 'Pending' },
            desc: {
                el: 'Δεν έχει γίνει ακόμη πλήρης ανάλυση κενών.',
                en: 'A full gap analysis has not run yet.',
            },
            summary: isDeepAnalysisLocked
                ? { el: 'Δεν έχει γίνει ακόμη πλήρης ανάλυση κενών — ξεκλειδώστε την με το Plus.', en: "Full gap analysis hasn't run yet — unlock it with Plus." }
                : { el: 'Η ανάλυση κενών εκκρεμεί — ανεβάστε ή ανανεώστε ένα ασφαλιστήριο.', en: 'Gap analysis pending — upload or refresh a policy.' },
            color: 'text-black/60 dark:text-white/60',
            bg: 'bg-black/5 dark:bg-white/10',
        }
        : visibleGaps.length === 0
            ? {
                label: { el: 'Επαρκής', en: 'Adequate' },
                desc: {
                    el: 'Δεν βρέθηκαν προβλήματα στα ενεργά σας ασφαλιστήρια.',
                    en: 'No issues found in your active policies.',
                },
                summary: { el: 'Δεν εντοπίστηκαν κενά στα ενεργά σας ασφαλιστήρια.', en: 'No gaps found in your active policies.' },
                color: 'text-[#166534] dark:text-mint',
                bg: 'bg-primary-soft dark:bg-primary/15',
            }
            : hasSevereGap
                ? {
                    label: { el: 'Χρειάζεται προσοχή', en: 'Needs attention' },
                    desc: {
                        el: 'Υπάρχουν σημαντικά σημεία που αξίζει να ελέγξετε.',
                        en: 'There are important points worth reviewing.',
                    },
                    summary: {
                        el: `Εντοπίστηκαν ${visibleGaps.length} σημεία προς έλεγχο στα ασφαλιστήριά σας.`,
                        en: `${visibleGaps.length} points to review across your policies.`,
                    },
                    // The BACKGROUND flipped to dark while the text stayed
                    // red-700 — measured 2.83:1 by the pixel audit. Exactly the
                    // "text keeps the previous theme's colour" class.
                    color: 'text-red-700 dark:text-red-300',
                    bg: 'bg-red-100 dark:bg-red-900/30',
                }
                : {
                    label: { el: 'Σχεδόν έτοιμη', en: 'Almost there' },
                    desc: {
                        el: 'Λίγα σημεία προς βελτίωση.',
                        en: 'A few minor points to improve.',
                    },
                    summary: {
                        el: `Εντοπίστηκαν ${visibleGaps.length} σημεία προς έλεγχο στα ασφαλιστήριά σας.`,
                        en: `${visibleGaps.length} points to review across your policies.`,
                    },
                    // Same defect as the red variant above.
                    color: 'text-amber-700 dark:text-amber-300',
                    bg: 'bg-amber-100 dark:bg-amber-900/30',
                }

    const summaryText = gapVerdict.summary[lang]

    const insights: InsightData[] = useMemo(() => {
        // Most severe first, THEN cut to the visible/free limit. The gaps arrive
        // in detectedAt order, so slicing raw showed a free owner their two most
        // RECENT gaps and locked the rest — a critical gap detected last week
        // could sit behind the Plus gate while two trivial recent ones showed.
        // Stable sort keeps detectedAt order within a severity band.
        const orderedGaps = [...visibleGaps].sort(
            (a, b) => gapSeverityRank(a.severity) - gapSeverityRank(b.severity)
        )
        return orderedGaps.slice(0, maxVisibleInsights).map((gap, index) => ({
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

    // No policies at all → nothing to assess. Show a single "add your first
    // policy" state instead of a score-0 / "no gaps detected" contradiction.
    if (!hasPolicies) {
        return (
            <div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10">
                    <div className="mb-7 text-center">
                        <h1 className="pw-kicker mb-2">{copy.summaryTitle}</h1>
                        <p className="text-xl sm:text-2xl font-semibold text-black dark:text-white leading-tight">{copy.addFirstBody}</p>
                    </div>
                    <div className="text-center py-10 pw-card">
                        <Sparkles className="w-8 h-8 text-primary dark:text-mint mx-auto mb-3" />
                        <p className="text-black dark:text-white font-semibold">{copy.addFirstTitle}</p>
                        <p className="text-muted-foreground text-sm mb-5">{copy.addFirstBody}</p>
                        <button onClick={() => router.push('/wallet/add')} className="pw-primary-button text-sm cursor-pointer mx-auto">
                            {copy.addFirstCta}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        // No page shell here — the coverage-insights route provides the single
        // shared `.pw-page-shell` so the sections don't each claim a full screen.
        <div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10">
                <div className="mb-7 text-center">
                    <h1 className="pw-kicker mb-2">{copy.summaryTitle}</h1>
                    <p className="text-xl sm:text-2xl font-semibold text-black dark:text-white leading-tight">{summaryText}</p>
                </div>

                {excludedExpired.length > 0 && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                {copy.expiredExcludedTitle}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                                {copy.expiredExcludedBody} {excludedExpired.map((policy) => policy.label).join(' · ')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    <div className={`rounded-2xl p-4 ${gapVerdict.bg}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${gapVerdict.color}`}>{gapVerdict.label[lang]}</p>
                        <p className="text-sm text-black/85 dark:text-white/85">{gapVerdict.desc[lang]}</p>
                    </div>
                    <div className="pw-card rounded-2xl p-4">
                        <p className="pw-kicker mb-1">{copy.policiesWithPoints}</p>
                        <p className="text-2xl font-semibold text-black dark:text-white">{hasDeepAnalysis ? policiesWithIssues.size : copy.unknownCount}</p>
                    </div>
                    <div className="pw-card rounded-2xl p-4">
                        <p className="pw-kicker mb-1">{copy.totalPolicies}</p>
                        <p className="text-2xl font-semibold text-black dark:text-white">{stats.totalPolicies}</p>
                    </div>
                </div>

                {isFreeTier && (
                    <div className="mb-8 rounded-2xl border border-primary/35 bg-primary-tint dark:bg-primary/15 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary dark:text-mint mt-0.5" />
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

                    {/* InsightCard badges read "Κρίσιμο κενό". Without this line
                        that is a risk verdict; with it, it is what the engine
                        actually produced — a profile-based priority. The same
                        sentence already qualifies the dashboard widget and the
                        recommendations list. */}
                    {insights.length > 0 && (
                        <p className="mb-3 text-caption leading-snug text-muted-foreground">
                            {getTranslations(lang).dashboard.home.recPriorityNote}
                        </p>
                    )}

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
                        ) : !hasDeepAnalysis ? (
                            <div className="text-center py-10 pw-card">
                                <Lock className="w-8 h-8 text-primary dark:text-mint mx-auto mb-3" />
                                <p className="text-black dark:text-white font-semibold">{copy.notAnalyzedTitle}</p>
                                <p className="text-muted-foreground text-sm mb-5">{copy.notAnalyzedBody}</p>
                                {isDeepAnalysisLocked ? (
                                    <button
                                        onClick={() => router.push('/upgrade?reason=feature_locked')}
                                        className="pw-primary-button text-sm cursor-pointer mx-auto"
                                    >
                                        <Crown className="w-4 h-4" />
                                        {copy.notAnalyzedLockedCta}
                                    </button>
                                ) : (
                                    <p className="text-xs text-muted-foreground">{copy.notAnalyzedRefreshHint}</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-10 pw-card">
                                <Sparkles className="w-8 h-8 text-primary dark:text-mint mx-auto mb-3" />
                                <p className="text-black dark:text-white font-semibold">{copy.allGoodTitle}</p>
                                <p className="text-muted-foreground text-sm">{copy.allGoodDescription}</p>
                            </div>
                        )}
                    </div>
                </div>

                {hasDeepAnalysis && policiesOk.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">{copy.checkedAndGood}</h3>
                        <div className="pw-card rounded-2xl divide-y divide-black/10 dark:divide-white/10">
                            {policiesOk.map((policy) => (
                                <div key={policy.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center text-[#166534] dark:text-mint">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-black dark:text-white text-sm">{policy.lineOfBusiness?.name || (lang === 'el' ? 'Ασφαλιστήριο' : 'Policy')}</div>
                                            <div className="text-xs text-muted-foreground">{displayInsurerName(policy.insurerName)}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-black/70 dark:text-white/75 bg-black/5 dark:bg-white/10 px-2 py-1 rounded">OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <AiDisclaimer language={lang} className="mb-6 justify-center" />

                <div className="pt-6 border-t border-black/10 dark:border-white/10 text-center">
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-4">{copy.nextSteps}</h3>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                        <button
                            onClick={() => router.push('/wallet')}
                            className="flex-1 py-3.5 bg-primary text-white dark:text-[#1A2420] rounded-xl font-semibold transition-colors hover:bg-primary-hover flex items-center justify-center gap-2 cursor-pointer"
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
                    <p className="text-xs text-muted-foreground mt-5 max-w-md mx-auto leading-relaxed">{copy.independentNote}</p>
                </div>
            </div>
        </div>
    )
}
