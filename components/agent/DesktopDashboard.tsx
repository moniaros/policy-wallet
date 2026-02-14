"use client"

import React, { useMemo } from 'react'
import {
    TrendingUp,
    Users,
    FileText,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    Calendar,
    DollarSign,
    Target,
    Clock,
    CheckCircle2,
    Briefcase,
    ChevronRight,
    Sparkles,
    Activity,
    ArrowUpRight,
} from 'lucide-react'

const DESKTOP_ANIMATION_CSS = `
@keyframes deskFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes deskSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
`

interface DashboardStats {
    totalCustomers: number
    activeCustomers: number
    invitedCustomers: number
    inactiveCustomers: number
    totalPolicies: number
    totalPremium: number
    monthlyGrowth: number
    conversionRate: number
}

interface Priority {
    id: string
    type: 'renewal' | 'follow_up' | 'claim' | 'opportunity'
    customerName: string
    description: string
    dueDate: string
    priority: 'high' | 'medium' | 'low'
    value?: number
}

interface DesktopDashboardProps {
    stats: DashboardStats
    priorities: Priority[]
    recentActivity: Array<{
        id: string
        type: 'policy_added' | 'customer_invited' | 'renewal_completed' | 'claim_filed'
        customerName: string
        timestamp: string
        details: string
    }>
    onPriorityClick: (id: string) => void
    onInviteCustomer: () => void
}

