"use client"

import React, { useState } from 'react'
import { GapList } from '@/components/gaps/GapList'
import {
    Shield,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Activity,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    PieChart,
    BarChart3,
    Sparkles,
    Target,
    Zap
} from 'lucide-react'

interface CoverageInsightsClientProps {
    gaps: any[]
    stats: {
        critical: number
        high: number
        medium: number
        low: number
        healthScore: number
        totalGaps: number
        totalPolicies: number
        totalCoverage: number
    }
    coverageBreakdown: Array<{
        type: string
        amount: number
        percentage: number
    }>
    userLanguage: string
}

export function CoverageInsightsClient({
    gaps,
    stats,
    coverageBreakdown,
    userLanguage
}: CoverageInsightsClientProps) {
    const [selectedView, setSelectedView] = useState<'overview' | 'gaps' | 'breakdown'>('overview')
    const lang = userLanguage === 'el' ? 'el' : 'en'

    const copy = {
        title: {
            el: 'Ανάλυση Κάλυψης',
            en: 'Coverage Analysis'
        },
        subtitle: {
            el: 'Η τεχνητή νοημοσύνη μας ανέλυσε το χαρτοφυλάκιό σας',
            en: 'Our AI analyzed your portfolio'
        },
        healthScore: {
            el: 'Βαθμολογία Υγείας',
            en: 'Health Score'
        },
        criticalGaps: {
            el: 'Κρίσιμα Κενά',
            en: 'Critical Gaps'
        },
        highRisk: {
            el: 'Υψηλός Κίνδυνος',
            en: 'High Risk'
        },
        mediumRisk: {
            el: 'Μέτριος Κίνδυνος',
            en: 'Medium Risk'
        },
        lowRisk: {
            el: 'Χαμηλός Κίνδυνος',
            en: 'Low Risk'
        },
        totalPolicies: {
            el: 'Συνολικά Συμβόλαια',
            en: 'Total Policies'
        },
        totalCoverage: {
            el: 'Συνολική Κάλυψη',
            en: 'Total Coverage'
        },
        detectedGaps: {
            el: 'Εντοπισμένα Κενά',
            en: 'Detected Gaps'
        },
        coverageBreakdown: {
            el: 'Ανάλυση Κάλυψης',
            en: 'Coverage Breakdown'
        },
        viewOverview: {
            el: 'Επισκόπηση',
            en: 'Overview'
        },
        viewGaps: {
            el: 'Κενά Κάλυψης',
            en: 'Coverage Gaps'
        },
        viewBreakdown: {
            el: 'Ανάλυση',
            en: 'Breakdown'
        },
        insights: {
            el: 'Έξυπνες Πληροφορίες',
            en: 'Smart Insights'
        },
        recommendations: {
            el: 'Συστάσεις',
            en: 'Recommendations'
        }
    }

    // Determine health status
    const getHealthStatus = (score: number) => {
        if (score >= 90) return { label: lang === 'el' ? 'Άριστη' : 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-500' }
        if (score >= 75) return { label: lang === 'el' ? 'Καλή' : 'Good', color: 'text-green-500', bg: 'bg-green-500' }
        if (score >= 60) return { label: lang === 'el' ? 'Μέτρια' : 'Fair', color: 'text-amber-500', bg: 'bg-amber-500' }
        if (score >= 40) return { label: lang === 'el' ? 'Χαμηλή' : 'Poor', color: 'text-orange-500', bg: 'bg-orange-500' }
        return { label: lang === 'el' ? 'Κρίσιμη' : 'Critical', color: 'text-red-500', bg: 'bg-red-500' }
    }

    const healthStatus = getHealthStatus(stats.healthScore)

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Branded Header */}
                <div className="px-6 pt-12 pb-8 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                        <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                        <span className="text-2xl font-black tracking-tight text-teal-600">Wallet</span>
                    </div>
                </div>

                <div className="px-6 pb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
                            {lang === 'el' ? 'Αναφορά Νοημοσύνης' : 'Intelligence Report'}
                        </span>
                    </div>

                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        {lang === 'el' ? 'Ανάλυση' : 'Coverage'} <span className="text-stone-400 dark:text-stone-500 italic">Insights.</span>
                    </h1>

                    <p className="text-stone-500 text-lg max-w-xl mb-12">
                        {copy.subtitle[lang]}. {lang === 'el' ? 'Εντοπίσαμε' : 'We identified'} {stats.totalGaps} {lang === 'el' ? 'περιοχές όπου η προστασία σας θα μπορούσε να βελτιστοποιηθεί' : 'areas where your protection could be optimized'}.
                    </p>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                        {copy.title[lang]}
                    </h1>

                    <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-8">
                        {copy.subtitle[lang]}. {lang === 'el' ? 'Εντοπίσαμε' : 'We identified'} {stats.totalGaps} {lang === 'el' ? 'περιοχές όπου η προστασία σας θα μπορούσε να βελτιστοποιηθεί' : 'areas where your protection could be optimized'}.
                    </p>

                    {/* Stats Slider */}
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 snap-x mb-12">
                        <div className="flex-shrink-0 w-[180px] bg-gradient-to-br from-teal-600 to-teal-400 rounded-[32px] p-6 text-white shadow-xl shadow-teal-600/20 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-2">{copy.healthScore[lang]}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black tracking-tighter">{stats.healthScore}%</span>
                            </div>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{copy.criticalGaps[lang]}</span>
                            <span className="text-4xl font-black tracking-tighter text-red-500">{stats.critical}</span>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{copy.totalPolicies[lang]}</span>
                            <span className="text-4xl font-black tracking-tighter">{stats.totalPolicies}</span>
                        </div>
                    </div>
                </div>

                {/* View Selector */}
                <div className="flex flex-wrap gap-2 px-6 no-scrollbar overflow-x-auto pb-6 -mx-6">
                    {[
                        { key: 'overview', label: copy.viewOverview[lang], icon: Target },
                        { key: 'gaps', label: copy.viewGaps[lang], icon: AlertTriangle, count: stats.totalGaps },
                        { key: 'breakdown', label: copy.viewBreakdown[lang], icon: PieChart }
                    ].map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            onClick={() => setSelectedView(key as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedView === key
                                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xl'
                                : 'bg-white dark:bg-stone-900 text-stone-400 border border-stone-100 dark:border-stone-800'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content based on selected view */}
                {selectedView === 'overview' && (
                    <div className="space-y-8">
                        {/* Health Score Visualization */}
                        {/* Health Score Visualization */}
                        <div className="px-6">
                            <div className="bg-white dark:bg-stone-900 rounded-[32px] p-8 shadow-sm border border-stone-100 dark:border-stone-800">
                                <h2 className="text-xl font-black text-stone-900 dark:text-white mb-6">
                                    {copy.healthScore[lang]}
                                </h2>

                                {/* Progress bar */}
                                <div className="relative h-12 bg-stone-50 dark:bg-stone-800 rounded-2xl overflow-hidden mb-8">
                                    <div
                                        className={`absolute inset-y-0 left-0 bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-1000 ease-out`}
                                        style={{ width: `${stats.healthScore}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">
                                            {stats.healthScore}% - {healthStatus.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Severity breakdown */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-stone-50 dark:bg-stone-800 rounded-[24px]">
                                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">CRITICAL</span>
                                        <span className="text-2xl font-black text-red-500 tracking-tighter">{stats.critical}</span>
                                    </div>
                                    <div className="p-5 bg-stone-50 dark:bg-stone-800 rounded-[24px]">
                                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">STABLE</span>
                                        <span className="text-2xl font-black text-teal-600 tracking-tighter">{stats.totalPolicies}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Smart Insights */}
                        {/* Smart Insights */}
                        <div className="px-6 mb-12">
                            <div className="bg-stone-900 dark:bg-white rounded-[32px] p-8 text-white dark:text-stone-900 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Zap className="w-6 h-6 text-teal-400" />
                                    <h2 className="text-2xl font-black tracking-tighter">
                                        {copy.insights[lang]}
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {stats.critical > 0 && (
                                        <div className="p-5 bg-stone-800 dark:bg-stone-100 rounded-2xl border border-stone-700 dark:border-stone-200">
                                            <h3 className="font-black tracking-tight mb-1 text-red-400">
                                                {lang === 'el' ? 'Απαιτείται Άμεση Προσοχή' : 'Immediate Attention Required'}
                                            </h3>
                                            <p className="text-sm font-bold opacity-60">
                                                {lang === 'el'
                                                    ? `Έχετε ${stats.critical} κρίσιμα κενά κάλυψης.`
                                                    : `You have ${stats.critical} critical coverage gaps.`
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {stats.healthScore >= 90 && (
                                        <div className="p-5 bg-stone-800 dark:bg-stone-100 rounded-2xl border border-stone-700 dark:border-stone-200">
                                            <h3 className="font-black tracking-tight mb-1 text-teal-400">
                                                {lang === 'el' ? 'Εξαιρετική Κάλυψη' : 'Excellent Coverage'}
                                            </h3>
                                            <p className="text-sm font-bold opacity-60">
                                                {lang === 'el'
                                                    ? 'Το χαρτοφυλάκιό σας είναι σε εξαιρετική κατάσταση.'
                                                    : 'Your portfolio is in excellent shape.'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedView === 'gaps' && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                                {copy.detectedGaps[lang]}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                {lang === 'el'
                                    ? 'Δώστε προτεραιότητα σε αυτές τις ενέργειες για να ελαχιστοποιήσετε την έκθεσή σας.'
                                    : 'Prioritize these actions to minimize your exposure.'
                                }
                            </p>
                        </div>
                        <GapList gaps={gaps} />
                    </div>
                )}

                {selectedView === 'breakdown' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                            {copy.coverageBreakdown[lang]}
                        </h2>

                        <div className="space-y-4">
                            {coverageBreakdown.map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-900 dark:text-white">{item.type}</span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            €{item.amount.toLocaleString()} ({item.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full transition-all duration-500"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-slate-900 dark:text-white">
                                    {copy.totalCoverage[lang]}
                                </span>
                                <span className="text-2xl font-black text-blue-600">
                                    €{stats.totalCoverage.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
