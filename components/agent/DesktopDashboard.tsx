"use client"

import React from 'react'
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
    XCircle
} from 'lucide-react'

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
    const statCards = [
        {
            label: 'Total Customers',
            value: stats.totalCustomers,
            change: stats.monthlyGrowth,
            icon: Users,
            color: 'blue',
            trend: stats.monthlyGrowth > 0 ? 'up' : 'down'
        },
        {
            label: 'Active Policies',
            value: stats.totalPolicies,
            change: 12,
            icon: FileText,
            color: 'emerald',
            trend: 'up'
        },
        {
            label: 'Total Premium',
            value: `€${(stats.totalPremium / 1000).toFixed(1)}K`,
            change: 8.5,
            icon: DollarSign,
            color: 'amber',
            trend: 'up'
        },
        {
            label: 'Conversion Rate',
            value: `${stats.conversionRate}%`,
            change: 3.2,
            icon: Target,
            color: 'purple',
            trend: 'up'
        }
    ]

    const getPriorityColor = (priority: Priority['priority']) => {
        switch (priority) {
            case 'high':
                return 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
            case 'medium':
                return 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30'
            case 'low':
                return 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30'
        }
    }

    const getPriorityIcon = (type: Priority['type']) => {
        switch (type) {
            case 'renewal':
                return <Calendar className="w-5 h-5" />
            case 'follow_up':
                return <Clock className="w-5 h-5" />
            case 'claim':
                return <AlertCircle className="w-5 h-5" />
            case 'opportunity':
                return <TrendingUp className="w-5 h-5" />
        }
    }

    const getActivityIcon = (type: typeof recentActivity[0]['type']) => {
        switch (type) {
            case 'policy_added':
                return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            case 'customer_invited':
                return <Users className="w-4 h-4 text-blue-600" />
            case 'renewal_completed':
                return <Calendar className="w-4 h-4 text-purple-600" />
            case 'claim_filed':
                return <AlertCircle className="w-4 h-4 text-amber-600" />
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-[1400px] mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1" style={{ fontFamily: 'Fira Code, monospace' }}>
                                Agent Dashboard
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontFamily: 'Fira Sans, sans-serif' }}>
                                Welcome back! Here's your overview
                            </p>
                        </div>
                        <button
                            onClick={onInviteCustomer}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <Users className="w-5 h-5" />
                            Invite Customer
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat) => {
                        const Icon = stat.icon
                        const colorClasses = {
                            blue: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
                            emerald: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
                            amber: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
                            purple: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        }

                        return (
                            <div
                                key={stat.label}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                        {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                        {stat.change}%
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1" style={{ fontFamily: 'Fira Sans, sans-serif' }}>
                                        {stat.label}
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Priority Queue - 8 columns */}
                    <div className="col-span-8">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                    Priority Queue
                                </h2>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {priorities.length} items
                                </span>
                            </div>

                            <div className="space-y-3">
                                {priorities.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                        <p className="text-slate-600 dark:text-slate-400">All caught up!</p>
                                    </div>
                                ) : (
                                    priorities.map((priority) => (
                                        <div
                                            key={priority.id}
                                            onClick={() => onPriorityClick(priority.id)}
                                            className={`border-l-4 ${getPriorityColor(priority.priority)} rounded-lg p-4 hover:shadow-md transition-all cursor-pointer`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                                                        {getPriorityIcon(priority.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Sans, sans-serif' }}>
                                                                {priority.customerName}
                                                            </h3>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                    priority.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                }`}>
                                                                {priority.priority}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                                            {priority.description}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Due: {new Date(priority.dueDate).toLocaleDateString()}
                                                            </span>
                                                            {priority.value && (
                                                                <span className="flex items-center gap-1">
                                                                    <DollarSign className="w-3 h-3" />
                                                                    €{priority.value.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity - 4 columns */}
                    <div className="col-span-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6" style={{ fontFamily: 'Fira Code, monospace' }}>
                                Recent Activity
                            </h2>

                            <div className="space-y-4">
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0">
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                {activity.customerName}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                                {activity.details}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
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
    )
}
