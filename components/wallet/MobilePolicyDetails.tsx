"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSwipe } from '@/hooks/useSwipe'
import { hapticFeedback } from '@/utils/haptic'
import { PolicyQA } from '@/components/wallet/PolicyQA'
import { DeletePolicy } from '@/components/wallet/DeletePolicy'
import { analyzeGaps } from '@/app/(protected)/wallet/actions'
import { LimitReachedModal } from '@/components/account/LimitReachedModal'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'
import { CollaborationPanel, Share } from '@/components/wallet/CollaborationPanel'
import {
    CarIcon,
    HeartIcon,
    HomeIcon,
    ShieldIcon,
    PlaneIcon,
    ScaleIcon,
    PawIcon,
    BriefcaseIcon,
    DocumentIcon,
} from '@/components/icons/PolicyIcons'

const POLICY_ICONS: Record<string, any> = {
    motor: CarIcon,
    vehicle: CarIcon,
    life: ShieldIcon,
    home: HomeIcon,
    health: HeartIcon,
    travel: PlaneIcon,
    liability: ScaleIcon,
    pet: PawIcon,
    professional: BriefcaseIcon,
    other: DocumentIcon,
}

interface MobilePolicyDetailsProps {
    policy: any
    t: any
    onDownloadDocument: (url: string) => void
    onShare: () => void
    onAddToWallet: () => void
    initialShares?: Share[]
    isOwner?: boolean
}

