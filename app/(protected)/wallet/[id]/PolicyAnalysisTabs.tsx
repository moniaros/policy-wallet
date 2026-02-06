"use client"

import React, { useState } from 'react'
import { AnalysisCard } from './AnalysisCard'

interface PolicyAnalysisTabsProps {
    acordData: any
    gaps: any[]
    policyId: string
    t: any
    lastAnalyzedAt?: string
}

export function PolicyAnalysisTabs({ acordData, gaps, policyId, t, lastAnalyzedAt }: PolicyAnalysisTabsProps) {
    const [activeTab, setActiveTab] = useState<'insights' | 'gaps'>('gaps')

    const hasAcordData = acordData && typeof acordData === 'object' && Object.keys(acordData).length > 0;

    // Helper to get explanation
    const getExplanation = (cov: any) => {
        if (!cov.explanation) return null;
        if (typeof cov.explanation === 'string') return cov.explanation;
        // Check preferred language from t (hacky guess based on known keys)
        const isGreek = t.wallet.title === 'Το πορτοφόλι μου';
        if (isGreek) return cov.explanation.el || cov.explanation.en;
        return cov.explanation.en || cov.explanation.el;
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
                <button
                    onClick={() => setActiveTab('gaps')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'gaps'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                        : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                >
                    {t.wallet.aiAnalysis || "Gap Analysis"}
                    {gaps.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full">
                            {gaps.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    disabled={!hasAcordData}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'insights'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                        : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                        } ${!hasAcordData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {t.wallet.aiPolicyInsights || "Policy Insights"}
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'gaps' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AnalysisCard
                            policyId={policyId}
                            gaps={gaps}
                        />
                    </div>
                )}

                {activeTab === 'insights' && hasAcordData && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white dark:bg-stone-800 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">{t.wallet.aiPolicyInsights}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800">
                                    {t.wallet.acordVerified}
                                </span>
                            </div>
                            {lastAnalyzedAt && (
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest hidden sm:inline-block">
                                    {t.wallet.lastCheck}: {new Date(lastAnalyzedAt).toLocaleDateString(t.common.locale || 'el-GR')}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t.wallet.verificationOverview}</p>
                                    <div className="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                                            {t.wallet.verificationDesc}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-stone-50 dark:bg-stone-900/30 rounded-xl">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{t.wallet.contractInsurer}</p>
                                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                                            {String((acordData as any).policy?.insurer || '')}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{t.wallet.premiumFound}</p>
                                        <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                            {String((acordData as any).policy?.premium?.amount || '')} {String((acordData as any).policy?.premium?.currency || '')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t.wallet.structuredCoverages}</p>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(acordData as any).coverages?.map((cov: any, idx: number) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 hover:border-teal-200 dark:hover:border-teal-900/50 transition-colors shadow-sm group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                                                        {(t.coverage_names as any)[cov.name] || String(cov.name || '')}
                                                    </span>
                                                    {cov.deductible && <span className="text-[9px] text-stone-400">{t.wallet.deductibleLabel} {String(cov.deductible)}</span>}
                                                </div>
                                                <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-black bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-lg">{String(cov.limit || '')}</span>
                                            </div>

                                            {/* Explanation */}
                                            {getExplanation(cov) && (
                                                <div className="mt-1 pt-2 border-t border-stone-50 dark:border-stone-700/50">
                                                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                                                        {getExplanation(cov)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!(acordData as any).coverages || (acordData as any).coverages.length === 0) && (
                                        <div className="p-4 text-center border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-2xl">
                                            <p className="text-xs text-stone-400 italic">{t.wallet.noCoveragesFound}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
