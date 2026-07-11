"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"
import { DeletePolicy } from "@/components/wallet/DeletePolicy"
import { PolicyAnalysisTabs } from "@/app/(protected)/wallet/[id]/PolicyAnalysisTabs"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { AIUsageWidget } from "@/app/(protected)/wallet/[id]/AIUsageWidget"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { CoverageTabView } from "@/components/wallet/coverage-details/CoverageTabView"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { PolicySectionNav, type PolicySectionNavItem } from "@/components/wallet/policy-detail/PolicySectionNav"
import { KeyDatesCard } from "@/components/wallet/policy-detail/KeyDatesCard"
import { ExclusionsCard } from "@/components/wallet/policy-detail/ExclusionsCard"
import { PerksCard } from "@/components/wallet/policy-detail/PerksCard"
import { ClaimsGuidanceCard } from "@/components/wallet/policy-detail/ClaimsGuidanceCard"
import {
    deriveClaimDeadlines,
    extractPolicySections,
    formatPolicyDate,
    hasAutoRenewal,
    normalizeRenewalHistory,
    parsePolicyDate,
} from "@/lib/wallet/policy-detail"
import {
    AlertTriangle,
    Calendar,
    Crown,
    Download,
    FileText,
    Lock,
    MessageCircle,
    Phone,
    RefreshCw,
    Share2,
    Shield,
    ShieldCheck,
    ShieldOff,
    Sparkles,
    TrendingUp,
    Users,
} from "lucide-react"
import { DocumentPreview, DocumentPreviewButton } from "@/components/wallet/DocumentPreview"

interface PolicyDetailsClientProps {
    policy: any
    walletPolicy: any
    serializedShares: any[]
    aiUsageStats: {
        count: number
        limit: number | null
        remaining?: number | null
        creditBalance?: number
    }
    statusLabel: string
    statusColor: any
    daysLeft: number
    holderName: string
    shouldOpenWallet: boolean
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
}

