"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"
import { DeletePolicyDialog } from "@/components/wallet/DeletePolicy"
import { PolicyHeaderMenu } from "@/components/wallet/policy-detail/PolicyHeaderMenu"
import { PolicyAnalysisTabs } from "@/app/(protected)/wallet/[id]/PolicyAnalysisTabs"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { AIUsageWidget } from "@/app/(protected)/wallet/[id]/AIUsageWidget"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { CoverageTabView } from "@/components/wallet/coverage-details/CoverageTabView"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { PolicySectionNav, type PolicySectionNavItem } from "@/components/wallet/policy-detail/PolicySectionNav"
import { PolicyHero } from "@/components/wallet/policy-detail/PolicyHero"
import { SummaryCard } from "@/components/wallet/policy-detail/SummaryCard"
import { KeyDatesCard } from "@/components/wallet/policy-detail/KeyDatesCard"
import { ExclusionsCard } from "@/components/wallet/policy-detail/ExclusionsCard"
import { PerksCard } from "@/components/wallet/policy-detail/PerksCard"
import { ClaimsGuidanceCard } from "@/components/wallet/policy-detail/ClaimsGuidanceCard"
import { DocumentsCard } from "@/components/wallet/policy-detail/DocumentsCard"
import { InsuredPeopleCard } from "@/components/wallet/policy-detail/InsuredPeopleCard"
import {
    calculatePolicyHealthScore,
    deriveClaimDeadlines,
    derivePolicyMeta,
    extractPolicySections,
    hasAutoRenewal,
    normalizeRenewalHistory,
    parsePolicyDate,
    type PolicyRenewalEntry,
} from "@/lib/wallet/policy-detail"
import { AlertTriangle, Crown, FileDown, Lock, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { PremiumInsightCards } from "@/components/monetization/PremiumInsightCards"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import { FREE_GAP_PREVIEW_COUNT, type GapReportItem } from "@/lib/wallet/gap-report"

// Trigger J: savings-report export (Pro). Bilingual copy kept as a pair map
// so the changed-file i18n lint stays clean.
const EXPORT_COPY = {
    title: { el: "Αναφορά εξοικονόμησης", en: "Savings report" },
    subtitle: {
        el: "Κατέβασε μια καθαρή σύνοψη καλύψεων, κενών και πιθανής εξοικονόμησης για αυτό το συμβόλαιο.",
        en: "Download a clean summary of coverages, gaps and potential savings for this policy.",
    },
    exportCta: { el: "Εξαγωγή αναφοράς", en: "Export report" },
    unlockCta: { el: "Ξεκλείδωμα εξαγωγής αναφοράς", en: "Unlock report export" },
} as const

function pickCopy(pair: { el: string; en: string }, lang: "el" | "en") {
    return pair[lang]
}

interface PolicyDetailsClientProps {
    policy: any
    serializedShares: any[]
    aiUsageStats: {
        count: number
        limit: number | null
        remaining?: number | null
        creditBalance?: number
    }
    statusLabel: string
    statusColor: any
    daysLeft: number | null
    isOwner: boolean
    relationshipId?: string | null
    t: any
    tier?: 'free' | 'plus' | 'pro'
    tierLimits?: {
        interactiveQA: boolean
        advancedAnalytics: boolean
        agentCollaboration: boolean
        analysisComparison: boolean
        notifications: boolean
        [key: string]: any
    }
    relatedRecommendations?: any[]
    renewals?: PolicyRenewalEntry[]
    gapReportItems?: GapReportItem[]
    reportUnlocked?: boolean
}

export function PolicyDetailsClient({
    policy,
    serializedShares,
    aiUsageStats,
    statusLabel,
    statusColor,
    daysLeft,
    isOwner,
    relationshipId,
    t,
    tier = 'free',
    tierLimits,
    relatedRecommendations = [],
    renewals = [],
    gapReportItems = [],
    reportUnlocked = true,
}: PolicyDetailsClientProps) {
    const locale = t.common?.locale || "en-US"
    const lang: "el" | "en" = locale.startsWith("el") ? "el" : "en"
    const detailsCopy = t.wallet.policyDetailsPage

    const pathname = usePathname()
    const [exportUpgradeOpen, setExportUpgradeOpen] = useState(false)
    const [isRequestingQuote, setIsRequestingQuote] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const handleRequestQuote = async () => {
        if (isRequestingQuote) return
        setIsRequestingQuote(true)
        try {
            const { requestRenewalQuote } = await import("@/app/(protected)/wallet/actions")
            const result = await requestRenewalQuote(policy.id)
            if (result.error) {
                toast.error(detailsCopy.quoteRequestFailed)
            } else {
                toast.success(result.agentNotified ? detailsCopy.quoteRequestedAgent : detailsCopy.quoteRequested)
            }
        } catch {
            toast.error(detailsCopy.quoteRequestFailed)
        } finally {
            setIsRequestingQuote(false)
        }
    }

    const canUseCollaboration = tierLimits?.agentCollaboration !== false
    const canShowCollaborationPanel = (isOwner || (serializedShares?.length ?? 0) > 0) && canUseCollaboration
    const isFreeTier = tier === 'free'
    const canShowCollaborationTimeline = Boolean(relationshipId) && canUseCollaboration && !isFreeTier

    // Raw extracted value — pending-placeholder checks run against THIS;
    // display goes through the insurer registry (canonical Greek-market name).
    const getInsurerName = () => policy.acordData?.policy?.insurerName || policy.insurerName
    const getPolicyNumber = () => policy.acordData?.policy?.policyNumber || policy.policyNumber
    const getCoverageType = () => policy.acordData?.policy?.lineOfBusiness || policy.lineOfBusiness
    const getPremiumAmount = () => {
        const extractedPremium = policy.acordData?.policy?.premium?.amount
        if (extractedPremium) return Number(extractedPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }
    const getPremiumCurrency = () => policy.acordData?.policy?.premium?.currency || policy.premiumCurrency || "EUR"

    // Newest-first past policy periods recorded by re-uploads; the latest
    // renewal's end date supersedes the originally extracted expiration.
    const renewalHistory = useMemo(() => normalizeRenewalHistory(policy?.acordData), [policy])
    const latestRenewalEnd = parsePolicyDate(renewalHistory[0]?.endDate)
    const { renewalDate, premiumFrequency } = derivePolicyMeta(policy?.acordData)

    const getStartDate = () => policy.acordData?.policy?.effectiveDate || policy.startDate
    const getEndDate = () => {
        if (latestRenewalEnd) return latestRenewalEnd.toISOString()
        return policy.acordData?.policy?.expirationDate || policy.endDate
    }

    // null when no trustworthy end date exists — never the server's DB-column
    // days (the column can hold the historical upload placeholder).
    const computedDaysLeft: number | null = (() => {
        const end = parsePolicyDate(getEndDate())
        if (!end) return daysLeft ?? null
        return Math.floor((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    })()
    const isExpiredPolicy = computedDaysLeft !== null && computedDaysLeft < 0

    const insuredNames = useMemo(
        () =>
            Array.from(
                new Set(
                    [
                        policy?.acordData?.insured?.name,
                        policy?.acordData?.policyholder?.name,
                        policy?.acordData?.policy?.insuredName,
                        policy?.acordData?.customerName && policy?.acordData?.customerSurname
                            ? `${policy.acordData.customerName} ${policy.acordData.customerSurname}`
                            : null,
                        ...(Array.isArray(policy?.acordData?.insureds)
                            ? policy.acordData.insureds.map((i: any) => i?.name || `${i?.firstName || ""} ${i?.lastName || ""}`)
                            : []),
                        ...(Array.isArray(policy?.acordData?.beneficiaries)
                            ? policy.acordData.beneficiaries.map((i: any) => i?.name)
                            : []),
                    ]
                        .map((v) => String(v || "").trim())
                        .filter(Boolean)
                )
            ),
        [policy]
    )

    const insurerPhone = policy.acordData?.policy?.insurerContact || ""
    const firstDocumentUrl = policy.documents?.[0]?.fileUrl

    // ── Extracted section data (perks / exclusions / conditions / fine print) ──
    const { exclusions, notableConditions, finePrintClauses: finePrint, perks } = useMemo(
        () => extractPolicySections(policy?.acordData),
        [policy]
    )
    const claimDeadlines = deriveClaimDeadlines(notableConditions)
    const autoRenewal = hasAutoRenewal(notableConditions)
    const coverageCount = Array.isArray(policy.acordData?.coverages) ? policy.acordData.coverages.length : 0
    const conditionsCount = notableConditions.length + finePrint.length

    // Deduped count — must agree with the summary band and the tab badge.
    const health = calculatePolicyHealthScore({
        gapCount: gapReportItems.length,
        exclusionCount: exclusions.length,
        verified: Boolean(policy.verified),
    })

    const hasCoverageDetails = (() => {
        const line = getCoverageType()
        const typeSpecificFields = ["health", "motor", "home", "life", "pet"] as const
        const hasTypeData = typeSpecificFields.some(
            (field) => line === field && policy.acordData?.[field] && Object.keys(policy.acordData[field]).length > 0
        )
        const hasCoverageOrExclusion = (policy.acordData?.coverages?.length > 0) || (policy.acordData?.exclusions?.length > 0)
        return hasTypeData || hasCoverageOrExclusion
    })()

    const shouldShowReanalyzeHint = (() => {
        const line = getCoverageType()
        const typeSpecificFields = ["health", "motor", "home", "life", "pet"] as const
        return typeSpecificFields.includes(line as any) && !hasCoverageDetails
    })()

    const gapsForAnalysis = (policy.gapInstances || []).map((gap: any) => ({
        id: gap.id,
        aiExplanation: gap.aiExplanation || null,
        aiExplanationEl: gap.aiExplanationEl || null,
        aiSuggestion: gap.aiSuggestion || null,
        aiSuggestionEl: gap.aiSuggestionEl || null,
        definition: {
            title: gap.definition?.title || t.analysis.unknownGap,
            severity: gap.definition?.severity || "medium",
        },
    }))

    const handleShare = async () => {
        const shareUrl = window.location.href
        const shareData = {
            title: getInsurerName(),
            text: `${t.wallet.policyNumber}: ${getPolicyNumber()}`,
            url: shareUrl,
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
                return
            } catch {
                toast.message(detailsCopy.shareCanceled)
                return
            }
        }

        if (!navigator.clipboard) {
            toast.error(detailsCopy.shareUnavailable)
            return
        }

        try {
            await navigator.clipboard.writeText(shareUrl)
            toast.success(detailsCopy.linkCopied)
        } catch {
            toast.error(detailsCopy.copyFailed)
        }
    }

    const handleCallInsurer = () => {
        if (!insurerPhone) {
            toast.error(detailsCopy.noInsurerPhone)
            return
        }
        window.location.href = `tel:${insurerPhone}`
    }

    const handleDownloadPrimaryDoc = () => {
        if (!firstDocumentUrl) {
            toast.error(t.wallet.noDocuments)
            return
        }
        window.open(firstDocumentUrl, "_blank", "noopener,noreferrer")
    }

    const coverageType = getCoverageType()
    const localizedType = t.policyTypes[coverageType as keyof typeof t.policyTypes] || coverageType
    const policyNumber = getPolicyNumber()

    // Detect placeholder data that should not be shown to the user
    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !getInsurerName() || getInsurerName() === '__PENDING_EXTRACTION__' || getInsurerName() === 'Unknown Insurer' || getInsurerName() === 'Άγνωστος ασφαλιστής'
    const isPendingPolicyNumber = !policyNumber || policyNumber.startsWith('PENDING-')
    const insurerDisplay = resolveInsurerDisplay(getInsurerName())
    const displayInsurer = isPendingInsurer ? localizedType : insurerDisplay.displayName
    const displayPolicyNumber = isPendingPolicyNumber ? null : policyNumber

    const showRecommendations = isOwner && relatedRecommendations.length > 0
    const showAgentSection = Boolean(relationshipId)

    // ── Section navigation (only sections that actually render) ──
    const navItems: PolicySectionNavItem[] = [
        { id: "summary", label: detailsCopy.navSummary },
        { id: "key-dates", label: detailsCopy.navDates },
        ...(hasCoverageDetails || shouldShowReanalyzeHint ? [{ id: "coverage", label: detailsCopy.navCoverage }] : []),
        { id: "exclusions", label: detailsCopy.navExclusions },
        { id: "perks", label: detailsCopy.navPerks },
        { id: "analysis", label: detailsCopy.navAnalysis },
        ...(showRecommendations ? [{ id: "recommendations", label: detailsCopy.navRecommendations }] : []),
        { id: "policy-qa", label: detailsCopy.navAskAi },
        { id: "claims", label: detailsCopy.navClaims },
        ...(showAgentSection ? [{ id: "agent", label: detailsCopy.navAgent }] : []),
        { id: "documents", label: detailsCopy.navDocuments },
    ]

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
                <nav className="mb-5 flex items-center gap-2 text-sm">
                    <Link
                        href="/wallet"
                        className="font-semibold text-primary transition-colors hover:text-primary-hover dark:text-mint dark:hover:text-mint/80"
                    >
                        {t.wallet.title}
                    </Link>
                    <span className="text-black/35 dark:text-white/40">/</span>
                    <span className="font-semibold text-black dark:text-white">{displayPolicyNumber || localizedType}</span>
                </nav>

                {/* Extraction review banner — shown until the owner confirms the AI-extracted data */}
                {isOwner && (policy.reviewState === 'unconfirmed' || policy.reviewState === 'flagged') && (
                    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#B45309] dark:text-amber-400" />
                        <p className="min-w-0 flex-1 text-sm font-medium text-[#B45309] dark:text-amber-400">
                            {t.wallet.review.reviewBannerCta}
                        </p>
                        <Link
                            href={`/wallet/${policy.id}/review`}
                            className="flex-shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                        >
                            {t.wallet.review.reviewNow}
                        </Link>
                    </div>
                )}

                {/* ── Policy overview (hero) ─────────────────────────────── */}
                <PolicyHero
                    displayInsurer={displayInsurer}
                    localizedType={localizedType}
                    displayPolicyNumber={displayPolicyNumber}
                    plateNumber={policy.acordData?.vehicle?.plateNumber || null}
                    startDate={getStartDate()}
                    endDate={getEndDate()}
                    premiumAmount={getPremiumAmount()}
                    premiumCurrency={getPremiumCurrency()}
                    premiumFrequency={premiumFrequency}
                    statusLabel={statusLabel}
                    statusColor={statusColor}
                    daysLeft={computedDaysLeft}
                    expiredNotice={isExpiredPolicy && !isAnalyzing ? detailsCopy.expiredBanner : null}
                    isAnalyzing={isAnalyzing}
                    isPendingInsurer={isPendingInsurer}
                    locale={locale}
                    copy={{
                        expiresIn: t.wallet.expiresIn,
                        days: t.wallet.days,
                        policyId: t.wallet.policyId,
                        plateNumber: t.wallet.plateNumber,
                        starts: t.wallet.starts,
                        ends: t.wallet.ends,
                        annualPremium: t.wallet.annualPremium,
                        premiumLabel: detailsCopy.premiumLabel,
                        premiumFrequencies: detailsCopy.premiumFrequency,
                        analyzing: t.policyStatus.analyzing,
                        analyzingDocument: detailsCopy.analyzingDocument,
                        analyzingHint: detailsCopy.analyzingHint,
                        askAi: detailsCopy.navAskAi,
                        sharePolicy: detailsCopy.sharePolicy,
                        downloadContract: t.wallet.downloadContract,
                        contactInsurer: detailsCopy.contactInsurer,
                    }}
                    onShare={handleShare}
                    onDownload={handleDownloadPrimaryDoc}
                    onCallInsurer={handleCallInsurer}
                    headerMenu={
                        isOwner ? (
                            <PolicyHeaderMenu
                                ariaLabel={detailsCopy.moreActions}
                                items={[
                                    {
                                        id: "delete-policy",
                                        label: t.wallet.deletePolicyModal.deletePolicy,
                                        icon: Trash2,
                                        destructive: true,
                                        onSelect: () => setDeleteDialogOpen(true),
                                    },
                                ]}
                            />
                        ) : undefined
                    }
                />

                {/* ── Section navigation ─────────────────────────────────── */}
                {!isAnalyzing && <PolicySectionNav items={navItems} ariaLabel={detailsCopy.onThisPage} />}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                    <div className="space-y-6">
                        {/* 1 ── Plain-language AI summary ─────────────────── */}
                        <section id="summary" className="scroll-mt-24">
                            <SummaryCard
                                summary={policy.coverageSummary || t.wallet.summaryFallback}
                                health={health}
                                isAnalyzing={isAnalyzing}
                                coverageCount={coverageCount}
                                exclusionCount={exclusions.length}
                                conditionsCount={conditionsCount}
                                perkCount={perks.length}
                                daysLeft={computedDaysLeft}
                                copy={{
                                    summaryTitle: detailsCopy.summaryTitle,
                                    summaryAiChip: detailsCopy.summaryAiChip,
                                    healthTitle: t.wallet.healthScore.title,
                                    healthLevels: detailsCopy.healthLevels,
                                    atAGlance: detailsCopy.atAGlance,
                                    glanceCoverages: detailsCopy.glanceCoverages,
                                    glanceExclusions: detailsCopy.glanceExclusions,
                                    glanceConditions: detailsCopy.glanceConditions,
                                    glancePerks: detailsCopy.glancePerks,
                                    days: t.wallet.days,
                                }}
                            />
                        </section>

                        {/* 2 ── Key dates & renewal status ────────────────── */}
                        {!isAnalyzing && (
                            <section id="key-dates" className="scroll-mt-24">
                                <KeyDatesCard
                                    startDate={getStartDate()}
                                    endDate={getEndDate()}
                                    renewalDate={renewalDate}
                                    daysLeft={computedDaysLeft}
                                    statusLabel={statusLabel}
                                    statusColor={statusColor}
                                    hasAutoRenewal={autoRenewal}
                                    renewalHistory={renewalHistory}
                                    renewals={renewals}
                                    locale={locale}
                                    onRequestQuote={isOwner ? handleRequestQuote : undefined}
                                    isRequestingQuote={isRequestingQuote}
                                    dateSources={{
                                        endDate: policy.acordData?.extraction?.sources?.endDate,
                                        renewalDate: policy.acordData?.extraction?.sources?.renewalDate,
                                    }}
                                    sourceLabels={{
                                        fromDocument: t.wallet.review.sourceFromDocument,
                                        pageAbbrev: t.wallet.review.sourcePageAbbrev,
                                    }}
                                    copy={{
                                        keyDatesTitle: detailsCopy.keyDatesTitle,
                                        startedOn: detailsCopy.startedOn,
                                        expiresOn: detailsCopy.expiresOn,
                                        expiredOn: detailsCopy.expiredOn,
                                        renewalDateLabel: detailsCopy.renewalDateLabel,
                                        renewalStatusLabel: detailsCopy.renewalStatusLabel,
                                        periodProgress: detailsCopy.periodProgress,
                                        autoRenewalNote: detailsCopy.autoRenewalNote,
                                        renewalHistory: detailsCopy.renewalHistory,
                                        noRenewalHistory: detailsCopy.noRenewalHistory,
                                        expiresIn: t.wallet.expiresIn,
                                        days: t.wallet.days,
                                        requestQuote: detailsCopy.requestQuote,
                                        requestingQuote: detailsCopy.requestingQuote,
                                        reminders: detailsCopy.renewalReminders,
                                    }}
                                />
                            </section>
                        )}

                        {/* 3 ── Coverage breakdown ────────────────────────── */}
                        {hasCoverageDetails ? (
                            <section id="coverage" className="scroll-mt-24">
                                <div className="pw-card p-6 sm:p-7">
                                    <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                        <ShieldCheck className="h-4 w-4 text-primary dark:text-mint" />
                                        {detailsCopy.navCoverage}
                                    </h2>
                                    <CoverageTabView
                                        acordData={policy.acordData}
                                        lineOfBusiness={coverageType}
                                        language={lang}
                                    />
                                </div>
                            </section>
                        ) : shouldShowReanalyzeHint ? (
                            <section id="coverage" className="scroll-mt-24">
                                <div className="pw-card p-6 sm:p-7">
                                    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/45 bg-amber-50 px-4 py-4 dark:bg-amber-950/20">
                                        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{detailsCopy.reanalyzeToSeeCoverage}</p>
                                            <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">{detailsCopy.reanalyzeToSeeCoverageHint}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {/* 4 ── Exclusions & notable conditions ───────────── */}
                        {!isAnalyzing && (
                            <section id="exclusions" className="scroll-mt-24">
                                <ExclusionsCard
                                    exclusions={exclusions}
                                    conditions={notableConditions}
                                    finePrint={finePrint}
                                    lang={lang}
                                    copy={{
                                        exclusionsTitle: detailsCopy.exclusionsTitle,
                                        exclusionsSubtitle: detailsCopy.exclusionsSubtitle,
                                        exclusionsListTitle: detailsCopy.exclusionsListTitle,
                                        notableConditionsTitle: detailsCopy.notableConditionsTitle,
                                        finePrintTitle: detailsCopy.finePrintTitle,
                                        actionRequiredChip: detailsCopy.actionRequiredChip,
                                        noExclusionsDetected: detailsCopy.noExclusionsDetected,
                                        exclusionsReanalyzeHint: detailsCopy.exclusionsReanalyzeHint,
                                        showMoreFinePrint: detailsCopy.showMoreFinePrint,
                                        showLessFinePrint: detailsCopy.showLessFinePrint,
                                        showAllExclusions: detailsCopy.showAllExclusions,
                                        showFewerExclusions: detailsCopy.showFewerExclusions,
                                        conditionTypes: detailsCopy.conditionTypes,
                                        riskLevels: detailsCopy.riskLevels,
                                    }}
                                    disclaimer={t.coverageDetails.exclusionsDisclaimer}
                                />
                            </section>
                        )}

                        {/* 5 ── Perks & benefits ──────────────────────────── */}
                        {!isAnalyzing && (
                            <section id="perks" className="scroll-mt-24">
                                <PerksCard
                                    perks={perks}
                                    lang={lang}
                                    copy={{
                                        perksTitle: detailsCopy.perksTitle,
                                        perksSubtitle: detailsCopy.perksSubtitle,
                                        usageLimitLabel: detailsCopy.usageLimitLabel,
                                        callServiceCta: detailsCopy.callServiceCta,
                                        visitSiteCta: detailsCopy.visitSiteCta,
                                        dontForgetChip: detailsCopy.dontForgetChip,
                                        noPerksDetected: detailsCopy.noPerksDetected,
                                        exclusionsReanalyzeHint: detailsCopy.exclusionsReanalyzeHint,
                                        perkTypes: detailsCopy.perkTypes,
                                    }}
                                />
                            </section>
                        )}

                        {/* 6 ── AI gap analysis ───────────────────────────── */}
                        <section id="analysis" className="scroll-mt-24">
                            <PolicyAnalysisTabs
                                policyId={policy.id}
                                gaps={gapsForAnalysis}
                                acordData={policy.acordData}
                                t={t}
                                lastAnalyzedAt={policy.lastAnalyzedAt}
                                policyStatus={policy.status}
                                processingError={policy.acordData?.processingError || null}
                                analysisPipeline={policy.acordData?.analysis?.pipeline || null}
                                report={{ items: gapReportItems, reportUnlocked }}
                            />
                        </section>

                        {/* 6b ── Locked premium insights (free/Starter) ────── */}
                        {tier !== 'pro' && (
                            <section id="premium-insights" className="scroll-mt-24">
                                <PremiumInsightCards
                                    triggerSource="policy_detail_locked_cards"
                                    returnTo={`/wallet/${policy.id}#analysis`}
                                    className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/5 p-6 sm:p-8"
                                />
                            </section>
                        )}

                        {/* 7 ── Related recommendations ───────────────────── */}
                        {showRecommendations && (
                            <section id="recommendations" className="scroll-mt-24">
                                <RecommendationCards
                                    recommendations={relatedRecommendations}
                                    language={lang}
                                    tier={tier}
                                />
                            </section>
                        )}

                        {/* 8 ── Ask AI about this policy ──────────────────── */}
                        <section id="policy-qa" className="scroll-mt-24">
                            <PolicyQA policyId={policy.id} tier={tier} lineOfBusiness={coverageType} />
                        </section>

                        {/* 9 ── Claims guidance ───────────────────────────── */}
                        <section id="claims" className="scroll-mt-24">
                            <ClaimsGuidanceCard
                                lang={lang}
                                insurerName={displayInsurer}
                                policyNumber={displayPolicyNumber}
                                insurerPhone={insurerPhone}
                                deadlines={claimDeadlines}
                                hasAgent={showAgentSection}
                                copy={{
                                    claimsTitle: detailsCopy.claimsTitle,
                                    claimsSubtitle: detailsCopy.claimsSubtitle,
                                    claimStep1Title: detailsCopy.claimStep1Title,
                                    claimStep1Desc: detailsCopy.claimStep1Desc,
                                    claimStep2Title: detailsCopy.claimStep2Title,
                                    claimStep2Desc: detailsCopy.claimStep2Desc,
                                    claimStep3Title: detailsCopy.claimStep3Title,
                                    claimStep3Desc: detailsCopy.claimStep3Desc,
                                    claimStep4Title: detailsCopy.claimStep4Title,
                                    claimStep4Desc: detailsCopy.claimStep4Desc,
                                    claimNoDeadlines: detailsCopy.claimNoDeadlines,
                                    claimNeedHelp: detailsCopy.claimNeedHelp,
                                    claimAskAiCta: detailsCopy.claimAskAiCta,
                                    claimAskAgentCta: detailsCopy.claimAskAgentCta,
                                    claimsDisclaimer: detailsCopy.claimsDisclaimer,
                                    contactInsurer: detailsCopy.contactInsurer,
                                    policyNumberLabel: t.wallet.policyNumber,
                                }}
                                onCallInsurer={handleCallInsurer}
                            />
                        </section>

                        {/* 10 ── Agent notes & collaboration ──────────────── */}
                        {showAgentSection && (
                            <section id="agent" className="scroll-mt-24">
                                {canShowCollaborationTimeline ? (
                                    <div className="space-y-4">
                                        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                            <Users className="h-4 w-4 text-primary dark:text-mint" />
                                            {detailsCopy.agentSectionTitle}
                                        </h2>
                                        <CollaborationTimeline
                                            policyId={policy.id}
                                            relationshipId={relationshipId || null}
                                            viewerRole={isOwner ? "policyholder" : "agent"}
                                        />
                                    </div>
                                ) : (
                                    <div className="pw-card p-6 sm:p-7">
                                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                            <Lock className="h-4 w-4 text-primary dark:text-mint" />
                                            {detailsCopy.agentSectionTitle}
                                        </h2>
                                        <p className="mb-4 text-sm text-black/65 dark:text-white/70">{detailsCopy.agentLockedHint}</p>
                                        <a
                                            href="/upgrade"
                                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white dark:text-[#1A2420] transition-colors hover:bg-primary-hover"
                                        >
                                            <Crown className="h-4 w-4" />
                                            {t.wallet.upgradePlan}
                                        </a>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* ── Sidebar ────────────────────────────────────────── */}
                    <aside className="space-y-6">
                        {/* Tier upgrade banner for free users */}
                        {isFreeTier && !isAnalyzing && (
                            <div className="pw-card relative overflow-hidden border-primary/30 p-6">
                                <div className="pointer-events-none absolute inset-0 bg-primary/5" />
                                <div className="relative">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-primary dark:text-mint" />
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                            {t.wallet.upgradePlan}
                                        </h3>
                                    </div>
                                    <p className="mb-4 text-xs leading-relaxed text-black/60 dark:text-white/65">
                                        {detailsCopy.upgradeHint}
                                    </p>
                                    <a
                                        href="/upgrade"
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white dark:text-[#1A2420] transition-colors hover:bg-primary-hover"
                                    >
                                        <Crown className="h-4 w-4" />
                                        {t.wallet.upgradePlan}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Trigger J: savings report export — visible to all, Pro-unlocked */}
                        {isOwner && (
                            <div className="pw-card p-6">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                    <FileDown className="h-4 w-4 text-primary dark:text-mint" />
                                    {pickCopy(EXPORT_COPY.title, lang)}
                                </h3>
                                <p className="mb-4 text-xs leading-relaxed text-black/60 dark:text-white/65">
                                    {pickCopy(EXPORT_COPY.subtitle, lang)}
                                </p>
                                {tier === "pro" ? (
                                    <a
                                        href={`/api/v1/policies/${policy.id}/savings-report`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                                    >
                                        <FileDown className="h-4 w-4" />
                                        {pickCopy(EXPORT_COPY.exportCta, lang)}
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            trackJourneyEvent("upgrade_trigger_clicked", {
                                                trigger_source: "savings_report_export",
                                                feature_requested: "export_report",
                                            })
                                            setExportUpgradeOpen(true)
                                        }}
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary-soft px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:bg-primary/10 dark:text-mint"
                                    >
                                        <Crown className="h-4 w-4" />
                                        {pickCopy(EXPORT_COPY.unlockCta, lang)}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Uploaded documents */}
                        <section id="documents" className="scroll-mt-24">
                            <DocumentsCard
                                documents={policy.documents}
                                isFreeTier={isFreeTier}
                                copy={{
                                    documentsArea: detailsCopy.documentsArea,
                                    noDocuments: t.wallet.noDocuments,
                                    contract: t.wallet.contract,
                                    preview: t.wallet.preview,
                                    upgradeToPlusPreview: t.wallet.upgradeToPlusPreview,
                                    previewLabels: t.wallet.documentPreview,
                                }}
                            />
                        </section>

                        {/* Insured people */}
                        {(insuredNames.length > 0 || !isAnalyzing) && (
                            <InsuredPeopleCard
                                names={insuredNames}
                                copy={{
                                    insuredPeople: detailsCopy.insuredPeople,
                                    noInsuredPeople: detailsCopy.noInsuredPeople,
                                }}
                            />
                        )}

                        <AIUsageWidget
                            count={aiUsageStats.count}
                            limit={aiUsageStats.limit}
                            t={t}
                            reportUnlock={{
                                locked: !reportUnlocked,
                                lockedCount: Math.max(gapReportItems.length - FREE_GAP_PREVIEW_COUNT, 0),
                            }}
                        />

                        {canShowCollaborationPanel && (
                            <CollaborationPanel
                                policyId={policy.id}
                                policyNumber={policyNumber}
                                initialShares={serializedShares || []}
                                isOwner={isOwner}
                            />
                        )}

                    </aside>
                </div>
            </div>

            <UpgradeModal
                isOpen={exportUpgradeOpen}
                onClose={() => setExportUpgradeOpen(false)}
                featureKey="export_report"
                triggerSource="savings_report_export"
                returnTo={pathname || undefined}
            />

            {isOwner && (
                <DeletePolicyDialog
                    policyId={policy.id}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            )}
        </div>
    )
}
