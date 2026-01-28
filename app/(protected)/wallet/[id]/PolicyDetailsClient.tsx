"use client"

import { useIsMobile } from "@/hooks/useResponsive"
import { MobilePolicyDetails } from "@/components/wallet/MobilePolicyDetails"
import { AddToWallet } from "./AddToWallet"
import { SharePolicy } from "./SharePolicy"
import { DeletePolicy } from "./DeletePolicy"
import { PolicyAnalysisTabs } from "./PolicyAnalysisTabs"
import { AIUsageWidget } from "./AIUsageWidget"
import Link from "next/link"
import { useState } from "react"

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

    if (isMobile) {
        // Prepare policy object for mobile component (merging DB data with UI status)
        const mobilePolicy = {
            ...policy,
            status: walletPolicy.status, // Use calculated status
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
                            // Fallback or toast
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
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
                <Link href="/wallet" className="text-stone-400 hover:text-teal-600 transition-colors">{t.wallet.title}</Link>
                <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-stone-900 dark:text-stone-100">{policy.policyNumber}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Card */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <div className="p-8 border-b border-stone-100 dark:border-stone-700">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                            {statusLabel}
                                        </span>
                                        {daysLeft >= 0 && daysLeft <= 30 && (
                                            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                {t.wallet.expiresIn} {daysLeft} {t.wallet.days}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                                        {policy.insurerName}
                                    </h1>
                                    <p className="text-xl text-stone-500 font-medium mt-1 uppercase tracking-tighter">{policy.lineOfBusiness} Protection</p>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-2xl border border-stone-100 dark:border-stone-700 text-center md:min-w-[200px]">
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{t.wallet.annualPremium}</p>
                                    <p className="text-3xl font-black text-stone-900 dark:text-white leading-none">
                                        {Number(policy.premiumAmount?.toString() || 0).toLocaleString('el-GR', { style: 'currency', currency: policy.premiumCurrency || 'EUR' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h2 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-6">{t.wallet.coverageHighlights}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-stone-100">Standard Coverage</p>
                                        <p className="text-sm text-stone-500 mt-1">Full protection based on policy specifications.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-stone-100">Direct Support</p>
                                        <p className="text-sm text-stone-500 mt-1">24/7 emergency assistance via insurer.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-stone-50 dark:bg-stone-900/30 rounded-3xl p-8 border border-stone-100 dark:border-stone-800">
                        <h2 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-4">{t.wallet.summary}</h2>
                        <div className="prose dark:prose-invert max-w-none text-stone-600 dark:text-stone-400 leading-relaxed">
                            {policy.coverageSummary || t.wallet.summaryFallback}
                        </div>
                    </div>

                    {/* Combined AI Analysis & Insights */}
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
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Usage Widget */}
                    <AIUsageWidget
                        count={aiUsageStats.count}
                        limit={aiUsageStats.limit}
                        t={t}
                    />

                    {/* Quick Stats Sidebar */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t.wallet.policyId}</p>
                            <p className="font-mono text-sm text-stone-900 dark:text-stone-100 font-bold bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">{policy.policyNumber}</p>
                        </div>

                        {policy.acordData?.vehicle?.plateNumber && (
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t.wallet.plateNumber || "Plate Number"}</p>
                                <div className="font-mono text-sm text-stone-900 dark:text-stone-100 font-bold bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700 flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-blue-700 text-[10px] text-white font-bold border border-blue-800">GR</span>
                                    {policy.acordData.vehicle.plateNumber}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{t.wallet.starts}</p>
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{new Date(policy.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{t.wallet.ends}</p>
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{new Date(policy.endDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <hr className="border-stone-100 dark:border-stone-700" />

                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">{t.wallet.actionItems}</p>
                            <div className="space-y-3">
                                {daysLeft <= 30 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-800/50">
                                        ⚠️ {t.wallet.reviewRenewal}
                                    </div>
                                )}
                                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold border border-teal-100 dark:border-teal-800/50">
                                    ✓ {t.wallet.downloadContract}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add to Wallet */}
                    <AddToWallet
                        policy={walletPolicy}
                        holderName={holderName}
                        initialOpen={shouldOpenWallet}
                        plateNumber={policy.acordData?.vehicle?.plateNumber}
                    />

                    {/* Documents Sidebar */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">{t.wallet.documents}</h3>
                            <button className="text-teal-600 hover:text-teal-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>

                        {policy.documents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-xs text-stone-400 italic">{t.wallet.noDocuments}</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {policy.documents.map((doc: any) => (
                                    <li key={doc.id}>
                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-700/50 group transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-900 flex items-center justify-center text-stone-400 group-hover:text-teal-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{doc.fileName}</p>
                                                <p className="text-xs text-stone-400 uppercase tracking-widest">Contract</p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Share Policy */}
                    {isOwner && <SharePolicy policyId={policy.id} initialShares={serializedShares || []} />}

                    {/* Delete Policy */}
                    {isOwner && <DeletePolicy policyId={policy.id} />}
                </div>
            </div>
        </div >
    )
}
