"use client"

import { useIsMobile } from "@/hooks/useResponsive"
import { MobilePolicyDetails } from "@/components/wallet/MobilePolicyDetails"
import { AddToWallet } from "./AddToWallet"
import { SharePolicy } from "./SharePolicy"
import { DeletePolicy } from "./DeletePolicy"
import { PolicyAnalysisTabs } from "./PolicyAnalysisTabs"
import { PolicyQA } from "./PolicyQA"
import { AIUsageWidget } from "./AIUsageWidget"
import Link from "next/link"
import { useState } from "react"
import { Shield, Calendar, FileText, TrendingUp, Download, Share2, Trash2 } from "lucide-react"

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
    t
}: PolicyDetailsClientProps) {
    const isMobile = useIsMobile()
    const [showMobileWalletModal, setShowMobileWalletModal] = useState(shouldOpenWallet)

    // Helper functions to prioritize AI-extracted data
    const getInsurerName = () => {
        return policy.acordData?.policy?.insurerName || policy.insurerName
    }

    const getPolicyNumber = () => {
        return policy.acordData?.policy?.policyNumber || policy.policyNumber
    }

    const getCoverageType = () => {
        return policy.acordData?.policy?.lineOfBusiness || policy.lineOfBusiness
    }

    const getPremiumAmount = () => {
        const aiPremium = policy.acordData?.policy?.premium?.amount
        if (aiPremium) return Number(aiPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }

    const getPremiumCurrency = () => {
        return policy.acordData?.policy?.premium?.currency || policy.premiumCurrency || 'EUR'
    }

    const getStartDate = () => {
        return policy.acordData?.policy?.effectiveDate || policy.startDate
    }

    const getEndDate = () => {
        return policy.acordData?.policy?.expirationDate || policy.endDate
    }

    if (isMobile) {
        const mobilePolicy = {
            ...policy,
            status: walletPolicy.status,
            insurerName: policy.insurerName,
            documents: policy.documents || [],
            gapInstances: policy.gapInstances || []
        }

        return (
            <>
                <MobilePolicyDetails
                    policy={mobilePolicy}
                    t={t}
                    onDownloadDocument={(url) => window.open(url, '_blank')}
                    onShare={() => {
                        if (typeof navigator !== 'undefined' && navigator.share) {
                            navigator.share({
                                title: policy.insurerName,
                                text: `Policy ${policy.policyNumber}`,
                                url: window.location.href
                            }).catch(console.error)
                        } else {
                            alert('Sharing not supported on this device')
                        }
                    }}
                    onAddToWallet={() => setShowMobileWalletModal(true)}
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
            {/* Liquid Glass Hero Section */}
            <div className="relative overflow-hidden">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-violet-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
                        <Link href="/wallet" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200">
                            {t.wallet.title}
                        </Link>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-slate-900 dark:text-white">{getPolicyNumber()}</span>
                    </nav>

                    {/* Hero Card - Liquid Glass Effect */}
                    <div className="relative group">
                        {/* Glass Card */}
                        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/50 overflow-hidden transition-all duration-500 hover:shadow-2xl">
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

                            <div className="relative p-8 lg:p-12">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                    {/* Left: Policy Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor.bg} ${statusColor.text} border ${statusColor.border} backdrop-blur-sm`}>
                                                {statusLabel}
                                            </span>
                                            {daysLeft >= 0 && daysLeft <= 30 && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {t.wallet.expiresIn} {daysLeft} {t.wallet.days}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                                                <Shield className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                                    {getInsurerName()}
                                                </h1>
                                                <p className="text-lg text-indigo-600 dark:text-indigo-400 font-semibold mt-1 uppercase tracking-wide">
                                                    {getCoverageType()} Protection
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Premium Amount */}
                                    <div className="relative">
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-2xl shadow-xl border border-emerald-400/20 min-w-[240px]">
                                            <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm" />
                                            <div className="relative">
                                                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    {t.wallet.annualPremium}
                                                </p>
                                                <p className="text-4xl font-black text-white leading-none">
                                                    {getPremiumAmount().toLocaleString('el-GR', { style: 'currency', currency: getPremiumCurrency() })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Policy Details Grid */}
                                <div className="mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="group cursor-pointer">
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                {t.wallet.policyId}
                                            </p>
                                            <p className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-colors duration-200">
                                                {getPolicyNumber()}
                                            </p>
                                        </div>

                                        {policy.acordData?.vehicle?.plateNumber && (
                                            <div className="group cursor-pointer">
                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                    {t.wallet.plateNumber || "Plate Number"}
                                                </p>
                                                <div className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-colors duration-200 flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-blue-600 text-xs text-white font-bold">GR</span>
                                                    {policy.acordData.vehicle.plateNumber}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                {t.wallet.starts}
                                            </p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                {new Date(getStartDate()).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                {t.wallet.ends}
                                            </p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                {new Date(getEndDate()).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Coverage Highlights */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-white/20 dark:border-slate-700/50 transition-all duration-300 hover:shadow-xl">
                            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                {t.wallet.coverageHighlights}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* AI-Extracted Coverage Details */}
                                {policy.acordData?.policy?.deductible && (
                                    <div className="flex items-start gap-4 group cursor-pointer">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Deductible</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {typeof policy.acordData.policy.deductible === 'object'
                                                    ? `${policy.acordData.policy.deductible.amount} ${policy.acordData.policy.deductible.currency || 'EUR'}`
                                                    : policy.acordData.policy.deductible}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {policy.acordData?.policy?.coverageLimit && (
                                    <div className="flex items-start gap-4 group cursor-pointer">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Coverage Limit</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {typeof policy.acordData.policy.coverageLimit === 'object'
                                                    ? `${policy.acordData.policy.coverageLimit.amount} ${policy.acordData.policy.coverageLimit.currency || 'EUR'}`
                                                    : policy.acordData.policy.coverageLimit}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Vehicle-specific data */}
                                {policy.acordData?.vehicle?.make && (
                                    <div className="flex items-start gap-4 group cursor-pointer">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Vehicle</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {policy.acordData.vehicle.make} {policy.acordData.vehicle.model} {policy.acordData.vehicle.year && `(${policy.acordData.vehicle.year})`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Insurer Contact */}
                                {policy.acordData?.policy?.insurerContact && (
                                    <div className="flex items-start gap-4 group cursor-pointer">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Direct Support</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {policy.acordData.policy.insurerContact}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Fallback for policies without detailed AI data */}
                                {!policy.acordData?.policy?.deductible && !policy.acordData?.policy?.coverageLimit && !policy.acordData?.vehicle?.make && (
                                    <>
                                        <div className="flex items-start gap-4 group cursor-pointer">
                                            <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Standard Coverage</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Full protection based on policy specifications.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 group cursor-pointer">
                                            <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Direct Support</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">24/7 emergency assistance via insurer.</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900/50 dark:to-indigo-950/30 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50">
                            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {t.wallet.summary}
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                                {policy.coverageSummary || t.wallet.summaryFallback}
                            </div>
                        </div>

                        {/* AI Analysis Tabs */}
                        <PolicyAnalysisTabs
                            policyId={policy.id}
                            gaps={policy.gapInstances.map((g: any) => ({
                                id: g.id,
                                aiExplanation: g.aiExplanation || null,
                                aiExplanationEl: g.aiExplanationEl || null,
                                aiSuggestion: g.aiSuggestion || null,
                                aiSuggestionEl: g.aiSuggestionEl || null,
                                definition: {
                                    title: g.definition?.title || "Unknown Gap",
                                    severity: g.definition?.severity || "medium"
                                }
                            }))}
                            acordData={policy.acordData}
                            t={t}
                            lastAnalyzedAt={policy.lastAnalyzedAt}
                        />

                        {/* Interactive Q&A */}
                        <PolicyQA policyId={policy.id} />
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* AI Usage Widget */}
                        <AIUsageWidget
                            count={aiUsageStats.count}
                            limit={aiUsageStats.limit}
                            t={t}
                        />

                        {/* Quick Actions */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                                {t.wallet.actionItems || "Quick Actions"}
                            </h3>
                            <div className="space-y-3">
                                {daysLeft <= 30 && (
                                    <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 rounded-xl text-sm font-semibold border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                                        <Calendar className="w-5 h-5 flex-shrink-0" />
                                        <span>{t.wallet.reviewRenewal}</span>
                                    </div>
                                )}
                                <button className="w-full p-4 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-800 dark:text-emerald-200 rounded-xl text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-200 flex items-center gap-3 cursor-pointer">
                                    <Download className="w-5 h-5 flex-shrink-0" />
                                    <span>{t.wallet.downloadContract}</span>
                                </button>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {t.wallet.documents}
                                </h3>
                                <button className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                </button>
                            </div>

                            {policy.documents.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.wallet.noDocuments}</p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {policy.documents.map((doc: any) => (
                                        <li key={doc.id}>
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all duration-200 cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.fileName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contract</p>
                                                </div>
                                                <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Add to Wallet */}
                        <AddToWallet
                            policy={walletPolicy}
                            holderName={holderName}
                            initialOpen={shouldOpenWallet}
                            plateNumber={policy.acordData?.vehicle?.plateNumber}
                        />

                        {/* Share & Delete */}
                        {isOwner && (
                            <div className="space-y-3">
                                <SharePolicy policyId={policy.id} initialShares={serializedShares || []} />
                                <DeletePolicy policyId={policy.id} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