export function MobilePolicyDetails({
    policy,
    t,
    onDownloadDocument,
    onShare,
    onAddToWallet,
    initialShares,
    isOwner
}: MobilePolicyDetailsProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'coverage' | 'documents' | 'assistant' | 'team'>('overview')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [gapLimitReached, setGapLimitReached] = useState(false)

    const lang = t?.lang === 'el' ? 'el' : 'en'
    const locale = lang === 'el' ? 'el-GR' : 'en-US'

    const copy = useMemo(() => ({
        assistant: lang === 'el' ? 'AI Βοηθός' : 'AI Assistant',
        runAnalysis: lang === 'el' ? 'Ανάλυση τώρα' : 'Analyze now',
        analyzing: lang === 'el' ? 'Ανάλυση...' : 'Analyzing...',
        noGaps: lang === 'el' ? 'Δεν εντοπίστηκαν κενά ακόμη.' : 'No gaps detected yet.',
        noDocs: lang === 'el' ? 'Δεν υπάρχουν έγγραφα.' : 'No documents found.',
        runAnalysisHint: lang === 'el' ? 'Τρέξε ανάλυση για να ελέγξεις την κάλυψη.' : 'Run analysis to check your coverage.',
        shareAria: lang === 'el' ? 'Κοινοποίηση συμβολαίου' : 'Share policy',
    }), [lang])

    const handleAnalyzeGaps = async () => {
        setIsAnalyzing(true)
        try {
            const result = await analyzeGaps(policy.id)
            if ('error' in result) {
                if (result.error === 'LIMIT_REACHED') {
                    setGapLimitReached(true)
                } else {
                    toast.error(result.error || (lang === 'el' ? 'Η ανάλυση απέτυχε' : 'Analysis failed'))
                    hapticFeedback.error()
                }
            } else if (result.success) {
                toast.success(result.message)
                hapticFeedback.success()
                router.refresh()
            } else {
                toast.error(result.message || (lang === 'el' ? 'Η ανάλυση ολοκληρώθηκε με θέματα' : 'Analysis completed with issues'))
            }
        } catch {
            toast.error(lang === 'el' ? 'Προέκυψε πρόβλημα' : 'Something went wrong')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const tabs: Array<{ id: 'overview' | 'coverage' | 'documents' | 'team' | 'assistant'; label: string }> = [
        { id: 'overview', label: t.wallet.verificationOverview || (lang === 'el' ? 'Επισκόπηση' : 'Overview') },
        { id: 'coverage', label: t.wallet.coverageHighlights || (lang === 'el' ? 'Καλύψεις' : 'Coverage') },
        { id: 'documents', label: t.wallet.documents || (lang === 'el' ? 'Έγγραφα' : 'Documents') },
        { id: 'team', label: t.wallet.team || (lang === 'el' ? 'Συνεργασία' : 'Collaboration') },
        { id: 'assistant', label: copy.assistant },
    ]

    const swipeRef = useSwipe(
        {
            onSwipeLeft: () => {
                const i = tabs.findIndex((tab) => tab.id === activeTab)
                if (i < tabs.length - 1) {
                    setActiveTab(tabs[i + 1].id)
                    hapticFeedback.selection()
                }
            },
            onSwipeRight: () => {
                const i = tabs.findIndex((tab) => tab.id === activeTab)
                if (i > 0) {
                    setActiveTab(tabs[i - 1].id)
                    hapticFeedback.selection()
                }
            }
        },
        { minSwipeDistance: 40 }
    )

    const Icon = POLICY_ICONS[policy.lineOfBusiness as string] || POLICY_ICONS.other

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-28" ref={swipeRef}>
            <div className="bg-white/95 dark:bg-stone-900/95 sticky top-0 z-20 border-b border-stone-200 dark:border-stone-800 backdrop-blur-md">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => {
                            hapticFeedback.tap()
                            router.back()
                        }}
                        className="p-2 -ml-2 text-stone-600 dark:text-stone-400 cursor-pointer"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-base font-bold text-stone-900 dark:text-white truncate max-w-[200px]">{policy.insurerName}</h1>
                    <button
                        onClick={() => {
                            hapticFeedback.impact()
                            onShare()
                        }}
                        className="p-2 -mr-2 text-teal-600 dark:text-teal-400 cursor-pointer"
                        aria-label={copy.shareAria}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>

                <div className="flex px-4 overflow-x-auto hide-scrollbar gap-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab.id
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-stone-500 dark:text-stone-400'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-5">
                {activeTab === 'overview' && (
                    <div className="space-y-5">
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-700 text-white shadow-sm">
                            <div className="flex items-start justify-between">
                                <Icon className="w-10 h-10 text-white/90" />
                                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-white/20">{policy.status}</span>
                            </div>
                            <div className="mt-5">
                                <p className="text-xs uppercase tracking-wider text-white/80 mb-1">{t.wallet.policyNumber}</p>
                                <p className="text-xl font-mono font-bold tracking-tight">{policy.policyNumber}</p>
                            </div>
                            <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-white/80 mb-1">{t.wallet.premium}</p>
                                    <p className="text-sm font-bold">
                                        {Number(policy.premiumAmount || 0).toLocaleString(locale, {
                                            style: 'currency',
                                            currency: policy.premiumCurrency || 'EUR'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-white/80 mb-1">{t.wallet.ends}</p>
                                    <p className="text-sm font-bold">{policy.endDate ? new Date(policy.endDate).toLocaleDateString(locale) : '-'}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onAddToWallet}
                            className="w-full py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                            {t.wallet.addPolicy}
                        </button>

                        <DeletePolicy policyId={policy.id} />
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="space-y-5">
                        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800">
                            <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider mb-3">{t.wallet.summary}</h3>
                            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{policy.coverageSummary || t.wallet.summaryFallback}</p>
                        </div>

                        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">{t.wallet.detectedGaps || 'Detected Gaps'}</h3>
                                <button
                                    onClick={handleAnalyzeGaps}
                                    disabled={isAnalyzing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    {isAnalyzing ? copy.analyzing : copy.runAnalysis}
                                </button>
                            </div>

                            {policy.gapInstances?.length > 0 ? (
                                <div className="space-y-3">
                                    {policy.gapInstances.map((gap: any) => (
                                        <div key={gap.id} className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">{gap.definition?.title || t.analysis.gapDetected}</p>
                                            <p className="text-xs text-amber-700 dark:text-amber-300">{gap.aiExplanation}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-7 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
                                    <p className="text-sm text-stone-500 dark:text-stone-400">{copy.noGaps}</p>
                                    <p className="text-xs text-stone-400 mt-1">{copy.runAnalysisHint}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-3">
                        {policy.documents?.length === 0 ? (
                            <div className="text-center py-10 text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">{copy.noDocs}</div>
                        ) : (
                            policy.documents?.map((doc: any) => (
                                <button
                                    key={doc.id}
                                    onClick={() => onDownloadDocument(doc.fileUrl)}
                                    className="w-full bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center gap-3 active:scale-[0.98] transition-all text-left cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                        <DocumentIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-stone-900 dark:text-white truncate text-sm">{doc.fileName}</p>
                                        <p className="text-xs text-stone-500 mt-1">{new Date(doc.uploadedAt).toLocaleDateString(locale)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'team' && (
                    <CollaborationPanel
                        policyId={policy.id}
                        policyNumber={policy.policyNumber}
                        initialShares={initialShares || []}
                        isOwner={!!isOwner}
                    />
                )}

                {activeTab === 'assistant' && <PolicyQA policyId={policy.id} />}
            </div>

            <LimitReachedModal
                isOpen={gapLimitReached}
                reason="gap_limit"
                language={lang}
                onDismiss={() => setGapLimitReached(false)}
            />
        </div>
    )
}
