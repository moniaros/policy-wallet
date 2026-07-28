"use client"

import React, { useState } from 'react'
import { AnalysisCard } from './AnalysisCard'
import { useTabs } from '@/hooks/useTabs'
import { localizeCoverageName, toGreekUppercaseNoAccents } from '@/lib/i18n/text-format'
import { formatDateTime } from '@/lib/i18n/format'
import type { GapReportItem } from '@/lib/wallet/gap-report'

interface PolicyAnalysisTabsProps {
    acordData: any
    gaps: any[]
    policyId: string
    t: any
    lastAnalyzedAt?: string
    policyStatus?: string
    processingError?: { code?: string; message?: string } | null
    analysisPipeline?: {
        runId?: string
        status?: string
        missingSections?: string[]
        lastFailureCode?: string | null
        lastFailureAt?: string | null
    } | null
    report?: {
        items: GapReportItem[]
        reportUnlocked: boolean
    }
    tier?: "free" | "plus" | "pro"
    /** Free-tier owners: complimentary deep analysis still unused? (null = n/a) */
    trialAnalysisAvailable?: boolean | null
}

export function PolicyAnalysisTabs({
    acordData,
    gaps,
    policyId,
    t,
    lastAnalyzedAt,
    policyStatus,
    processingError,
    analysisPipeline,
    report,
    tier,
    trialAnalysisAvailable = null,
}: PolicyAnalysisTabsProps) {
    const [activeTab, setActiveTab] = useState<'insights' | 'gaps'>('gaps')
    // Real tab semantics (role tablist/tab, aria-selected, aria-controls, roving
    // tabindex + arrow keys), matching CoverageTabView/ClientDetailView — the tabs
    // were bare <button>s a screen reader announced as unrelated, with no selected
    // state or tab↔panel relationship.
    const { tabProps, panelProps } = useTabs(['gaps', 'insights'] as const, activeTab, setActiveTab)
    // Deduped count when the report view is active, else the raw gap count.
    const gapBadgeCount = report ? report.items.length : gaps.length

    const hasAcordData = acordData && typeof acordData === 'object' && Object.keys(acordData).length > 0
    const locale = t.common?.locale || 'el-GR'
    const isGreek = locale.startsWith('el')

    const getExplanation = (cov: any) => {
        if (!cov.explanation) return null
        if (typeof cov.explanation === 'string') return cov.explanation
        if (isGreek) return cov.explanation.el || cov.explanation.en
        return cov.explanation.en || cov.explanation.el
    }

    const heading = (text: string) => toGreekUppercaseNoAccents(text, locale)

    return (
        <div className="space-y-6">
            <div role="tablist" aria-label={t.wallet.analysisTabsLabel} className="flex p-1 bg-black/5 dark:bg-black rounded-2xl border border-black/10 dark:border-white/15">
                <button
                    {...tabProps('gaps')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTab === 'gaps'
                        ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm'
                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                >
                    {t.wallet.aiAnalysis}
                    {gapBadgeCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-kicker bg-red-100 text-red-700 rounded-full">
                            {gapBadgeCount}
                        </span>
                    )}
                </button>
                <button
                    {...tabProps('insights')}
                    disabled={!hasAcordData}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTab === 'insights'
                        ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm'
                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        } ${!hasAcordData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {t.wallet.aiPolicyInsights}
                </button>
            </div>

            <div {...panelProps} className="min-h-[400px] focus-visible:outline-none">
                {activeTab === 'gaps' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AnalysisCard
                            policyId={policyId}
                            gaps={gaps}
                            policyStatus={policyStatus}
                            processingError={processingError}
                            analysisPipeline={analysisPipeline}
                            report={report}
                            tier={tier}
                            trialAnalysisAvailable={trialAnalysisAvailable}
                        />
                    </div>
                )}

                {activeTab === 'insights' && hasAcordData && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white dark:bg-black rounded-3xl p-6 sm:p-8 border border-black/10 dark:border-white/15 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">{heading(t.wallet.aiPolicyInsights)}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/15 text-primary dark:text-mint text-kicker font-black uppercase tracking-widest border border-primary/30 dark:border-primary/35">
                                    {heading(t.wallet.acordVerified)}
                                </span>
                            </div>
                            {lastAnalyzedAt && (
                                <span className="text-kicker text-muted-foreground font-bold uppercase tracking-widest hidden sm:inline-block">
                                    {/* Athens-pinned + time-of-day: a freshness stamp
                                        an intermediary can trust, consistent with every
                                        other date the app renders. */}
                                    {heading(t.wallet.lastCheck)}: {formatDateTime(lastAnalyzedAt, isGreek ? 'el' : 'en')}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-kicker font-black text-muted-foreground uppercase tracking-widest mb-2">{heading(t.wallet.verificationOverview)}</p>
                                    <div className="p-4 bg-black/5 dark:bg-black rounded-2xl border border-black/10 dark:border-white/15">
                                        <p className="text-xs text-black/65 dark:text-white/70 leading-relaxed">
                                            {t.wallet.verificationDesc}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-black/5 dark:bg-black rounded-xl border border-black/10 dark:border-white/15">
                                        <p className="text-kicker font-black text-muted-foreground uppercase tracking-widest mb-1">{heading(t.wallet.contractInsurer)}</p>
                                        <p className="text-xs font-bold text-black dark:text-white truncate">
                                            {String((acordData as any).policy?.insurer || '')}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-primary/10 dark:bg-primary/15 rounded-xl border border-primary/30">
                                        <p className="text-kicker font-black text-muted-foreground uppercase tracking-widest mb-1">{heading(t.wallet.premiumFound)}</p>
                                        <p className="text-xs font-bold text-primary dark:text-mint">
                                            {String((acordData as any).policy?.premium?.amount || '')} {String((acordData as any).policy?.premium?.currency || '')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-kicker font-black text-muted-foreground uppercase tracking-widest mb-2">{heading(t.wallet.structuredCoverages)}</p>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(acordData as any).coverages?.map((cov: any, idx: number) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 hover:border-primary/35 transition-colors shadow-sm group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs text-black dark:text-white uppercase tracking-tight">
                                                        {localizeCoverageName(String(cov.name || ''), t.coverage_names as Record<string, string>)}
                                                    </span>
                                                    {cov.deductible && <span className="text-kicker text-muted-foreground">{t.wallet.deductibleLabel} {String(cov.deductible)}</span>}
                                                </div>
                                                <span className="font-mono text-xs text-primary dark:text-mint font-black bg-primary/10 dark:bg-primary/15 px-2 py-1 rounded-lg">{String(cov.limit || '')}</span>
                                            </div>

                                            {getExplanation(cov) && (
                                                <div className="mt-1 pt-2 border-t border-black/10 dark:border-white/15">
                                                    <p className="text-micro text-black/60 dark:text-white/65 leading-snug">
                                                        {getExplanation(cov)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!(acordData as any).coverages || (acordData as any).coverages.length === 0) && (
                                        <div className="p-4 text-center border-2 border-dashed border-black/10 dark:border-white/15 rounded-2xl">
                                            <p className="text-xs text-muted-foreground italic">{t.wallet.noCoveragesFound}</p>
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
