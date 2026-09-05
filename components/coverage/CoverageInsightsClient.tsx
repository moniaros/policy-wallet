"use client"

import { getTranslations } from "@/lib/i18n"
import { mayCarryEmphasis, orderByProvenance, provenanceOf } from "@/lib/gaps/provenance"
import { provenanceLabel } from "@/components/gaps/provenance-label"
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
import { updateGapStatus } from '@/app/(protected)/protection/actions'
import { toast } from 'sonner'
import { AiDisclaimer } from '@/components/ui/AiDisclaimer'
import { displayInsurerName } from '@/lib/wallet/policy-identity'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { CardHead } from '@/components/dashboard/home/CardHead'

/** The authored slug a finding row carries, on either shape the loaders return. */
const gapSlug = (g: { slug?: string | null; definition?: { slug?: string | null } | null }) => g.slug ?? g.definition?.slug ?? null

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
    /**
     * Mounted inside another surface (/protection, V2-P2-01b): the parent owns
     * the page container, so drop this component's own width/padding frame and
     * step the section heading down a level. Since V2-P2-03 removed
     * /coverage-insights, /protection is the only mount — the standalone
     * rendering survives for tests and any future standalone use.
     */
    embedded?: boolean
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
    embedded = false,
    policies = []
}: CoverageInsightsClientProps) {
    const lang = userLanguage === 'el' ? 'el' : 'en'
    const router = useRouter()
    // Standalone (/coverage-insights) frames itself; embedded (/protection)
    // inherits the parent's `.pw-page-shell` container — doubling the frame
    // doubled the horizontal padding at 320px.
    const containerClass = embedded ? "" : "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10"
    const Heading = (embedded ? "h2" : "h1") as "h1" | "h2"
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
        checkedOkPill: lang === 'el' ? 'Εντάξει' : 'OK',
        nextSteps: lang === 'el' ? 'Επόμενα βήματα' : 'Next steps',
        backToWallet: lang === 'el' ? 'Επιστροφή στο πορτοφόλι' : 'Back to wallet',
        unlockFull: lang === 'el' ? 'Ξεκλείδωσε πλήρη ανάλυση' : 'Unlock full analysis',
        coverageSettings: lang === 'el' ? 'Ρυθμίσεις κάλυψης' : 'Coverage settings',
        independentNote: lang === 'el'
            ? 'Το PolicyWallet παραμένει ανεξάρτητη πλατφόρμα που υποστηρίζει καλύτερες αποφάσεις κάλυψης.'
            : 'PolicyWallet remains an independent platform designed to support better coverage decisions.',
        policiesWithPoints: lang === 'el' ? 'Ασφαλιστήρια με σημεία ελέγχου' : 'Policies with points',
        // «Σε ισχύ σήμερα», not «Ενεργά»: this tile counts isPolicyCoverageActive
        // (includes expiring-soon and unreadable-term cover), while the wallet's
        // «Ενεργά» tile counts the strict lifecycle state. Two facts were
        // sharing one name across two surfaces (§2.8) — the labels now say
        // which is which.
        totalPolicies: lang === 'el' ? 'Σε ισχύ σήμερα' : 'In force today',
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
        // Pro, not Plus. The gate is `entitlements.tier !== 'pro'`, so Plus does
        // NOT unlock deep analysis — this CTA promised that buying Plus would,
        // which is a claim the code does not support, made at the moment it
        // induces the purchase. Whether the feature SHOULD sit behind Pro is
        // H-009 and the owner's call; naming the plan that actually clears the
        // gate is not. Guarded by locked-cta-names-the-real-tier.test.ts.
        // Tier-agnostic on purpose (Sept 2026): the predicate that decides deep
        // analysis (canRunDeepAnalysis) and the written decisions about which
        // plan should clear it disagree — see lib/monetization/feature-gates.ts.
        // Until the owner settles it, the sentence names the feature, and the
        // upgrade modal names the plan the gate actually requires.
        notAnalyzedLockedCta: lang === 'el' ? 'Ξεκλείδωμα πλήρους ανάλυσης' : 'Unlock full analysis',
        notAnalyzedRefreshHint: lang === 'el' ? 'Ανεβάστε ή ανανεώστε ένα ασφαλιστήριο για να ξεκινήσει.' : 'Upload or refresh a policy to start it.',
        unknownCount: '—',
    }

    const visibleGaps = gaps.filter((g) => !hiddenInsights.has(g.id))
    const freeUnlockedLimit = 2
    const maxVisibleInsights = isFreeTier ? freeUnlockedLimit : 6
    // Emphasis follows provenance (B3), never severity: only a legal or a
    // contractual requirement may raise the headline.
    const hasSevereGap = visibleGaps.some((g) => mayCarryEmphasis(provenanceOf(gapSlug(g))))
    // R3: a headline count never includes under-review findings unlabelled.
    const classifiedCount = visibleGaps.filter((g) => provenanceOf(gapSlug(g)) !== 'under_review').length
    const underReviewCount = visibleGaps.length - classifiedCount
    const headlineEl = classifiedCount > 0
        ? `Εντοπίστηκαν ${classifiedCount} σημεία προς έλεγχο στα ασφαλιστήριά σας${underReviewCount > 0 ? ` — και ${underReviewCount} υπό αξιολόγηση, που δεν έχουν ταξινομηθεί ακόμη` : ''}.`
        : `${underReviewCount} σημεία υπό αξιολόγηση στα ασφαλιστήριά σας — δεν έχουν ταξινομηθεί ακόμη, οπότε δεν μετρούν ως ευρήματα.`
    const headlineEn = classifiedCount > 0
        ? `${classifiedCount} points to review across your policies${underReviewCount > 0 ? ` — and ${underReviewCount} under review, not yet classified` : ''}.`
        : `${underReviewCount} points under review across your policies — not yet classified, so not counted as findings.`

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
            color: 'text-muted-foreground',
            bg: 'pw-subcard',
        }
        : visibleGaps.length === 0
            ? {
                label: { el: 'Επαρκής', en: 'Adequate' },
                desc: {
                    el: 'Δεν βρέθηκαν προβλήματα στα ενεργά σας ασφαλιστήρια.',
                    en: 'No issues found in your active policies.',
                },
                summary: { el: 'Δεν εντοπίστηκαν κενά στα ενεργά σας ασφαλιστήρια.', en: 'No gaps found in your active policies.' },
                color: 'text-status-success',
                bg: 'bg-status-success-tint',
            }
            : hasSevereGap
                ? {
                    label: { el: 'Χρειάζεται προσοχή', en: 'Needs attention' },
                    desc: {
                        el: 'Υπάρχουν σημαντικά σημεία που αξίζει να ελέγξετε.',
                        en: 'There are important points worth reviewing.',
                    },
                    summary: {
                        el: headlineEl,
                        en: headlineEn,
                    },
                    // Status tokens: the tint and its on-colour are declared as
                    // a pair in globals.css (@on … @min 4.5), so light/dark
                    // contrast is measured once there — the previous hand-picked
                    // red-700-on-dark pair measured 2.83:1.
                    color: 'text-status-danger',
                    bg: 'bg-status-danger-tint',
                }
                : {
                    label: { el: 'Σχεδόν έτοιμη', en: 'Almost there' },
                    desc: {
                        el: 'Λίγα σημεία προς βελτίωση.',
                        en: 'A few minor points to improve.',
                    },
                    summary: {
                        el: headlineEl,
                        en: headlineEn,
                    },
                    color: 'text-status-warning',
                    bg: 'bg-status-warning-tint',
                }

    const summaryText = gapVerdict.summary[lang]

    const insights: InsightData[] = useMemo(() => {
        // Most severe first, THEN cut to the visible/free limit. The gaps arrive
        // in detectedAt order, so slicing raw showed a free owner their two most
        // RECENT gaps and locked the rest — a critical gap detected last week
        // could sit behind the Plus gate while two trivial recent ones showed.
        // Stable sort keeps detectedAt order within a severity band.
        const orderedGaps = orderByProvenance(visibleGaps, (g) => gapSlug(g))
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
            microcopy: provenanceLabel(provenanceOf(gapSlug(gap)), getTranslations(lang).provenance),
            isPlusFeature: isFreeTier && index >= freeUnlockedLimit,
        }))
    }, [visibleGaps, maxVisibleInsights, lang, isFreeTier, freeUnlockedLimit, copy])

    const policiesWithIssues = new Set(gaps.map((g) => g.policyId).filter(Boolean))
    const policiesOk = policies.filter((p) => !policiesWithIssues.has(p.id))

    // A-11 — the severity tally. Same universe as the headline count
    // (visibleGaps: the shared gapsOnActiveCoverage selection, minus local
    // dismissals), so the chips always sum to gap.openCount. Order and tone
    // come from describeSeverity() — never a hand-rolled map (Gate 3b); the
    // caveat the primitive demands is the recPriorityNote already rendered
    // above the findings list, which is on-page whenever a chip is.
    const home = getTranslations(lang).dashboard.home

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
                <div className={`${containerClass} space-y-4`.trim()}>
                    <div className="pw-card pw-pad">
                        <CardHead icon={Shield} title={copy.summaryTitle} as={Heading} />
                        <p className="mt-4 text-title font-semibold leading-tight tracking-tight text-foreground">{copy.addFirstBody}</p>
                    </div>
                    <div className="pw-card pw-pad">
                        <div className="flex items-center gap-3">
                            <span className="pw-card-chip" aria-hidden="true">
                                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{copy.addFirstTitle}</p>
                        </div>
                        <button onClick={() => router.push('/wallet/add')} className="pw-primary-button mt-4 cursor-pointer">
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
            <div className={`${containerClass} space-y-4`.trim()}>
                <div className="pw-card pw-pad">
                    <CardHead icon={Shield} title={copy.summaryTitle} as={Heading} />
                    <p
                        className="mt-4 text-title font-semibold leading-tight tracking-tight text-foreground"
                        // «Εντοπίστηκαν 33 σημεία προς έλεγχο» is gap.openCount as
                        // prose — the same live-gap universe the dashboard's
                        // severity tally now sums to (gapsOnActiveCoverage), so
                        // the two surfaces state one number under one key.
                        data-count={hasDeepAnalysis && visibleGaps.length > 0 ? "gap.openCount" : undefined}
                    >
                        {summaryText}
                    </p>

                    {excludedExpired.length > 0 && (
                        <div className="mt-4 flex items-start gap-3 rounded-xl bg-status-warning-tint p-3.5">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-status-warning">
                                    {copy.expiredExcludedTitle}
                                </p>
                                <p className="mt-0.5 text-caption leading-relaxed text-foreground/80">
                                    {copy.expiredExcludedBody} {excludedExpired.map((policy) => policy.label).join(' · ')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Three fact cells on the sunken surface: the verdict on its
                        status tint, the two counts as caption-over-number. */}
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className={`rounded-xl px-3.5 py-3 ${gapVerdict.bg}`}>
                            <p className={`text-caption font-semibold ${gapVerdict.color}`}>{gapVerdict.label[lang]}</p>
                            <p className="mt-0.5 text-sm leading-snug text-foreground">{gapVerdict.desc[lang]}</p>
                        </div>
                        <div className="pw-subcard px-3.5 py-3">
                            <p className="text-caption font-medium text-muted-foreground">{copy.policiesWithPoints}</p>
                            <p
                                className="mt-0.5 text-title font-semibold tabular-nums text-foreground"
                                data-count={hasDeepAnalysis ? "portfolio.policiesWithFindingsCount" : undefined}
                            >
                                {hasDeepAnalysis ? policiesWithIssues.size : copy.unknownCount}
                            </p>
                        </div>
                        <div className="pw-subcard px-3.5 py-3">
                            <p className="text-caption font-medium text-muted-foreground">{copy.totalPolicies}</p>
                            {/* isPolicyCoverageActive — cover in force TODAY, which
                                also counts expiring-soon and unreadable-term cover.
                                NOT the wallet's «Ενεργά» (strict lifecycle active):
                                different predicate, different key, and the label
                                says which («Σε ισχύ σήμερα»). §2.8's labelling case. */}
                            <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground" data-count="portfolio.coverageActiveCount">
                                {stats.totalPolicies}
                            </p>
                        </div>
                    </div>
                </div>

                {isFreeTier && (
                    <div className="pw-card pw-pad flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="pw-card-chip" aria-hidden="true">
                                <Lock className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{copy.liteTitle}</p>
                                {/* «τα 2 πιο σημαντικά» is a PLAN limit, not a
                                    portfolio fact — its own key keeps it out of
                                    the gap-count comparisons. */}
                                <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground" data-count="entitlement.freeInsightLimit">{copy.liteDescription}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/upgrade?reason=feature_locked')}
                            className="pw-soft-button flex-shrink-0 cursor-pointer"
                        >
                            <Crown className="h-4 w-4" aria-hidden="true" />
                            {copy.upgrade}
                        </button>
                    </div>
                )}

                <div>
                    <h2 className="mb-2 text-body-lg font-semibold leading-snug tracking-tight text-foreground">
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
                            <div className="pw-card pw-pad">
                                <div className="flex items-start gap-3">
                                    <span className="pw-card-chip" aria-hidden="true">
                                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">{copy.notAnalyzedTitle}</p>
                                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.notAnalyzedBody}</p>
                                    </div>
                                </div>
                                {isDeepAnalysisLocked ? (
                                    <button
                                        onClick={() => router.push('/upgrade?reason=feature_locked')}
                                        className="pw-soft-button mt-4 cursor-pointer"
                                    >
                                        <Crown className="h-4 w-4" aria-hidden="true" />
                                        {copy.notAnalyzedLockedCta}
                                    </button>
                                ) : (
                                    <p className="mt-3 text-caption text-muted-foreground">{copy.notAnalyzedRefreshHint}</p>
                                )}
                            </div>
                        ) : (
                            <div className="pw-card pw-pad">
                                <div className="flex items-start gap-3">
                                    <span className="pw-card-chip text-status-success" aria-hidden="true">
                                        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">{copy.allGoodTitle}</p>
                                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.allGoodDescription}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* The h3 stays a direct child of the card: the ledger guard
                    (A-13) reads the list as the heading's parent element. */}
                {hasDeepAnalysis && policiesOk.length > 0 && (
                    <div className="pw-card pw-pad">
                        <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">{copy.checkedAndGood}</h3>
                        <ul className="mt-3 divide-y divide-border">
                            {policiesOk.map((policy) => (
                                <li key={policy.id} className="flex min-h-11 items-center gap-3 py-3 first:pt-0 last:pb-0">
                                    <span className="pw-card-chip text-status-success" aria-hidden="true">
                                        <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        {/* The branch's localised label, never the stored
                                            slug: `lineOfBusiness.name` is whatever the
                                            extractor wrote («health», «motor»), and the
                                            wallet renders branches through the taxonomy. */}
                                        <span className="block text-sm font-semibold text-foreground">
                                            {normalizeBranch(policy.lineOfBusiness?.code || policy.lineOfBusiness?.name).label[lang]}
                                        </span>
                                        <span className="mt-0.5 block text-caption text-muted-foreground">{displayInsurerName(policy.insurerName)}</span>
                                    </span>
                                    <span className="flex-shrink-0 rounded-full bg-status-success-tint px-2.5 py-1 text-caption font-semibold text-status-success">
                                        {copy.checkedOkPill}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <AiDisclaimer language={lang} />

                <div className="pw-card pw-pad">
                    <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">{copy.nextSteps}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            onClick={() => router.push('/wallet')}
                            className="pw-soft-button cursor-pointer"
                        >
                            <span>{copy.backToWallet}</span>
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => router.push(isFreeTier ? '/upgrade?reason=feature_locked' : '/account')}
                            className="pw-soft-button cursor-pointer"
                        >
                            <Activity className="h-4 w-4" aria-hidden="true" />
                            {isFreeTier ? copy.unlockFull : copy.coverageSettings}
                        </button>
                    </div>
                    <p className="mt-3 text-caption leading-relaxed text-muted-foreground">{copy.independentNote}</p>
                </div>
            </div>
        </div>
    )
}