export function DesktopDashboard({
    stats,
    priorities,
    recentActivity,
    onPriorityClick,
    onInviteCustomer
}: DesktopDashboardProps) {

    const statCards = useMemo(() => [
        {
            label: 'Total Customers',
            value: stats.totalCustomers,
            change: stats.monthlyGrowth,
            icon: Users,
            gradient: 'from-blue-500 to-indigo-600',
            bgGlow: 'bg-blue-500/10 dark:bg-blue-400/5',
            trend: stats.monthlyGrowth > 0 ? 'up' as const : 'down' as const
        },
        {
            label: 'Active Policies',
            value: stats.totalPolicies,
            change: 12,
            icon: FileText,
            gradient: 'from-emerald-500 to-teal-600',
            bgGlow: 'bg-emerald-500/10 dark:bg-emerald-400/5',
            trend: 'up' as const
        },
        {
            label: 'Total Premium',
            value: `€${(stats.totalPremium / 1000).toFixed(1)}K`,
            change: 8.5,
            icon: DollarSign,
            gradient: 'from-amber-500 to-orange-600',
            bgGlow: 'bg-amber-500/10 dark:bg-amber-400/5',
            trend: 'up' as const
        },
        {
            label: 'Conversion Rate',
            value: `${stats.conversionRate}%`,
            change: 3.2,
            icon: Target,
            gradient: 'from-violet-500 to-purple-600',
            bgGlow: 'bg-violet-500/10 dark:bg-violet-400/5',
            trend: 'up' as const
        }
    ], [stats])

    const getPriorityColor = (priority: Priority['priority']) => {
        switch (priority) {
            case 'high':
                return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
            case 'medium':
                return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
            case 'low':
                return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
        }
    }

    const getPriorityIcon = (type: Priority['type']) => {
        const cls = 'w-5 h-5'
        switch (type) {
            case 'renewal': return <Calendar className={cls} />
            case 'follow_up': return <Clock className={cls} />
            case 'claim': return <AlertCircle className={cls} />
            case 'opportunity': return <TrendingUp className={cls} />
        }
    }

    const getActivityIcon = (type: typeof recentActivity[0]['type']) => {
        switch (type) {
            case 'policy_added': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            case 'customer_invited': return <Users className="w-4 h-4 text-blue-500" />
            case 'renewal_completed': return <Calendar className="w-4 h-4 text-violet-500" />
            case 'claim_filed': return <AlertCircle className="w-4 h-4 text-amber-500" />
        }
    }

    const getActivityDotColor = (type: typeof recentActivity[0]['type']) => {
        switch (type) {
            case 'policy_added': return 'bg-emerald-500'
            case 'customer_invited': return 'bg-blue-500'
            case 'renewal_completed': return 'bg-violet-500'
            case 'claim_filed': return 'bg-amber-500'
        }
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: DESKTOP_ANIMATION_CSS }} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                {/* ═══════════ HEADER ═══════════ */}
                <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                    {/* Decorative blurs */}
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 left-1/3 w-40 h-40 bg-violet-500/6 rounded-full blur-3xl pointer-events-none" />

                    <div className="max-w-[1400px] mx-auto px-8 py-6 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/25">
                                    <Briefcase className="w-6 h-6" />
                                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
                                </div>
                                <div>
                                    <h1
                                        className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"
                                        style={{ animation: 'deskFadeUp .4s ease-out both' }}
                                    >
                                        Agent Dashboard
                                    </h1>
                                    <p
                                        className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"
                                        style={{ animation: 'deskFadeUp .4s ease-out 60ms both' }}
                                    >
                                        Welcome back! Here's your overview for today.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onInviteCustomer}
                                className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                            >
                                <Users className="w-5 h-5" />
                                Invite Customer
                                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1400px] mx-auto px-8 py-8">
                    {/* ═══════════ STATS GRID ═══════════ */}
                    <div className="grid grid-cols-4 gap-5 mb-8">
                        {statCards.map((stat, i) => {
                            const Icon = stat.icon
                            return (
                                <div
                                    key={stat.label}
                                    className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default"
                                    style={{ animation: `deskFadeUp .5s ease-out ${100 + i * 80}ms both` }}
                                >
                                    {/* Glow */}
                                    <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                    {/* Accent bar */}
                                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="relative">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className={`flex items-center gap-1 text-sm font-bold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {stat.trend === 'up' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                                                {stat.change}%
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                            {stat.label}
                                        </p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ═══════════ MAIN CONTENT ═══════════ */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* Priority Queue — 8 cols */}
                        <div
                            className="col-span-8"
                            style={{ animation: 'deskFadeUp .5s ease-out 500ms both' }}
                        >
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-amber-500" />
                                        Priority Queue
                                    </h2>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                        {priorities.length} items
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {priorities.length === 0 ? (
                                        <div className="text-center py-14">
                                            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                                                <Sparkles className="w-7 h-7" />
                                            </div>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">All caught up!</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">No priorities at the moment. Great work.</p>
                                        </div>
                                    ) : (
                                        priorities.map((priority, idx) => (
                                            <div
                                                key={priority.id}
                                                onClick={() => onPriorityClick(priority.id)}
                                                className={`border-l-4 ${getPriorityColor(priority.priority)} rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}
                                                style={{ animation: `deskSlideIn .4s ease-out ${550 + idx * 60}ms both` }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:shadow transition-shadow">
                                                            {getPriorityIcon(priority.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">
                                                                    {priority.customerName}
                                                                </h3>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${priority.priority === 'high'
                                                                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                                                        : priority.priority === 'medium'
                                                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                                                    }`}>
                                                                    {priority.priority}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                                                {priority.description}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    Due: {new Date(priority.dueDate).toLocaleDateString()}
                                                                </span>
                                                                {priority.value && (
                                                                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                                        <DollarSign className="w-3 h-3" />
                                                                        €{priority.value.toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-center" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity — 4 cols */}
                        <div
                            className="col-span-4"
                            style={{ animation: 'deskFadeUp .5s ease-out 600ms both' }}
                        >
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Activity className="w-4.5 h-4.5 text-violet-500" style={{ width: 18, height: 18 }} />
                                    Recent Activity
                                </h2>

                                <div className="space-y-5">
                                    {recentActivity.map((activity, i) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 group/item"
                                            style={{ animation: `deskSlideIn .4s ease-out ${650 + i * 70}ms both` }}
                                        >
                                            <div className="relative mt-0.5">
                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover/item:shadow-sm transition-shadow">
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                                {/* Timeline connector */}
                                                {i < recentActivity.length - 1 && (
                                                    <div className="absolute left-1/2 top-[36px] -translate-x-1/2 w-px h-4 bg-slate-200 dark:bg-slate-800" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                    {activity.customerName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {activity.details}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