export function PolicyDetailsClient({
    policy,
    walletPolicy,
    serializedShares,
    aiUsageStats,
    statusLabel,
    statusColor,
    daysLeft,
    holderName,
    shouldOpenWallet,
    isOwner,
    relationshipId,
    t,
    tier = 'free',
    tierLimits,
    relatedRecommendations = [],
}: PolicyDetailsClientProps) {
    // wallet pass feature removed — parked for future
    void shouldOpenWallet
    void walletPolicy
    void holderName
    const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null)

    const locale = t.common?.locale || "en-US"
    const lang: "el" | "en" = locale.startsWith("el") ? "el" : "en"
    const detailsCopy = t.wallet.policyDetailsPage

    const canUseCollaboration = tierLimits?.agentCollaboration !== false
    const canShowCollaborationPanel = (isOwner || (serializedShares?.length ?? 0) > 0) && canUseCollaboration
    const isFreeTier = tier === 'free'
    const canShowCollaborationTimeline = Boolean(relationshipId) && canUseCollaboration && !isFreeTier

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

    const getStartDate = () => policy.acordData?.policy?.effectiveDate || policy.startDate
    const getEndDate = () => {
        if (latestRenewalEnd) return latestRenewalEnd.toISOString()
        return policy.acordData?.policy?.expirationDate || policy.endDate
    }

    const computedDaysLeft = (() => {
        const end = parsePolicyDate(getEndDate())
        if (!end) return daysLeft
        return Math.floor((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    })()

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

    const handleRenewalRequest = () => {
        toast.success(detailsCopy.renewalRequested)
    }

    const coverageType = getCoverageType()
    const localizedType = t.policyTypes[coverageType as keyof typeof t.policyTypes] || coverageType
    const policyNumber = getPolicyNumber()

    // Detect placeholder data that should not be shown to the user
    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !getInsurerName() || getInsurerName() === '__PENDING_EXTRACTION__' || getInsurerName() === 'Unknown Insurer' || getInsurerName() === 'Άγνωστος ασφαλιστής'
    const isPendingPolicyNumber = !policyNumber || policyNumber.startsWith('PENDING-')
    const displayInsurer = isPendingInsurer ? localizedType : getInsurerName()
    const displayPolicyNumber = isPendingPolicyNumber ? null : policyNumber

    const showRecommendations = isOwner && relatedRecommendations.length > 0
    const showAgentSection = Boolean(relationshipId)

    // ── Section navigation (only sections that actually render) ──
    const navItems: PolicySectionNavItem[] = [
        { id: "summary", label: detailsCopy.navSummary },
        { id: "key-dates", label: detailsCopy.navDates },
        { id: "coverage", label: detailsCopy.navCoverage },
        { id: "exclusions", label: detailsCopy.navExclusions },
        { id: "perks", label: detailsCopy.navPerks },
        { id: "analysis", label: detailsCopy.navAnalysis },
        ...(showRecommendations ? [{ id: "recommendations", label: detailsCopy.navRecommendations }] : []),
        { id: "policy-qa", label: detailsCopy.navAskAi },
        { id: "claims", label: detailsCopy.navClaims },
        ...(showAgentSection ? [{ id: "agent", label: detailsCopy.navAgent }] : []),
        { id: "documents", label: detailsCopy.navDocuments },
    ]

    const glanceChips = [
        coverageCount > 0
            ? {
                  id: "coverage",
                  icon: ShieldCheck,
                  label: `${coverageCount} ${detailsCopy.glanceCoverages}`,
                  classes:
                      "border-primary/25 bg-primary-soft/60 text-[#166534] dark:border-mint/25 dark:bg-primary/15 dark:text-mint",
              }
            : null,
        exclusions.length > 0
            ? {
                  id: "exclusions",
                  icon: ShieldOff,
                  label: `${exclusions.length} ${detailsCopy.glanceExclusions}`,
                  classes:
                      "border-red-200 bg-[#FEF2F2] text-[#B91C1C] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
              }
            : null,
        conditionsCount > 0
            ? {
                  id: "exclusions",
                  icon: AlertTriangle,
                  label: `${conditionsCount} ${detailsCopy.glanceConditions}`,
                  classes:
                      "border-amber-200 bg-[#FEF3C7]/60 text-[#B45309] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300",
              }
            : null,
        perks.length > 0
            ? {
                  id: "perks",
                  icon: Sparkles,
                  label: `${perks.length} ${detailsCopy.glancePerks}`,
                  classes:
                      "border-primary/25 bg-primary-soft/60 text-primary dark:border-mint/25 dark:bg-primary/15 dark:text-mint",
              }
            : null,
        computedDaysLeft >= 0
            ? {
                  id: "key-dates",
                  icon: Calendar,
                  label: `${computedDaysLeft} ${t.wallet.days}`,
                  classes:
                      computedDaysLeft <= 30
                          ? "border-amber-200 bg-[#FEF3C7]/60 text-[#B45309] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                          : "border-black/10 bg-black/[0.03] text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/75",
              }
            : null,
    ].filter(Boolean) as Array<{ id: string; icon: typeof ShieldCheck; label: string; classes: string }>

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
                <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] p-6 text-white shadow-2xl sm:p-8 lg:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(137,217,178,0.22),_transparent_45%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_40%)]" />

                    <div className="relative space-y-7">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                                {statusLabel}
                            </span>
                            {computedDaysLeft >= 0 && computedDaysLeft <= 30 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {t.wallet.expiresIn} {computedDaysLeft} {t.wallet.days}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                                <div className="mb-4 flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-mint/35 bg-mint/15">
                                        <Shield className="h-7 w-7 text-mint" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                                            {displayInsurer}
                                        </h1>
                                        {isAnalyzing && isPendingInsurer ? (
                                            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-mint animate-pulse">
                                                {t.policyStatus?.analyzing || 'Analyzing'}...
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-mint">
                                                {localizedType}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {displayPolicyNumber && (
                                        <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/65">{t.wallet.policyId}</p>
                                            <p className="font-mono text-sm font-bold text-white">{displayPolicyNumber}</p>
                                        </div>
                                    )}

                                    {policy.acordData?.vehicle?.plateNumber ? (
                                        <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/65">{t.wallet.plateNumber}</p>
                                            <p className="font-mono text-sm font-bold text-white">{policy.acordData.vehicle.plateNumber}</p>
                                        </div>
                                    ) : null}

                                    {!isAnalyzing && (
                                        <>
                                            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/65">{t.wallet.starts}</p>
                                                <p className="text-sm font-bold text-white">{formatPolicyDate(getStartDate(), locale)}</p>
                                            </div>

                                            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/65">{t.wallet.ends}</p>
                                                <p className="text-sm font-bold text-white">{formatPolicyDate(getEndDate(), locale)}</p>
                                            </div>
                                        </>
                                    )}

                                    {isAnalyzing && isPendingInsurer && (
                                        <div className="rounded-2xl border border-mint/25 bg-mint/10 px-4 py-3 sm:col-span-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-mint animate-pulse" />
                                                <p className="text-sm font-bold text-mint">
                                                    {detailsCopy.analyzingDocument || t.policyStatus?.analyzing || 'Analyzing your document'}...
                                                </p>
                                            </div>
                                            <p className="mt-1 text-xs text-white/55">
                                                {detailsCopy.analyzingHint || 'Details will appear automatically once extraction completes.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {getPremiumAmount() > 0 && (
                                <div className="w-full max-w-xs rounded-3xl border border-white/15 bg-[#111111] p-5 shadow-lg">
                                    <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/65">
                                        <TrendingUp className="h-3.5 w-3.5 text-mint" />
                                        {t.wallet.annualPremium}
                                    </p>
                                    <p className="text-4xl font-black leading-none text-white">
                                        {getPremiumAmount().toLocaleString(locale, {
                                            style: "currency",
                                            currency: getPremiumCurrency(),
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {!isAnalyzing && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <a
                                    href="#policy-qa"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-mint px-5 text-sm font-bold text-[#1A2420] transition-colors hover:bg-mint/85"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    {detailsCopy.navAskAi}
                                </a>

                                <button
                                    onClick={handleShare}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                                >
                                    <Share2 className="h-4 w-4" />
                                    {detailsCopy.sharePolicy}
                                </button>

                                <button
                                    onClick={handleDownloadPrimaryDoc}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                                >
                                    <Download className="h-4 w-4" />
                                    {t.wallet.downloadContract}
                                </button>

                                <button
                                    onClick={handleCallInsurer}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                                >
                                    <Phone className="h-4 w-4" />
                                    {detailsCopy.contactInsurer}
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Section navigation ─────────────────────────────────── */}
                {!isAnalyzing && <PolicySectionNav items={navItems} ariaLabel={detailsCopy.onThisPage} />}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                    <div className="space-y-6">
                        {/* 1 ── Plain-language AI summary ─────────────────── */}
                        <section id="summary" className="scroll-mt-24">
                            <div className="pw-card p-6 sm:p-7">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                        <FileText className="h-4 w-4 text-primary dark:text-mint" />
                                        {detailsCopy.summaryTitle}
                                    </h2>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary dark:bg-primary/15 dark:text-mint">
                                        <Sparkles className="h-3 w-3" />
                                        {detailsCopy.summaryAiChip}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">
                                    {policy.coverageSummary || t.wallet.summaryFallback}
                                </p>

                                {glanceChips.length > 0 && (
                                    <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
                                        <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                                            {detailsCopy.atAGlance}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {glanceChips.map((chip, i) => {
                                                const ChipIcon = chip.icon
                                                return (
                                                    <a
                                                        key={i}
                                                        href={`#${chip.id}`}
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform hover:scale-[1.03] ${chip.classes}`}
                                                    >
                                                        <ChipIcon className="h-3.5 w-3.5" />
                                                        {chip.label}
                                                    </a>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 2 ── Key dates & renewal status ────────────────── */}
                        {!isAnalyzing && (
                            <section id="key-dates" className="scroll-mt-24">
                                <KeyDatesCard
                                    startDate={getStartDate()}
                                    endDate={getEndDate()}
                                    daysLeft={computedDaysLeft}
                                    statusLabel={statusLabel}
                                    statusColor={statusColor}
                                    hasAutoRenewal={autoRenewal}
                                    renewalHistory={renewalHistory}
                                    locale={locale}
                                    copy={{
                                        keyDatesTitle: detailsCopy.keyDatesTitle,
                                        startedOn: detailsCopy.startedOn,
                                        expiresOn: detailsCopy.expiresOn,
                                        expiredOn: detailsCopy.expiredOn,
                                        renewalStatusLabel: detailsCopy.renewalStatusLabel,
                                        periodProgress: detailsCopy.periodProgress,
                                        autoRenewalNote: detailsCopy.autoRenewalNote,
                                        renewalHistory: detailsCopy.renewalHistory,
                                        noRenewalHistory: detailsCopy.noRenewalHistory,
                                        requestRenewal: detailsCopy.requestRenewal,
                                        expiresIn: t.wallet.expiresIn,
                                        days: t.wallet.days,
                                    }}
                                    onRequestRenewal={handleRenewalRequest}
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
                            />
                        </section>

                        {/* 7 ── Related recommendations ───────────────────── */}
                        {showRecommendations && (
                            <section id="recommendations" className="scroll-mt-24">
                                <RecommendationCards
                                    recommendations={relatedRecommendations}
                                    language={lang}
                                />
                            </section>
                        )}

                        {/* 8 ── Ask AI about this policy ──────────────────── */}
                        <section id="policy-qa" className="scroll-mt-24">
                            <PolicyQA policyId={policy.id} />
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

                        {/* Uploaded documents */}
                        <section id="documents" className="scroll-mt-24">
                            <div className="pw-card p-6">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                    <FileText className="h-4 w-4 text-primary dark:text-mint" />
                                    {detailsCopy.documentsArea}
                                </h3>

                                {policy.documents.length === 0 ? (
                                    <p className="text-sm text-black/65 dark:text-white/70">{t.wallet.noDocuments}</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {policy.documents.map((doc: any) => {
                                            const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf')
                                            const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(doc.fileName || '')
                                            const canPreview = isPdf || isImage
                                            const isPreviewLocked = isPdf && isFreeTier

                                            return (
                                                <li key={doc.id} className="flex items-center gap-2">
                                                    <a
                                                        href={doc.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex flex-1 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-3 transition-colors hover:bg-black/5 dark:border-white/15 dark:bg-black dark:hover:bg-white/10"
                                                    >
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10">
                                                            <FileText className="h-4 w-4 text-black/75 dark:text-white/80" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold text-black dark:text-white">{doc.fileName}</p>
                                                            <p className="text-xs text-black/55 dark:text-white/60">{t.wallet.contract}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {canPreview && (
                                                                <DocumentPreviewButton
                                                                    onClick={() => setPreviewDoc({ fileName: doc.fileName, fileUrl: doc.fileUrl })}
                                                                    isLocked={isPreviewLocked}
                                                                    label={t.wallet.preview}
                                                                    lockedLabel={t.wallet.upgradeToPlusPreview}
                                                                />
                                                            )}
                                                            <Download className="h-4 w-4 shrink-0 text-black/45 dark:text-white/55" />
                                                        </div>
                                                    </a>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}

                                <DocumentPreview
                                    isOpen={!!previewDoc}
                                    onClose={() => setPreviewDoc(null)}
                                    document={previewDoc}
                                />
                            </div>
                        </section>

                        {/* Insured people */}
                        {(insuredNames.length > 0 || !isAnalyzing) && (
                            <div className="pw-card p-6">
                                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                    {detailsCopy.insuredPeople}
                                </h3>

                                {insuredNames.length === 0 ? (
                                    <p className="text-sm text-black/65 dark:text-white/70">{detailsCopy.noInsuredPeople}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {insuredNames.map((name) => (
                                            <li
                                                key={name}
                                                className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-black/80 dark:border-white/15 dark:bg-white/5 dark:text-white/85"
                                            >
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <AIUsageWidget count={aiUsageStats.count} limit={aiUsageStats.limit} t={t} />

                        {canShowCollaborationPanel && (
                            <CollaborationPanel
                                policyId={policy.id}
                                policyNumber={policyNumber}
                                initialShares={serializedShares || []}
                                isOwner={isOwner}
                            />
                        )}

                        {isOwner && <DeletePolicy policyId={policy.id} />}
                    </aside>
                </div>
            </div>

        </div>
    )
}
