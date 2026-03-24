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
import {
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
    Sparkles,
    TrendingUp,
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
}

function parseDate(value: unknown): Date | null {
    if (!value) return null
    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: unknown, locale: string): string {
    const parsed = parseDate(value)
    if (!parsed) return "-"
    return parsed.toLocaleDateString(locale)
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
}: PolicyDetailsClientProps) {
    // wallet pass feature removed — parked for future
    void shouldOpenWallet
    const [activeTab, setActiveTab] = useState<"analysis" | "qa" | "collaboration">("analysis")
    const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null)

    const locale = t.common?.locale || "en-US"
    const detailsCopy = t.wallet.policyDetailsPage

    const copy = {
        nextBestActions: detailsCopy.nextBestActions,
        askStarter: detailsCopy.askStarter,
        sharePolicy: detailsCopy.sharePolicy,
        reviewRenewal: detailsCopy.reviewRenewal,
        contactInsurer: detailsCopy.contactInsurer,
        requestRenewal: detailsCopy.requestRenewal,
        renewalRequested: detailsCopy.renewalRequested,
        noInsurerPhone: detailsCopy.noInsurerPhone,
        documentsArea: detailsCopy.documentsArea,
        shareCanceled: detailsCopy.shareCanceled,
        shareUnavailable: detailsCopy.shareUnavailable,
        linkCopied: detailsCopy.linkCopied,
        copyFailed: detailsCopy.copyFailed,
        tabAnalysis: detailsCopy.tabAnalysis,
        tabQa: detailsCopy.tabQa,
        tabCollaboration: detailsCopy.tabCollaboration,
        insuredPeople: detailsCopy.insuredPeople,
        noInsuredPeople: detailsCopy.noInsuredPeople,
        renewalHistory: detailsCopy.renewalHistory,
        noRenewalHistory: detailsCopy.noRenewalHistory,
        reanalyzeToSeeCoverage: detailsCopy.reanalyzeToSeeCoverage,
        reanalyzeToSeeCoverageHint: detailsCopy.reanalyzeToSeeCoverageHint,
    }

    const canShowCollaborationTimeline = Boolean(relationshipId) && (tierLimits?.agentCollaboration !== false)
    const canShowCollaborationPanel = (isOwner || (serializedShares?.length ?? 0) > 0) && (tierLimits?.agentCollaboration !== false)
    const isFreeTier = tier === 'free'
    const canUseCollaboration = tierLimits?.agentCollaboration !== false
    const canUseAdvancedAnalytics = tierLimits?.advancedAnalytics === true

    const getInsurerName = () => policy.acordData?.policy?.insurerName || policy.insurerName
    const getPolicyNumber = () => policy.acordData?.policy?.policyNumber || policy.policyNumber
    const getCoverageType = () => policy.acordData?.policy?.lineOfBusiness || policy.lineOfBusiness
    const getPremiumAmount = () => {
        const extractedPremium = policy.acordData?.policy?.premium?.amount
        if (extractedPremium) return Number(extractedPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }
    const getPremiumCurrency = () => policy.acordData?.policy?.premium?.currency || policy.premiumCurrency || "EUR"

    const getLatestRenewalEndDate = () => {
        const history = Array.isArray(policy?.acordData?.renewalHistory) ? policy.acordData.renewalHistory : []
        const dated = history.map((item: any) => parseDate(item?.endDate)).filter(Boolean) as Date[]
        if (dated.length === 0) return null
        return dated.sort((a, b) => b.getTime() - a.getTime())[0]
    }

    const getStartDate = () => policy.acordData?.policy?.effectiveDate || policy.startDate
    const getEndDate = () => {
        const latestRenewal = getLatestRenewalEndDate()
        if (latestRenewal) return latestRenewal.toISOString()
        return policy.acordData?.policy?.expirationDate || policy.endDate
    }

    const computedDaysLeft = (() => {
        const end = parseDate(getEndDate())
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

    const renewalHistory = (Array.isArray(policy?.acordData?.renewalHistory) ? policy.acordData.renewalHistory : [])
        .map((entry: any, index: number) => ({
            id: entry?.id || `renewal-${index}`,
            startDate: entry?.startDate || null,
            endDate: entry?.endDate || null,
            sourceDocumentName: entry?.sourceDocumentName || null,
        }))
        .sort((a: any, b: any) => {
            const aDate = parseDate(a.endDate)?.getTime() || 0
            const bDate = parseDate(b.endDate)?.getTime() || 0
            return bDate - aDate
        })

    const insurerPhone = policy.acordData?.policy?.insurerContact || ""
    const firstDocumentUrl = policy.documents?.[0]?.fileUrl

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
                toast.message(copy.shareCanceled)
                return
            }
        }

        if (!navigator.clipboard) {
            toast.error(copy.shareUnavailable)
            return
        }

        try {
            await navigator.clipboard.writeText(shareUrl)
            toast.success(copy.linkCopied)
        } catch {
            toast.error(copy.copyFailed)
        }
    }

    const handleCallInsurer = () => {
        if (!insurerPhone) {
            toast.error(copy.noInsurerPhone)
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
        toast.success(copy.renewalRequested)
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

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
                <nav className="mb-5 flex items-center gap-2 text-sm">
                    <Link
                        href="/wallet"
                        className="font-semibold text-[#19b870] transition-colors hover:text-[#16985d]"
                    >
                        {t.wallet.title}
                    </Link>
                    <span className="text-black/35 dark:text-white/40">/</span>
                    <span className="font-semibold text-black dark:text-white">{displayPolicyNumber || localizedType}</span>
                </nav>

                <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black p-6 text-white shadow-2xl sm:p-8 lg:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(31,220,134,0.28),_transparent_45%)]" />
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
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#1FDC86]/35 bg-[#1FDC86]/18">
                                        <Shield className="h-7 w-7 text-[#9cf0c9]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                                            {displayInsurer}
                                        </h1>
                                        {isAnalyzing && isPendingInsurer ? (
                                            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-[#9cf0c9] animate-pulse">
                                                {t.policyStatus?.analyzing || 'Analyzing'}...
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-[#9cf0c9]">
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
                                                <p className="text-sm font-bold text-white">{formatDate(getStartDate(), locale)}</p>
                                            </div>

                                            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/65">{t.wallet.ends}</p>
                                                <p className="text-sm font-bold text-white">{formatDate(getEndDate(), locale)}</p>
                                            </div>
                                        </>
                                    )}

                                    {isAnalyzing && isPendingInsurer && (
                                        <div className="rounded-2xl border border-[#1FDC86]/25 bg-[#1FDC86]/8 px-4 py-3 sm:col-span-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-[#9cf0c9] animate-pulse" />
                                                <p className="text-sm font-bold text-[#9cf0c9]">
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
                                        <TrendingUp className="h-3.5 w-3.5 text-[#9cf0c9]" />
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
                                <button
                                    onClick={handleShare}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                                >
                                    <Share2 className="h-4 w-4" />
                                    {copy.sharePolicy}
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
                                    {copy.contactInsurer}
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                    <section className="space-y-6">
                        <div className="pw-card p-6 sm:p-7">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                <FileText className="h-4 w-4 text-[#19b870]" />
                                {t.wallet.summary}
                            </h2>
                            <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">
                                {policy.coverageSummary || t.wallet.summaryFallback}
                            </p>
                        </div>

                        {hasCoverageDetails ? (
                            <div className="pw-card p-6 sm:p-7">
                                <CoverageTabView
                                    acordData={policy.acordData}
                                    lineOfBusiness={coverageType}
                                    language={locale.startsWith("el") ? "el" : "en"}
                                />
                            </div>
                        ) : shouldShowReanalyzeHint ? (
                            <div className="pw-card p-6 sm:p-7">
                                <div className="flex items-start gap-3 rounded-2xl border border-amber-300/45 bg-amber-50 px-4 py-4 dark:bg-amber-950/20">
                                    <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{copy.reanalyzeToSeeCoverage}</p>
                                        <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">{copy.reanalyzeToSeeCoverageHint}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="pw-card p-2">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setActiveTab("analysis")}
                                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                                        activeTab === "analysis"
                                            ? "bg-black text-white"
                                            : "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15"
                                    }`}
                                >
                                    {copy.tabAnalysis}
                                </button>

                                <button
                                    onClick={() => setActiveTab("qa")}
                                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                                        activeTab === "qa"
                                            ? "bg-black text-white"
                                            : "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15"
                                    }`}
                                >
                                    {copy.tabQa}
                                </button>

                                <button
                                    onClick={() => !isFreeTier && setActiveTab("collaboration")}
                                    disabled={!canShowCollaborationTimeline && !isFreeTier}
                                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                                        activeTab === "collaboration"
                                            ? "bg-black text-white"
                                            : "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15"
                                    } ${(!canShowCollaborationTimeline || isFreeTier) ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        {isFreeTier && <Lock className="h-3 w-3" />}
                                        {copy.tabCollaboration}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {activeTab === "analysis" && (
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
                        )}

                        {activeTab === "qa" && (
                            <div id="policy-qa">
                                <PolicyQA policyId={policy.id} />
                            </div>
                        )}

                        {activeTab === "collaboration" && canShowCollaborationTimeline && (
                            <CollaborationTimeline
                                policyId={policy.id}
                                relationshipId={relationshipId || null}
                                viewerRole={isOwner ? "policyholder" : "agent"}
                            />
                        )}
                    </section>

                    <aside className="space-y-6">
                        {/* Tier upgrade banner for free users */}
                        {isFreeTier && !isAnalyzing && (
                            <div className="pw-card relative overflow-hidden border-[#1FDC86]/30 p-6">
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1FDC86]/8 to-transparent" />
                                <div className="relative">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-[#1FDC86]" />
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                            {t.wallet.upgradePlan}
                                        </h3>
                                    </div>
                                    <p className="mb-4 text-xs leading-relaxed text-black/60 dark:text-white/65">
                                        {detailsCopy.upgradeHint || 'Unlock agent collaboration, advanced analytics, and unlimited AI questions.'}
                                    </p>
                                    <a
                                        href="/account"
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1FDC86] px-4 text-sm font-bold text-white transition-colors hover:bg-[#19b870]"
                                    >
                                        <Crown className="h-4 w-4" />
                                        {t.wallet.upgradePlan}
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="pw-card p-6">
                            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                {copy.nextBestActions}
                            </h3>

                            <div className="space-y-3">
                                <a
                                    href="#policy-qa"
                                    onClick={() => setActiveTab("qa")}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1FDC86] px-4 text-sm font-bold text-white transition-colors hover:bg-[#19b870]"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    {copy.askStarter}
                                </a>

                                {!isFreeTier && (
                                    <button
                                        onClick={handleShare}
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10 cursor-pointer"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        {copy.sharePolicy}
                                    </button>
                                )}

                                <div className="rounded-2xl border border-amber-300/55 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950/25 dark:text-amber-200">
                                    {copy.reviewRenewal}
                                </div>
                            </div>
                        </div>

                        <AIUsageWidget count={aiUsageStats.count} limit={aiUsageStats.limit} t={t} />

                        <div className="pw-card p-6">
                            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                {t.wallet.actionItems}
                            </h3>

                            <div className="space-y-3">
                                {computedDaysLeft <= 30 && (
                                    <div className="rounded-2xl border border-amber-300/55 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950/25 dark:text-amber-200">
                                        {t.wallet.reviewRenewal}
                                    </div>
                                )}

                                <button
                                    onClick={handleCallInsurer}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1FDC86] px-4 text-sm font-bold text-white transition-colors hover:bg-[#19b870] cursor-pointer"
                                >
                                    <Phone className="h-4 w-4" />
                                    {copy.contactInsurer}
                                </button>

                                <button
                                    onClick={handleRenewalRequest}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10 cursor-pointer"
                                >
                                    <Sparkles className="h-4 w-4 text-[#19b870]" />
                                    {copy.requestRenewal}
                                </button>

                                <button
                                    onClick={handleDownloadPrimaryDoc}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10 cursor-pointer"
                                >
                                    <Download className="h-4 w-4" />
                                    {t.wallet.downloadContract}
                                </button>
                            </div>
                        </div>

                        {/* Only show insured people if data exists or not analyzing */}
                        {(insuredNames.length > 0 || !isAnalyzing) && (
                            <div className="pw-card p-6">
                                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                    {copy.insuredPeople}
                                </h3>

                                {insuredNames.length === 0 ? (
                                    <p className="text-sm text-black/65 dark:text-white/70">{copy.noInsuredPeople}</p>
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

                        {/* Only show renewal history if data exists or not analyzing */}
                        {(renewalHistory.length > 0 || !isAnalyzing) && (
                            <div className="pw-card p-6">
                                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                    {copy.renewalHistory}
                                </h3>

                                {renewalHistory.length === 0 ? (
                                    <p className="text-sm text-black/65 dark:text-white/70">{copy.noRenewalHistory}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {renewalHistory.map((entry: any) => (
                                            <li
                                                key={entry.id}
                                                className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 dark:border-white/15 dark:bg-white/5"
                                            >
                                                <p className="text-sm font-semibold text-black dark:text-white">
                                                    {formatDate(entry.startDate, locale)} - {formatDate(entry.endDate, locale)}
                                                </p>
                                                {entry.sourceDocumentName ? (
                                                    <p className="mt-1 text-xs text-black/65 dark:text-white/65">{entry.sourceDocumentName}</p>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="pw-card p-6">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                <FileText className="h-4 w-4 text-[#19b870]" />
                                {copy.documentsArea}
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
                                                                label={t.wallet.preview || 'Preview'}
                                                                lockedLabel={t.wallet.upgradeToPlusPreview || 'Upgrade to Plus to preview PDFs'}
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
