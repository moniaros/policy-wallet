"use client"

import React, { useEffect, useState } from 'react'
import {
    Coins,
    TrendingUp,
    Users,
    Activity,
    DollarSign
} from 'lucide-react'
import { formatTokens, formatCost } from '@/lib/token-utils'

interface TokenStats {
    total: {
        tokens: number
        cost: number
        operations: number
    }
    byOperation: Array<{
        type: string
        tokens: number
        cost: number
        count: number
    }>
    topUsers: Array<{
        userId: string
        tokens: number
        cost: number
        operations: number
    }>
    byTier: Array<{
        tier: string
        tokens: number
        cost: number
        users: number
    }>
}

interface DailyTrend {
    date: Date
    tokens: number
    cost: number
    operations: number
}

export function TokenAnalyticsDashboard({ language }: { language: 'el' | 'en' }) {
    const [stats, setStats] = useState<TokenStats | null>(null)
    const [trends, setTrends] = useState<DailyTrend[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState(30) // days

    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/admin/tokens/analytics?days=${dateRange}`)
            const data = await response.json()
            setStats(data.stats)
            setTrends(data.trends)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    const copy = {
        title: { el: 'Ανάλυση χρήσης Tokens', en: 'Token Usage Analytics' },
        totalUsage: { el: 'Συνολική χρήση', en: 'Total Usage' },
        totalCost: { el: 'Συνολικό κόστος', en: 'Total Cost' },
        operations: { el: 'Λειτουργίες', en: 'Operations' },
        activeUsers: { el: 'Ενεργοί χρήστες', en: 'Active Users' },
        byOperation: { el: 'Ανά λειτουργία', en: 'By Operation' },
        byTier: { el: 'Ανά πλάνο', en: 'By Tier' },
        topUsers: { el: 'Κορυφαίοι χρήστες', en: 'Top Users' },
        trends: { el: 'Τάσεις χρήσης', en: 'Usage Trends' },
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                    {copy.title[language]}
                </h1>

                {/* Date Range Selector */}
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(parseInt(e.target.value))}
                    className="pw-input pw-input-sm"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Tokens */}
                <div className="bg-primary-tint dark:bg-primary/15 rounded-2xl border-2 border-[#E2E8F0] dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Coins className="w-8 h-8 text-primary dark:text-mint" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {copy.totalUsage[language]}
                    </h3>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {formatTokens(stats.total.tokens)}
                    </p>
                </div>

                {/* Total Cost */}
                <div className="bg-primary-tint dark:bg-primary/15 rounded-2xl border-2 border-[#E2E8F0] dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-8 h-8 text-primary dark:text-mint" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {copy.totalCost[language]}
                    </h3>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {formatCost(stats.total.cost)}
                    </p>
                </div>

                {/* Operations */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-[#E2E8F0] dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {copy.operations[language]}
                    </h3>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {stats.total.operations.toLocaleString()}
                    </p>
                </div>

                {/* Active Users */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-200 dark:border-amber-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 text-[#D97706] dark:text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {copy.activeUsers[language]}
                    </h3>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {stats.topUsers.length}
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usage by Operation */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                        {copy.byOperation[language]}
                    </h3>
                    <div className="space-y-3">
                        {stats.byOperation.slice(0, 5).map((op, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {op.type.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {formatTokens(op.tokens)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-[#F1F5F9] dark:bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{
                                                width: `${(op.tokens / stats.total.tokens) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                <span className="ml-4 text-xs text-slate-500 dark:text-slate-400">
                                    {formatCost(op.cost)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Usage by Tier */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                        {copy.byTier[language]}
                    </h3>
                    <div className="space-y-4">
                        {stats.byTier.map((tier, idx) => {
                            const tierColors = {
                                free: 'text-slate-600 dark:text-slate-300',
                                essential: 'text-primary dark:text-mint',
                                professional: 'text-secondary dark:text-mint',
                            }
                            const color = tierColors[tier.tier as keyof typeof tierColors] || 'text-slate-600 dark:text-slate-300'

                            return (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-black ${color} uppercase`}>
                                            {tier.tier}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {tier.users} users
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                                            {formatTokens(tier.tokens)}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            {formatCost(tier.cost)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Top Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                    {copy.topUsers[language]}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    User ID
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Tokens
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Cost
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Operations
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.topUsers.map((user, idx) => (
                                <tr
                                    key={idx}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <td className="py-3 px-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                                        {user.userId.substring(0, 8)}...
                                    </td>
                                    <td className="py-3 px-4 text-sm font-bold text-right text-slate-900 dark:text-white">
                                        {formatTokens(user.tokens)}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-semibold text-right text-slate-700 dark:text-slate-300">
                                        {formatCost(user.cost)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-600 dark:text-slate-400">
                                        {user.operations}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
