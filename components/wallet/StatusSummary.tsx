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

    // Build breakdown text
    const breakdownParts: string[] = []
    if (policyBreakdown.health > 0) breakdownParts.push(`${policyBreakdown.health} ${t.status.health}`)
    if (policyBreakdown.auto > 0) breakdownParts.push(`${policyBreakdown.auto} ${t.status.auto}`)
    if (policyBreakdown.home > 0) breakdownParts.push(`${policyBreakdown.home} ${t.status.home}`)
    if (policyBreakdown.life > 0) breakdownParts.push(`${policyBreakdown.life} ${t.status.life}`)
    if (policyBreakdown.travel > 0) breakdownParts.push(`${policyBreakdown.travel} ${t.status.travel}`)
    const breakdownText = breakdownParts.join(', ')

    return (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500 fade-in">
            {/* Stats Micro-Widgets Grid - Compact Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Widget 1: Total Premium (Compact) */}
                <div className="col-span-2 relative overflow-hidden bg-[#FFFFFF] dark:bg-[#111111] rounded-2xl p-4 border border-black/10 dark:border-white/15 arc-card block w-full text-left">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#000000] dark:bg-black rounded-xl flex items-center justify-center text-white dark:text-white transition-transform duration-300">
                            <Euro className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-0.5">{t.status.totalPremium}</h3>
                            <div className="text-2xl font-black text-black dark:text-white tracking-tight tabular-nums flex items-end gap-2">
                                {formatCurrency(totalPremium)}
                                {premiumTrend.length > 1 && premiumChange !== 0 && (
                                    <span className={`text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-full ${premiumChange > 0 ? 'bg-[#111111] text-white dark:bg-black dark:text-white/85' : 'bg-black/5 text-black/70 dark:text-white/60'}`}>
                                        {premiumChange > 0 ? '+' : ''}{Math.round((premiumChange / (totalPremium - premiumChange)) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Compact Sparkline - Only show if data exists */}
                    {premiumTrend.length > 1 && (
                        <div className="w-24 h-8 text-black/70 dark:text-white/60 opacity-30">
                            <Sparkline data={premiumTrend} />
                        </div>
                    )}
                </div>

                {/* Widget 2: Active Policies (Compact) */}
                <div className="relative overflow-hidden bg-[#FFFFFF] dark:bg-[#111111] rounded-2xl p-4 border border-black/10 dark:border-white/15 arc-card block w-full text-left flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0">
                        {/* Mini Circle Progress */}
                        <svg className="w-10 h-10 transform -rotate-90">
                            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-black/15 dark:text-white/20" />
                            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - activeCount / (totalPolicies || 1))}`} className="text-[#1FDC86] transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-black dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-0.5">{t.status.activePolicies}</h3>
                        <div className="text-xl font-black text-black dark:text-white tracking-tight leading-none">
                            {activeCount} <span className="text-xs text-black/45 dark:text-white/60 font-medium">/ {totalPolicies} {t.status.added}</span>
                        </div>
                    </div>
                </div>

                {/* Widget 3: Renewals (Compact) */}
                <div className="relative overflow-hidden bg-[#FFFFFF] dark:bg-[#111111] rounded-2xl p-4 border border-black/10 dark:border-white/15 arc-card block w-full text-left flex items-center gap-3">
                    {(() => {
                        let urgency: 'normal' | 'warning' | 'critical' = 'normal';
                        if (expiringPolicies.length > 0) {
                            const now = new Date();
                            const minDaysStart = Math.min(...expiringPolicies.map(p => {
                                const end = new Date(p.expiryDate);
                                return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            }));
                            if (minDaysStart < 7) urgency = 'critical';
                            else if (minDaysStart < 30) urgency = 'warning';
                        } else if (expiringCount > 0) {
                            urgency = 'warning';
                        }

                        return (
                            <>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 ${urgency === 'critical' ? 'bg-[#000000] dark:bg-black text-white dark:text-white' :
                                    urgency === 'warning' ? 'bg-[#000000] dark:bg-black text-white dark:text-white' :
                                        'bg-black/5 dark:bg-black text-black/45 dark:text-white/60'
                                    }`}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-0.5">{t.status.upcomingRenewals}</h3>
                                    <div className="text-xl font-black text-black dark:text-white tracking-tight leading-none flex items-baseline gap-2">
                                        {expiringCount}
                                        {expiringCount > 0 && (
                                            <span className={`text-[10px] font-normal ${urgency === 'critical' ? 'text-red-600 dark:text-red-500 font-bold' :
                                                'text-amber-600 dark:text-amber-500'
                                                }`}>
                                                {urgency === 'critical' ? t.policyStatus.actionNeeded : t.status.attentionNeeded}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>

            </div>
        </div>
    )
}



