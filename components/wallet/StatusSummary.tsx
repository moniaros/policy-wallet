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
            currency: 'EUR'
        }).format(amount)
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
        <div className="mb-8">
            {/* Stats Cards Grid - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Premium */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                            <Euro className="w-5 h-5 text-teal-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700">{t.status.totalPremium}</h3>
                    </div>

                    <div className="mb-4">
                        <div className="text-4xl font-bold text-gray-900">
                            {formatCurrency(totalPremium)}
                        </div>
                        {premiumChange !== 0 && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-teal-600">
                                <TrendingUp className="w-4 h-4" />
                                <span>{premiumChange > 0 ? '+' : ''}{formatCurrency(premiumChange)} {t.status.fromLastMonth}</span>
                            </div>
                        )}
                    </div>

                    {/* Mini Bar Chart */}
                    {premiumTrend.length > 0 ? (
                        <div className="flex items-end gap-1.5 h-16">
                            {premiumTrend.map((value, index) => {
                                const maxValue = Math.max(...premiumTrend)
                                const height = (value / maxValue) * 100
                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                            className="w-full bg-teal-500 rounded-t"
                                            style={{ height: `${height}%` }}
                                        />
                                        <span className="text-xs text-gray-500">{months[index]}</span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="h-16 flex items-center justify-center text-xs text-gray-400 italic">
                            {t.status.noHistory}
                        </div>
                    )}
                </div>

                {/* Card 2: Active Policies */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-teal-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700">{t.status.activePolicies}</h3>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-4xl font-bold text-gray-900">
                                {totalPolicies}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                {breakdownText}
                            </div>
                        </div>

                        {/* Circular Progress */}
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                                {/* Background circle */}
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    className="text-gray-200"
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
                                    className="text-teal-600"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-900">
                                    {activeCount}/{totalPolicies}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: Upcoming Renewals */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-teal-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700">{t.status.upcomingRenewals}</h3>
                    </div>

                    <div className="mb-4">
                        <div className="text-4xl font-bold text-gray-900">
                            {expiringCount}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            {t.status.expiringWithin30Days}
                        </div>
                    </div>

                    {/* Renewal List */}
                    {expiringPolicies.length > 0 && (
                        <div className="space-y-2">
                            {expiringPolicies.slice(0, 2).map((policy, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                    <span className="text-gray-700">{policy.name}</span>
                                    <span className="text-gray-500">({policy.expiryDate})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
