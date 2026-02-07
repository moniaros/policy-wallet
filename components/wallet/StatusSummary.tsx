"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { TrendingUp, Shield, Calendar, Euro } from 'lucide-react'

interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    actionNeededCount: number
    totalPremium?: number
    coverageScore?: number
    policyBreakdown?: {
        health: number
        auto: number
        home: number
        life: number
        travel: number
    }
    expiringPolicies?: Array<{
        name: string
        expiryDate: string
    }>
    premiumTrend?: number[]
}

export function StatusSummary({
    activeCount,
    expiringCount,
    actionNeededCount,
    totalPremium = 0,
    policyBreakdown = { health: 0, auto: 0, home: 0, life: 0, travel: 0 },
    expiringPolicies = [],
    premiumTrend = []
}: StatusSummaryProps) {
    const { t, language } = useLanguage()

    // Calculate total including action needed, active, expiring.
    // Note: This logic assumes 'totalPolicies' should match the sum of these statuses.
    const totalPolicies = activeCount + expiringCount + actionNeededCount

    const premiumChange = premiumTrend.length >= 2 ? premiumTrend[premiumTrend.length - 1] - premiumTrend[premiumTrend.length - 2] : 0

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    // Simple Sparkline SVG
    const Sparkline = ({ data }: { data: number[] }) => {
        if (data.length < 2) return null
        const min = Math.min(...data)
        const max = Math.max(...data)
        const range = max - min || 1
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - ((val - min) / range) * 100
            return `${x},${y}`
        }).join(' ')

        return (
            <svg viewBox="0 0 100 100" className="w-full h-12 opacity-30" preserveAspectRatio="none">
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" />
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <polygon points={`${points} 100,100 0,100`} fill="url(#gradient)" stroke="none" />
            </svg>
        )
    }

    // Build breakdown text
    const breakdownParts = []
    if (policyBreakdown.health > 0) breakdownParts.push(`${policyBreakdown.health} ${t.status.health}`)
    if (policyBreakdown.auto > 0) breakdownParts.push(`${policyBreakdown.auto} ${t.status.auto}`)
    if (policyBreakdown.home > 0) breakdownParts.push(`${policyBreakdown.home} ${t.status.home}`)
    if (policyBreakdown.life > 0) breakdownParts.push(`${policyBreakdown.life} ${t.status.life}`)
    if (policyBreakdown.travel > 0) breakdownParts.push(`${policyBreakdown.travel} ${t.status.travel}`)
    const breakdownText = breakdownParts.join(', ')

    return (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500 fade-in">
            {/* Stats Cards Grid - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Premium */}
                {/* Card 1: Total Premium */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-white/40 dark:border-stone-700/40 shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Euro className="w-32 h-32 text-indigo-500" />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Euro className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t.status.totalPremium}</h3>
                    </div>

                    <div className="relative z-10">
                        <div className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight mb-2 tabular-nums">
                            {formatCurrency(totalPremium)}
                        </div>
                        {premiumChange !== 0 && (
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 w-fit px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                                <TrendingUp className="w-4 h-4" />
                                <span>{premiumChange > 0 ? '+' : ''}{formatCurrency(premiumChange)} {t.status.fromLastMonth}</span>
                            </div>
                        )}
                        {/* Sparkline Overlay */}
                        {premiumTrend.length > 1 && (
                            <div className="absolute bottom-4 right-4 text-indigo-500 w-24">
                                <Sparkline data={premiumTrend} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 2: Active Policies */}
                {/* Card 2: Active Policies */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-white/40 dark:border-stone-700/40 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Shield className="w-32 h-32 text-blue-500" />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t.status.activePolicies}</h3>
                    </div>

                    <div className="flex items-end justify-between relative z-10">
                        <div>
                            <div className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight mb-2 tabular-nums">
                                {totalPolicies}
                            </div>
                            <div className="text-xs font-bold text-stone-500 dark:text-stone-400 max-w-[150px] leading-relaxed">
                                {breakdownText || t.status.noPoliciesYet}
                            </div>
                        </div>

                        {/* Circular Progress */}
                        <div className="relative w-20 h-20 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-20 h-20 transform -rotate-90">
                                {/* Background circle */}
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    className="text-stone-200 dark:text-stone-800"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 32}`}
                                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - activeCount / (totalPolicies || 1))}`}
                                    className="text-blue-500 transition-all duration-1000 ease-out drop-shadow-lg"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-black text-stone-900 dark:text-white">
                                    {Math.round((activeCount / (totalPolicies || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: Upcoming Renewals */}
                {/* Card 3: Upcoming Renewals */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-white/40 dark:border-stone-700/40 shadow-xl shadow-amber-500/5 hover:shadow-amber-500/10 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calendar className="w-32 h-32 text-amber-500" />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t.status.upcomingRenewals}</h3>
                    </div>

                    <div className="relative z-10">
                        <div className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight mb-2 tabular-nums">
                            {expiringCount}
                        </div>
                        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-4">
                            {t.status.expiringWithin30Days}
                        </div>

                        {/* Renewal List */}
                        {expiringPolicies.length > 0 ? (
                            <div className="space-y-3">
                                {expiringPolicies.slice(0, 2).map((policy, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2 bg-white/50 dark:bg-stone-800/50 rounded-xl border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-stone-900 dark:text-white truncate">{policy.name}</div>
                                            <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{policy.expiryDate}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold bg-emerald-50/50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                <Shield className="w-4 h-4" />
                                {t.status.allClear30Days}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
