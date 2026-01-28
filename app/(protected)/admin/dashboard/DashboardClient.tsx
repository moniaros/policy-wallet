"use client"

import { useState } from "react"
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                    Admin Dashboard
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mt-2">
                    Platform overview and system metrics
                </p>
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
                            <span className="font-medium text-green-600 dark:text-green-400">
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
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
        blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
        green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
        purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
        emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
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
