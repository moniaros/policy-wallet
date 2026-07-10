"use client"

import React from 'react'
import {
    Shield,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    Users,
    DollarSign,
    Calendar,
    ArrowRight,
    Zap,
    Target,
    Activity,
    Bell,
    Plus,
    Download,
    Share2,
    Eye,
    BarChart3,
    Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface DashboardProps {
    user: {
        name: string
        role: 'policyholder' | 'agent' | 'admin'
        avatarUrl?: string
    }
    stats: {
        primary: { label: string; value: string | number; trend?: number; icon: React.ReactNode }
        secondary: { label: string; value: string | number; icon: React.ReactNode }[]
    }
    quickActions: Array<{
        id: string
        label: string
        href: string
        icon: React.ReactNode
        variant: 'primary' | 'secondary' | 'success' | 'warning'
    }>
    recentActivity: Array<{
        id: string
        type: string
        title: string
        description: string
        timestamp: string
        icon: React.ReactNode
        status?: 'success' | 'warning' | 'info'
    }>
    alerts?: Array<{
        id: string
        severity: 'critical' | 'warning' | 'info'
        title: string
        message: string
        actionLabel?: string
        actionHref?: string
    }>
    insights?: Array<{
        id: string
        title: string
        description: string
        metric?: string
        icon: React.ReactNode
    }>
}

export function UserDashboard({
    user,
    stats,
    quickActions,
    recentActivity,
    alerts = [],
    insights = []
}: DashboardProps) {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const getAlertColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
            case 'warning':
                return 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
            default:
                return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
        }
    }

    const getAlertIconColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-red-600 dark:text-red-400'
            case 'warning':
                return 'text-amber-600 dark:text-amber-400'
            default:
                return 'text-blue-600 dark:text-blue-400'
        }
    }

    const getActionVariant = (variant: string) => {
        switch (variant) {
            case 'primary':
                return 'bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] shadow-lg hover:shadow-xl'
            case 'success':
                return 'bg-mint text-[#1A2420] hover:bg-primary hover:text-white dark:hover:text-[#1A2420] shadow-lg hover:shadow-xl'
            case 'warning':
                return 'bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-lg hover:shadow-xl'
            default:
                return 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Personalized Hero */}
                <section className="relative overflow-hidden">
                    <div className="relative bg-primary dark:bg-[#143B33] rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-mint/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div className="flex-1">
                                    <p className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        {getGreeting()}
                                    </p>
                                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                                        Welcome back, {user.name}
                                    </h1>
                                    <p className="text-white/80 text-lg max-w-2xl">
                                        {user.role === 'policyholder'
                                            ? 'Your insurance portfolio is looking good. Here\'s your personalized overview.'
                                            : 'Here\'s what needs your attention today.'}
                                    </p>
                                </div>

                                {/* Primary Stat */}
                                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 min-w-[200px]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            {stats.primary.icon}
                                        </div>
                                        <span className="text-sm text-white/80">{stats.primary.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold">{stats.primary.value}</span>
                                        {stats.primary.trend !== undefined && (
                                            <span className={`text-sm font-semibold flex items-center gap-1 ${stats.primary.trend > 0 ? 'text-mint' : 'text-red-300'
                                                }`}>
                                                <TrendingUp className={`w-4 h-4 ${stats.primary.trend < 0 ? 'rotate-180' : ''}`} />
                                                {Math.abs(stats.primary.trend)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                {stats.secondary.map((stat, idx) => (
                                    <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-white/80">{stat.icon}</div>
                                            <span className="text-xs text-white/80">{stat.label}</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <section className="space-y-3">
                        {alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`${getAlertColor(alert.severity)} border rounded-xl p-4 flex items-start gap-4`}
                            >
                                <div className={`p-2 rounded-lg ${getAlertIconColor(alert.severity)}`}>
                                    {alert.severity === 'critical' ? (
                                        <AlertTriangle className="w-5 h-5" />
                                    ) : alert.severity === 'warning' ? (
                                        <Bell className="w-5 h-5" />
                                    ) : (
                                        <Zap className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm mb-1">{alert.title}</h3>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
                                </div>
                                {alert.actionHref && (
                                    <Link
                                        href={alert.actionHref}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                                    >
                                        {alert.actionLabel || 'Take Action'}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* Quick Actions */}
                <section>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary dark:text-mint" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions.map(action => (
                            <Link
                                key={action.id}
                                href={action.href}
                                className={`${getActionVariant(action.variant)} p-6 rounded-xl transition-all duration-200 group`}
                            >
                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                                        {action.icon}
                                    </div>
                                    <span className="font-semibold text-sm">{action.label}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <section className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary dark:text-mint" />
                                Recent Activity
                            </h2>
                            <Link href="/activity" className="text-sm text-primary hover:text-primary-hover dark:text-mint font-medium flex items-center gap-1">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentActivity.map((activity, idx) => (
                                    <div key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${activity.status === 'success' ? 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint' :
                                                    activity.status === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {activity.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                                            {activity.title}
                                                        </p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                                            {activity.description}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-slate-500 whitespace-nowrap">
                                                        {activity.timestamp}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* AI Insights */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary dark:text-mint" />
                            Smart Insights
                        </h2>
                        <div className="space-y-4">
                            {insights.map(insight => (
                                <div
                                    key={insight.id}
                                    className="bg-primary-tint dark:bg-primary/15 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint rounded-lg">
                                            {insight.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                                                {insight.title}
                                            </h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {insight.description}
                                            </p>
                                            {insight.metric && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint rounded-full text-xs font-semibold">
                                                    <TrendingUp className="w-3 h-3" />
                                                    {insight.metric}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
