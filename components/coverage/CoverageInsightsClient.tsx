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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Hero Section */}
                <div className="relative mb-12 overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 blur-3xl rounded-full -ml-32 -mb-32" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                                {lang === 'el' ? 'Αναφορά Νοημοσύνης' : 'Intelligence Report'}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                            {copy.title[lang]}
                        </h1>

                        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-8">
                            {copy.subtitle[lang]}. {lang === 'el' ? 'Εντοπίσαμε' : 'We identified'} {stats.totalGaps} {lang === 'el' ? 'περιοχές όπου η προστασία σας θα μπορούσε να βελτιστοποιηθεί' : 'areas where your protection could be optimized'}.
                        </p>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-4 h-4 text-blue-200" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {copy.healthScore[lang]}
                                    </span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{stats.healthScore}%</span>
                                    <span className={`text-sm font-bold mb-1 ${healthStatus.color}`}>
                                        {healthStatus.label}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-red-300" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {copy.criticalGaps[lang]}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-red-400">{stats.critical}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-amber-300" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {copy.highRisk[lang]}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-amber-400">{stats.high}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-blue-200" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {copy.totalPolicies[lang]}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{stats.totalPolicies}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setSelectedView('overview')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedView === 'overview'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {copy.viewOverview[lang]}
                        </div>
                    </button>
                    <button
                        onClick={() => setSelectedView('gaps')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedView === 'gaps'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {copy.viewGaps[lang]}
                            {stats.totalGaps > 0 && (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-black rounded-full">
                                    {stats.totalGaps}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setSelectedView('breakdown')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedView === 'breakdown'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <PieChart className="w-4 h-4" />
                            {copy.viewBreakdown[lang]}
                        </div>
                    </button>
                </div>

                {/* Content based on selected view */}
                {selectedView === 'overview' && (
                    <div className="space-y-8">
                        {/* Health Score Visualization */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                                {copy.healthScore[lang]}
                            </h2>

                            {/* Progress bar */}
                            <div className="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div
                                    className={`absolute inset-y-0 left-0 ${healthStatus.bg} transition-all duration-1000 ease-out rounded-full`}
                                    style={{ width: `${stats.healthScore}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">
                                        {stats.healthScore}% - {healthStatus.label}
                                    </span>
                                </div>
                            </div>

                            {/* Severity breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">
                                            {lang === 'el' ? 'Κρίσιμα' : 'Critical'}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-red-600 dark:text-red-400">{stats.critical}</span>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                                            {lang === 'el' ? 'Υψηλά' : 'High'}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.high}</span>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                                            {lang === 'el' ? 'Μέτρια' : 'Medium'}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.medium}</span>
                                </div>

                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                            {lang === 'el' ? 'Χαμηλά' : 'Low'}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.low}</span>
                                </div>
                            </div>
                        </div>

                        {/* Smart Insights */}
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-3xl p-8 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {copy.insights[lang]}
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {stats.critical > 0 && (
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                                    {lang === 'el' ? 'Απαιτείται Άμεση Προσοχή' : 'Immediate Attention Required'}
                                                </h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {lang === 'el'
                                                        ? `Έχετε ${stats.critical} κρίσιμα κενά κάλυψης που θα μπορούσαν να θέσουν σε κίνδυνο την οικονομική σας ασφάλεια.`
                                                        : `You have ${stats.critical} critical coverage gaps that could jeopardize your financial security.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stats.healthScore >= 90 && (
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                                    {lang === 'el' ? 'Εξαιρετική Κάλυψη' : 'Excellent Coverage'}
                                                </h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {lang === 'el'
                                                        ? 'Το χαρτοφυλάκιό σας είναι σε εξαιρετική κατάσταση. Συνεχίστε να παρακολουθείτε για αλλαγές.'
                                                        : 'Your portfolio is in excellent shape. Continue monitoring for changes.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
