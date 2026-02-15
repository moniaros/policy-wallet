"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/useResponsive"
import { MobilePolicyDetails } from "@/components/wallet/MobilePolicyDetails"
import { AddToWallet } from "./AddToWallet"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"
import { DeletePolicy } from "@/components/wallet/DeletePolicy"
import { PolicyAnalysisTabs } from "./PolicyAnalysisTabs"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { AIUsageWidget } from "./AIUsageWidget"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { Calendar, Download, FileText, Phone, Shield, Sparkles, TrendingUp } from "lucide-react"

interface PolicyDetailsClientProps {
    policy: any
    walletPolicy: any
    serializedShares: any[]
    aiUsageStats: any
    statusLabel: string
    statusColor: any
    daysLeft: number
    holderName: string
    shouldOpenWallet: boolean
    isOwner: boolean
    relationshipId?: string | null
    t: any
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
}: PolicyDetailsClientProps) {
    const isMobile = useIsMobile()
    const [showMobileWalletModal, setShowMobileWalletModal] = useState(shouldOpenWallet)
    const [activeTab, setActiveTab] = useState<"analysis" | "qa" | "collaboration">("analysis")
    const language = t.common?.locale?.startsWith('el') ? 'el' : 'en'

    const copy = {
        nextBestActions: language === 'el' ? 'Επόμενες ενέργειες' : 'Next best actions',
        askStarter: language === 'el' ? 'Κάντε μια ερώτηση στο AI' : 'Ask one starter question',
        sharePolicy: language === 'el' ? 'Κοινοποίηση σε σύμβουλο ή οικογένεια' : 'Share with agent or family',
        reviewRenewal: language === 'el' ? 'Έλεγχος λήξης και ανανέωσης' : 'Review expiry and renewal',
        contactInsurer: language === 'el' ? 'Επικοινωνία με ασφαλιστή' : 'Contact insurer',
        requestRenewal: language === 'el' ? 'Αίτημα ανανέωσης' : 'Request renewal quote',
        renewalRequested: language === 'el' ? 'Το αίτημα ανανέωσης στάλθηκε.' : 'Renewal request sent.',
        noInsurerPhone: language === 'el' ? 'Δεν υπάρχει διαθέσιμο τηλέφωνο ασφαλιστή.' : 'No insurer phone number available.',
        documentsArea: language === 'el' ? 'Έγγραφα συμβολαίου' : 'Policy documents',
        shareCanceled: language === 'el' ? 'Η κοινοποίηση ακυρώθηκε.' : 'Share canceled.',
        shareUnavailable: language === 'el' ? 'Η κοινοποίηση δεν υποστηρίζεται.' : 'Share is not supported.',
        linkCopied: language === 'el' ? 'Ο σύνδεσμος αντιγράφηκε.' : 'Link copied.',
        copyFailed: language === 'el' ? 'Δεν ήταν δυνατή η αντιγραφή του συνδέσμου.' : 'Failed to copy the link.',
        tabAnalysis: language === 'el' ? 'Ανάλυση' : 'Analysis',
        tabQa: language === 'el' ? 'Ερωτήσεις AI' : 'AI Q&A',
        tabCollaboration: language === 'el' ? 'Συνεργασία' : 'Collaboration',
    }

    const getInsurerName = () => policy.acordData?.policy?.insurerName || policy.insurerName
    const getPolicyNumber = () => policy.acordData?.policy?.policyNumber || policy.policyNumber
    const getCoverageType = () => policy.acordData?.policy?.lineOfBusiness || policy.lineOfBusiness
    const getPremiumAmount = () => {
        const aiPremium = policy.acordData?.policy?.premium?.amount
        if (aiPremium) return Number(aiPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }
    const getPremiumCurrency = () => policy.acordData?.policy?.premium?.currency || policy.premiumCurrency || 'EUR'
    const parseDate = (value: unknown): Date | null => {
        if (!value) return null
        const d = new Date(String(value))
        return Number.isNaN(d.getTime()) ? null : d
    }
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
    const insuredNames = Array.from(
        new Set(
            [
                policy?.acordData?.insured?.name,
                policy?.acordData?.policyholder?.name,
                policy?.acordData?.policy?.insuredName,
                (policy?.acordData?.customerName && policy?.acordData?.customerSurname)
                    ? `${policy.acordData.customerName} ${policy.acordData.customerSurname}`
                    : null,
                ...(Array.isArray(policy?.acordData?.insureds) ? policy.acordData.insureds.map((i: any) => i?.name || `${i?.firstName || ''} ${i?.lastName || ''}`) : []),
                ...(Array.isArray(policy?.acordData?.beneficiaries) ? policy.acordData.beneficiaries.map((i: any) => i?.name) : []),
            ]
                .map((v) => String(v || '').trim())
                .filter(Boolean)
        )
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

    const insurerPhone = policy.acordData?.policy?.insurerContact || ''
    const firstDocumentUrl = policy.documents?.[0]?.fileUrl

    const askAnchor = '#policy-qa'

    const handleMobileShare = async () => {
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
        window.open(firstDocumentUrl, '_blank', 'noopener,noreferrer')
    }

    const handleRenewalRequest = () => {
        toast.success(copy.renewalRequested)
    }

    if (isMobile) {
        const mobilePolicy = {
            ...policy,
            status: walletPolicy.status,
            insurerName: policy.insurerName,
            documents: policy.documents || [],
            gapInstances: policy.gapInstances || [],
        }

        return (
            <>
                <MobilePolicyDetails
                    policy={mobilePolicy}
                    t={t}
                    onDownloadDocument={(url) => window.open(url, '_blank')}
                    onShare={handleMobileShare}
                    onAddToWallet={() => setShowMobileWalletModal(true)}
                    initialShares={serializedShares || []}
                    isOwner={isOwner}
                />

                <AddToWallet
                    policy={walletPolicy}
                    holderName={holderName}
                    plateNumber={policy.acordData?.vehicle?.plateNumber}
                    open={showMobileWalletModal}
                    onOpenChange={setShowMobileWalletModal}
                    trigger={null}
                />
            </>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
                <nav className="flex items-center gap-2 mb-6 text-sm font-medium">
                    <Link href="/wallet" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200">
                        {t.wallet.title}
                    </Link>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-900 dark:text-white">{getPolicyNumber()}</span>
                </nav>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/50 overflow-hidden">
                    <div className="p-8 lg:p-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4 flex-wrap">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                        {statusLabel}
                                    </span>
                                    {computedDaysLeft >= 0 && computedDaysLeft <= 30 && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t.wallet.expiresIn} {computedDaysLeft} {t.wallet.days}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                            {getInsurerName()}
                                        </h1>
                                        <p className="text-base lg:text-lg text-emerald-600 dark:text-emerald-400 font-semibold mt-1 uppercase tracking-wide">
                                            {t.policyTypes[getCoverageType() as keyof typeof t.policyTypes] || getCoverageType()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-xl border border-emerald-400/20 min-w-[220px]">
                                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {t.wallet.annualPremium}
                                </p>
                                <p className="text-3xl font-black text-white leading-none">
                                    {getPremiumAmount().toLocaleString(t.common.locale || 'el-GR', { style: 'currency', currency: getPremiumCurrency() })}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t.wallet.policyId}</p>
                                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                        {getPolicyNumber()}
                                    </p>
                                </div>

                                {policy.acordData?.vehicle?.plateNumber ? (
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t.wallet.plateNumber}</p>
                                        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                            {policy.acordData.vehicle.plateNumber}
                                        </p>
                                    </div>
                                ) : null}

                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t.wallet.starts}</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(getStartDate()).toLocaleDateString(t.common.locale || 'el-GR')}</p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t.wallet.ends}</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(getEndDate()).toLocaleDateString(t.common.locale || 'el-GR')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {t.wallet.summary}
                            </h2>
                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">{policy.coverageSummary || t.wallet.summaryFallback}</div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setActiveTab("analysis")}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        activeTab === "analysis"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                >
                                    {copy.tabAnalysis}
                                </button>
                                <button
                                    onClick={() => setActiveTab("qa")}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        activeTab === "qa"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                >
                                    {copy.tabQa}
                                </button>
                                <button
                                    onClick={() => setActiveTab("collaboration")}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        activeTab === "collaboration"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                >
                                    {copy.tabCollaboration}
                                </button>
                            </div>
                        </div>

                        {activeTab === "analysis" && (
                            <PolicyAnalysisTabs
                                policyId={policy.id}
                                gaps={policy.gapInstances.map((g: any) => ({
                                    id: g.id,
                                    aiExplanation: g.aiExplanation || null,
                                    aiExplanationEl: g.aiExplanationEl || null,
                                    aiSuggestion: g.aiSuggestion || null,
                                    aiSuggestionEl: g.aiSuggestionEl || null,
                                    definition: {
                                        title: g.definition?.title || t.analysis.unknownGap || "Unknown Gap",
                                        severity: g.definition?.severity || "medium",
                                    },
                                }))}
                                acordData={policy.acordData}
                                t={t}
                                lastAnalyzedAt={policy.lastAnalyzedAt}
                            />
                        )}

                        {activeTab === "qa" && (
                            <div id="policy-qa">
                                <PolicyQA policyId={policy.id} />
                            </div>
                        )}

                        {activeTab === "collaboration" && (
                            <CollaborationTimeline
                                policyId={policy.id}
                                relationshipId={relationshipId || null}
                                viewerRole={isOwner ? "policyholder" : "agent"}
                            />
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">{copy.nextBestActions}</h3>
                            <div className="space-y-3">
                                <a href={askAnchor} className="block w-full p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                                    {copy.askStarter}
                                </a>
                                <button
                                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
                                    className="block w-full p-3 rounded-xl border border-teal-200 dark:border-teal-800 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left cursor-pointer"
                                >
                                    {copy.sharePolicy}
                                </button>
                                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                    {copy.reviewRenewal}
                                </div>
                            </div>
                        </div>

                        <AIUsageWidget count={aiUsageStats.count} limit={aiUsageStats.limit} t={t} />

                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">{t.wallet.actionItems}</h3>
                            <div className="space-y-3">
                                {computedDaysLeft <= 30 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-xl text-sm font-semibold border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                                        <Calendar className="w-5 h-5 flex-shrink-0" />
                                        <span>{t.wallet.reviewRenewal}</span>
                                    </div>
                                )}

                                <button onClick={handleCallInsurer} className="w-full p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 rounded-xl text-sm font-semibold border border-teal-200 dark:border-teal-800/50 hover:shadow-md transition-all duration-200 flex items-center gap-3 cursor-pointer">
                                    <Phone className="w-5 h-5 flex-shrink-0" />
                                    <span>{copy.contactInsurer}</span>
                                </button>

                                <button onClick={handleRenewalRequest} className="w-full p-4 bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 rounded-xl text-sm font-semibold border border-violet-200 dark:border-violet-800/50 hover:shadow-md transition-all duration-200 flex items-center gap-3 cursor-pointer">
                                    <Sparkles className="w-5 h-5 flex-shrink-0" />
                                    <span>{copy.requestRenewal}</span>
                                </button>

                                <button onClick={handleDownloadPrimaryDoc} className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-xl text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50 hover:shadow-md transition-all duration-200 flex items-center gap-3 cursor-pointer">
                                    <Download className="w-5 h-5 flex-shrink-0" />
                                    <span>{t.wallet.downloadContract}</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                                {language === 'el' ? 'Ασφαλισμένοι' : 'Insured people'}
                            </h3>
                            {insuredNames.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {language === 'el' ? 'Δεν βρέθηκαν ονόματα ασφαλισμένων.' : 'No insured names found.'}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {insuredNames.map((name) => (
                                        <li key={name} className="text-sm text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                                {language === 'el' ? 'Ιστορικό ανανεώσεων' : 'Renewal history'}
                            </h3>
                            {renewalHistory.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {language === 'el' ? 'Δεν υπάρχει ακόμη ιστορικό ανανεώσεων.' : 'No renewal history available yet.'}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {renewalHistory.map((entry: any) => (
                                        <li key={entry.id} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {entry.startDate ? new Date(entry.startDate).toLocaleDateString(t.common.locale || 'el-GR') : '-'} - {entry.endDate ? new Date(entry.endDate).toLocaleDateString(t.common.locale || 'el-GR') : '-'}
                                            </p>
                                            {entry.sourceDocumentName ? (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.sourceDocumentName}</p>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {copy.documentsArea}
                            </h3>

                            {policy.documents.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.wallet.noDocuments}</p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {policy.documents.map((doc: any) => (
                                        <li key={doc.id}>
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group transition-all duration-200 cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.fileName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.wallet.contract}</p>
                                                </div>
                                                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <AddToWallet policy={walletPolicy} holderName={holderName} initialOpen={shouldOpenWallet} plateNumber={policy.acordData?.vehicle?.plateNumber} />

                        <CollaborationPanel policyId={policy.id} policyNumber={getPolicyNumber()} initialShares={serializedShares || []} isOwner={isOwner} />

                        {isOwner && <DeletePolicy policyId={policy.id} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
