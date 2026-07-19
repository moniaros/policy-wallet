"use client"

import Link from "next/link"
import { Users, FileText, TrendingUp, UserCheck, AlertCircle, Activity } from "lucide-react"

interface DashboardMetrics {
    users: {
        total: number
        policyholders: number
        agents: number
        admins: number
        newLast30Days: number
    }
    policies: {
        total: number
        active: number
        newLast30Days: number
    }
    agents: {
        total: number
        pendingVerification: number
    }
    subscriptions: {
        active: number
        mrr: number
    }
    gaps: {
        total: number
        open: number
    }
    dsr: {
        pendingDataExports: number
        openDeletionRequests: number
        approvedDeletionRequests: number
        totalOpen: number
    }
    funnel?: {
        signups: number
        activated: number
        trialUsed: number
        limitHits: number
        checkoutStarted: number
        checkoutCompleted: number
        checkoutAbandoned: number
        paidActive: number
        triggerSources: Record<string, number>
    }
}

interface ActivityLog {
    id: string
    adminEmail: string
    actionType: string
    description: string
    timestamp: Date
}

interface DashboardClientProps {
    metrics: DashboardMetrics
    activityLogs: ActivityLog[]
    pendingAgentsCount: number
}

export default function DashboardClient({ metrics, activityLogs, pendingAgentsCount }: DashboardClientProps) {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                        Admin Dashboard
                    </h1>
                    <p className="text-stone-600 dark:text-stone-400 mt-2">
                        Platform overview and system metrics
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/admin/plans"
                        className="rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                        Plans & pricing →
                    </Link>
                    <a
                        href="/admin/submissions"
                        className="rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                        Form submissions →
                    </a>
                </div>
            </div>

            {/* Pending Agents Alert */}
            {pendingAgentsCount > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {pendingAgentsCount} agent{pendingAgentsCount !== 1 ? 's' : ''} pending verification
                        </p>
                        <a
                            href="/admin/users?filter=pending_agents"
                            className="text-sm text-amber-700 dark:text-amber-300 underline hover:no-underline"
                        >
                            Review now →
                        </a>
                    </div>
                </div>
            )}

            {metrics.dsr.totalOpen > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {metrics.dsr.totalOpen} DSR request{metrics.dsr.totalOpen !== 1 ? "s" : ""} require admin action
                        </p>
                        <a
                            href="/admin/dsr"
                            className="text-sm text-blue-700 dark:text-blue-300 underline hover:no-underline"
                        >
                            Open DSR queue →
                        </a>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <MetricsCard
                    title="Total Users"
                    value={metrics.users.total}
                    change={metrics.users.newLast30Days}
                    changeLabel="new this month"
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                />

                {/* Total Policies */}
                <MetricsCard
                    title="Total Policies"
                    value={metrics.policies.total}
                    change={metrics.policies.newLast30Days}
                    changeLabel="new this month"
                    icon={<FileText className="w-6 h-6" />}
                    color="green"
                />

                {/* Active Agents */}
                <MetricsCard
                    title="Active Agents"
                    value={metrics.agents.total}
                    change={metrics.agents.pendingVerification}
                    changeLabel="pending verification"
                    icon={<UserCheck className="w-6 h-6" />}
                    color="purple"
                />

                {/* Monthly Revenue */}
                <MetricsCard
                    title="Monthly Revenue"
                    value={`€${metrics.subscriptions.mrr.toFixed(2)}`}
                    change={metrics.subscriptions.active}
                    changeLabel="active subscriptions"
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="emerald"
                />
            </div>

            {/* Conversion Funnel (last 30 days, server-side conv_* events) */}
            {metrics.funnel && (
                <div className="mb-8 p-6 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
                            Conversion Funnel — last 30 days
                        </h3>
                        <TrendingUp className="w-4 h-4 text-stone-400" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                        {[
                            { label: "Signups", value: metrics.funnel.signups },
                            { label: "Activated (≥1 policy)", value: metrics.funnel.activated },
                            { label: "Trial analysis used", value: metrics.funnel.trialUsed },
                            { label: "Limit hits", value: metrics.funnel.limitHits },
                            { label: "Checkouts started", value: metrics.funnel.checkoutStarted },
                            { label: "Checkouts completed", value: metrics.funnel.checkoutCompleted },
                            { label: "Checkouts abandoned", value: metrics.funnel.checkoutAbandoned },
                        ].map((step) => (
                            <div key={step.label} className="text-center p-3 rounded-lg bg-stone-50 dark:bg-stone-900/40">
                                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{step.value}</p>
                                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{step.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
                        <span>
                            Paid active subscriptions:{" "}
                            <span className="font-semibold text-stone-900 dark:text-stone-100">{metrics.funnel.paidActive}</span>
                        </span>
                        {Object.keys(metrics.funnel.triggerSources).length > 0 && (
                            <span className="flex flex-wrap items-center gap-2">
                                Checkout trigger sources:
                                {Object.entries(metrics.funnel.triggerSources)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([source, count]) => (
                                        <span
                                            key={source}
                                            className="rounded-full bg-stone-100 dark:bg-stone-700 px-2 py-0.5 font-medium text-stone-700 dark:text-stone-200"
                                        >
                                            {source} · {count}
                                        </span>
                                    ))}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
                            User Breakdown
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Policyholders</span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                {metrics.users.policyholders}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Agents</span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                {metrics.users.agents}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Admins</span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                {metrics.users.admins}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
                            Policy Status
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Active</span>
                            <span className="font-medium text-[#166534] dark:text-mint">
                                {metrics.policies.active}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Total</span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                {metrics.policies.total}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
                            Coverage Gaps
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Open</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {metrics.gaps.open}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-600 dark:text-stone-400">Total Detected</span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                {metrics.gaps.total}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                <div className="p-6 border-b border-stone-200 dark:border-stone-700">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                            Recent Activity
                        </h2>
                    </div>
                </div>
                <div className="divide-y divide-stone-200 dark:divide-stone-700">
                    {activityLogs.length === 0 ? (
                        <div className="p-8 text-center text-stone-500 dark:text-stone-400">
                            No recent activity
                        </div>
                    ) : (
                        activityLogs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-stone-900 dark:text-stone-100">
                                            {log.description}
                                        </p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                            by {log.adminEmail} • {new Date(log.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded">
                                        {log.actionType}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {activityLogs.length > 0 && (
                    <div className="p-4 border-t border-stone-200 dark:border-stone-700">
                        <a
                            href="/admin/activity"
                            className="text-sm text-primary dark:text-mint hover:underline"
                        >
                            View all activity →
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}

interface MetricsCardProps {
    title: string
    value: string | number
    change: number
    changeLabel: string
    icon: React.ReactNode
    color: "blue" | "green" | "purple" | "emerald"
}

function MetricsCard({ title, value, change, changeLabel, icon, color }: MetricsCardProps) {
    const colorClasses = {
        blue: "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint",
        green: "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint",
        purple: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
        emerald: "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint"
    }

    return (
        <div className="p-6 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
                    {title}
                </h3>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="mb-2">
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                    {value}
                </p>
            </div>
            <div className="flex items-center gap-1 text-sm">
                <span className="text-stone-600 dark:text-stone-400">
                    {change > 0 && "+"}{change}
                </span>
                <span className="text-stone-500 dark:text-stone-500">
                    {changeLabel}
                </span>
            </div>
        </div>
    )
}
