"use client"

import React, { useState } from 'react'
import {
    Copy,
    Download,
    RefreshCw,
    AlertTriangle,
    Shield,
    ChevronRight,
    TrendingUp,
    Zap,
    ExternalLink
} from 'lucide-react'
import { Policy, ProtectionProfile__EXT } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

// --- Utility: Status Rendering ---
const StatusBadge = ({ status, daysToRenewal }: { status: Policy['status'], daysToRenewal?: number }) => {
    switch (status) {
        case 'active':
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#228B22] text-white tracking-wide uppercase shadow-sm">
                    Active
                </span>
            )
        case 'renewal_window':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white uppercase animate-pulse shadow-sm">
                    <RefreshCw className="w-3 h-3" />
                    Renewal: {daysToRenewal} Days
                </span>
            )
        case 'lapsed':
            return (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-400 text-slate-800 uppercase">
                        Lapsed
                    </span>
                    <button className="text-xs font-medium text-blue-600 hover:underline">
                        Reactivate
                    </button>
                </div>
            )
        case 'cancelled':
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-500 uppercase">
                    Cancelled
                </span>
            )
        default:
            return null
    }
}

// --- Component 1: Policy View List ---
interface PolicyListProps {
    policies: Policy[]
    onAnalyze: (policyId: string) => void
}

export function AgentPolicyList({ policies, onAnalyze }: PolicyListProps) {
    const { language } = useLanguage()

    // Constants for Bilingual Labels
    const LABELS = {
        PREMIUM: language === 'el' ? 'ΑΣΦΑΛΙΣΤΡΑ' : 'PREMIUM',
        VIEW_DETAILS: language === 'el' ? 'ΛΕΠΤΟΜΕΡΕΙΕΣ' : 'DETAILS',
        COPY_LINK: language === 'el' ? 'Αντιγραφή Συνδέσμου' : 'Copy Share Link',
        DOWNLOAD: language === 'el' ? 'Λήψη Προγράμματος' : 'Download Schedule',
        RENEW: language === 'el' ? 'Ανανέωση' : 'Trigger Renewal Quote'
    }

    // Helper to calculate days to renewal
    const getDaysToRenewal = (policy: Policy) => {
        if (!policy.renewalDate) return 0
        const diff = new Date(policy.renewalDate).getTime() - new Date().getTime()
        return Math.ceil(diff / (1000 * 3600 * 24))
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950">
            {policies.map(policy => (
                <div
                    key={policy.id}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                    {/* Primary Slots Header */}
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            {/* Logo Slot */}
                            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                                {policy.insurerRef.logoUrl ? (
                                    <img src={policy.insurerRef.logoUrl} alt={policy.insurerRef.name} className="w-full h-full object-cover" />
                                ) : (
                                    policy.insurerRef.name.substring(0, 2)
                                )}
                            </div>

                            {/* Dynamic Status */}
                            <StatusBadge
                                status={policy.status}
                                daysToRenewal={getDaysToRenewal(policy)}
                            />
                        </div>

                        {/* Policy Data */}
                        <div>
                            <span className="font-mono text-xs text-slate-500 block mb-0.5">
                                {policy.policyNumber}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {policy.premium.gross.currencyCode === 'EUR' ? '€' : '$'}
                                    {policy.premium.gross.amount.toLocaleString()}
                                </span>
                                <span className="text-[10px] uppercase font-semibold text-slate-400">
                                    {LABELS.PREMIUM}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Micro-Actions (Hover State) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex gap-2">
                            <button
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                title={LABELS.COPY_LINK}
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                title={LABELS.DOWNLOAD}
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            {policy.status === 'renewal_window' && (
                                <button
                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-amber-600"
                                    title={LABELS.RENEW}
                                >
                                    <Zap className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => onAnalyze(policy.id)}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                        >
                            {LABELS.VIEW_DETAILS} <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

// --- Component 2: Policy Analysis (Gap Heatmap & AI) ---
interface AnalysisProps {
    profile: ProtectionProfile__EXT
}

export function ProtectionAnalysis({ profile }: AnalysisProps) {
    const { language } = useLanguage()

    // Underinsurance Threshold Alert
    const isUnderinsured = profile.protectionScore < 0.8
    const scoreColor = profile.protectionScore > 0.8 ? 'text-emerald-600' : profile.protectionScore > 0.5 ? 'text-amber-500' : 'text-red-600'

    return (
        <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Header / Score */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                    Protection Intelligence
                </h3>
                <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase block">Protection Score</span>
                    <span className={`text-2xl font-black ${scoreColor}`}>
                        {(profile.protectionScore * 100).toFixed(0)}/100
                    </span>
                </div>
            </div>

            {/* The Underinsurance Alert */}
            {isUnderinsured && (
                <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 p-4 rounded-r-lg flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <div>
                        <h4 className="font-bold text-red-900 dark:text-red-400 text-sm uppercase">
                            Critical Underinsurance Detected
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Current coverage limits are significantly below the recommended product offering baseline. Immediate review suggested.
                        </p>
                    </div>
                </div>
            )}

            {/* Gap Heatmap (Comparative Bar Chart) */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Gap Analysis
                </h4>
                <div className="space-y-3">
                    {profile.gaps.map(gap => (
                        <div key={gap.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-700 dark:text-slate-300">{gap.coverageType}</span>
                                <span className={gap.gapSeverity === 'critical' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                    gap: -{(gap.recommendedLimit - gap.currentLimit).toLocaleString()}
                                </span>
                            </div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                {/* Target (Behind) */}
                                <div className="absolute top-0 bottom-0 left-0 bg-slate-200 dark:bg-slate-700 w-full" />

                                {/* Current (Front) */}
                                <div
                                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${gap.gapSeverity === 'critical' ? 'bg-red-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${(gap.currentLimit / gap.recommendedLimit) * 100}%` }}
                                />

                                {/* Marker for recommended */}
                                <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-slate-400 z-10" />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>{gap.currentLimit.toLocaleString()}</span>
                                <span>Target: {gap.recommendedLimit.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Insights Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Automated Analysis */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase">
                        <Zap className="w-3 h-3" /> Automated Analysis
                    </div>
                    <div className="prose prose-sm prose-purple dark:prose-invert text-xs leading-relaxed bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/20">
                        {/* Render Markdown content roughly here */}
                        <div dangerouslySetInnerHTML={{ __html: profile.aiInsights.automatedAnalysis }} />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">
                        Generated: {new Date(profile.aiInsights.generatedAt).toLocaleTimeString()}
                    </p>
                </div>

                {/* Agent Commentary */}
                {profile.aiInsights.agentCommentary && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                            <Shield className="w-3 h-3" /> Agent Notes
                        </div>
                        <div className="prose prose-sm text-xs leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div dangerouslySetInnerHTML={{ __html: profile.aiInsights.agentCommentary }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
