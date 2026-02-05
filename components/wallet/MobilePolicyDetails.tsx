"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSwipe } from '@/hooks/useSwipe'
import { hapticFeedback } from '@/utils/haptic'
import type { Policy } from './types'
import {
    CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon, ScaleIcon, DocumentIcon, PawIcon, BriefcaseIcon
} from '@/components/icons/PolicyIcons'

const PolicyIcons: Record<string, any> = {
    vehicle: CarIcon,
    life: HeartIcon,
    home: HomeIcon,
    health: HeartIcon,
    travel: PlaneIcon,
    liability: ScaleIcon,
    pet: PawIcon,
    professional: BriefcaseIcon,
    other: ShieldIcon
}

// Helper for status colors
const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
        case 'expiring_soon': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
        case 'expired': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
        default: return 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
    }
}

interface MobilePolicyDetailsProps {
    policy: any // Using specific type would be better but for implementation speed we match the page data structure
    t: any
    onDownloadDocument: (url: string) => void
    onShare: () => void
    onAddToWallet: () => void
}

import { PolicyQA } from "@/components/wallet/PolicyQA"
import { DeletePolicy } from "@/components/wallet/DeletePolicy"

export function MobilePolicyDetails({
    policy,
    t,
    onDownloadDocument,
    onShare,
    onAddToWallet
}: MobilePolicyDetailsProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'coverage' | 'documents' | 'assistant'>('overview')

    // Swipe between tabs
    const swipeRef = useSwipe({
        onSwipeLeft: () => {
            if (activeTab === 'overview') setActiveTab('coverage')
            else if (activeTab === 'coverage') setActiveTab('documents')
            else if (activeTab === 'documents') setActiveTab('assistant')
            hapticFeedback.selection()
        },
        onSwipeRight: () => {
            if (activeTab === 'assistant') setActiveTab('documents')
            else if (activeTab === 'documents') setActiveTab('coverage')
            else if (activeTab === 'coverage') setActiveTab('overview')
            hapticFeedback.selection()
        }
    })

    const statusColor = getStatusColor(policy.status)
    const Icon = PolicyIcons[policy.lineOfBusiness as keyof typeof PolicyIcons] || PolicyIcons.other

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-20" ref={swipeRef}>
            {/* Header */}
            <div className="bg-white dark:bg-stone-800 sticky top-0 z-10 border-b border-stone-200 dark:border-stone-700 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => {
                            hapticFeedback.tap()
                            router.back()
                        }}
                        className="p-2 -ml-2 text-stone-600 dark:text-stone-400"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-stone-900 dark:text-white truncate max-w-[200px]">
                        {policy.insurerName}
                    </h1>
                    <button
                        onClick={() => {
                            hapticFeedback.impact()
                            onShare()
                        }}
                        className="p-2 -mr-2 text-teal-600 dark:text-teal-400"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 min-w-[24%] pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview'
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                            : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
                            }`}
                    >
                        {t.wallet.verificationOverview || 'Overview'}
                    </button>
                    <button
                        onClick={() => setActiveTab('coverage')}
                        className={`flex-1 min-w-[24%] pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'coverage'
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                            : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
                            }`}
                    >
                        {t.wallet.coverageHighlights || 'Coverage'}
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 min-w-[24%] pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'documents'
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                            : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
                            }`}
                    >
                        {t.wallet.documents || 'Docs'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assistant')}
                        className={`flex-1 min-w-[24%] pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assistant'
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                            : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
                            }`}
                    >
                        AI Help
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Policy Card */}
                        <div className={`p-6 rounded-3xl bg-gradient-to-br ${policy.lineOfBusiness === 'vehicle' ? 'from-teal-500 to-emerald-600' :
                            policy.lineOfBusiness === 'health' ? 'from-rose-500 to-pink-600' :
                                policy.lineOfBusiness === 'home' ? 'from-blue-500 to-indigo-600' :
                                    'from-stone-700 to-stone-900'
                            } text-white shadow-lg`}>
                            <div className="flex items-start justify-between">
                                <Icon className="w-12 h-12 text-white/90" />
                                <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {policy.status}
                                </span>
                            </div>
                            <div className="mt-6">
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{t.wallet.policyNumber}</p>
                                <p className="text-2xl font-mono font-bold tracking-tight">{policy.policyNumber}</p>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-end">
                                <div>
                                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{t.wallet.premium}</p>
                                    <p className="text-xl font-bold">
                                        {Number(policy.premiumAmount || 0).toLocaleString('el-GR', {
                                            style: 'currency',
                                            currency: policy.premiumCurrency || 'EUR'
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{t.wallet.ends}</p>
                                    <p className="text-sm font-bold">
                                        {new Date(policy.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{t.wallet.startDate}</p>
                                <p className="font-bold text-stone-900 dark:text-white">
                                    {new Date(policy.startDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{t.wallet.expiresIn}</p>
                                <p className={`font-bold ${(Date.parse(policy.endDate) - Date.now()) / (86400000) < 30
                                    ? 'text-amber-600'
                                    : 'text-stone-900 dark:text-white'
                                    }`}>
                                    {Math.ceil((Date.parse(policy.endDate) - Date.now()) / (86400000))} {t.wallet.days}
                                </p>
                            </div>
                        </div>

                        {/* Add to Wallet Button */}
                        <button
                            onClick={onAddToWallet}
                            className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {t.wallet.addPolicy}
                        </button>

                        {/* Delete Policy - Danger Zone */}
                        <DeletePolicy policyId={policy.id} />
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700">
                            <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-4">{t.wallet.summary}</h3>
                            <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-sm">
                                {policy.coverageSummary || t.wallet.summaryFallback}
                            </p>
                        </div>

                        {/* Gaps / Recommendations */}
                        {policy.gapInstances?.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest px-1">{t.wallet.detectedGaps || 'Detected Gaps'}</h3>
                                {policy.gapInstances.map((gap: any) => (
                                    <div key={gap.id} className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="text-sm font-bold text-amber-800 dark:text-amber-200">
                                                {gap.definition?.title || t.analysis.gapDetected}
                                            </span>
                                        </div>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                            {gap.aiExplanation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        {policy.documents?.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <p>{t.wallet.noDocuments}</p>
                            </div>
                        ) : (
                            policy.documents?.map((doc: any) => (
                                <button
                                    key={doc.id}
                                    onClick={() => onDownloadDocument(doc.fileUrl)}
                                    className="w-full bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center gap-4 active:scale-[0.98] transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-bold text-stone-900 dark:text-white truncate">
                                            {doc.fileName}
                                        </p>
                                        <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'assistant' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <PolicyQA policyId={policy.id} />
                    </div>
                )}
            </div>
        </div>
    )
}
