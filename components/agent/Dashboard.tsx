"use client"

import React from 'react'
import { DashboardSummary, Priority, DashboardProps } from './types'
import { TrendingUp, Users, Mail, Zap, ArrowRight, Phone, MessageCircle, FileText, AlertCircle, Plus, Search, Filter } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

export function Dashboard({
    summary,
    priorities,
    onPriorityClick,
    onInviteCustomer
}: DashboardProps) {
    const { t } = useLanguage()

    // Mock calculated stats for Mission Control feel
    const conversionRate = summary.invited > 0 ? Math.round((summary.activated / (summary.activated + summary.invited)) * 100) : 0
    const totalCustomers = summary.activated + summary.invited + summary.inactive

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return t.dashboard.greeting.morning
        if (hour < 18) return t.dashboard.greeting.afternoon
        return t.dashboard.greeting.evening
    }

    const getPriorityIcon = (type: string) => {
        switch (type) {
            case 'open_opportunity':
                return <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            case 'pending_invite':
                return <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            case 'follow_up':
                return <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            default:
                return <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        }
    }

    const getPriorityBadgeStyle = (priority: number) => {
        switch (priority) {
            case 1: return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" // Critical
            case 2: return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" // High
            case 3: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" // Medium
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800" // Low
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            {/* Top Navigation Bar (Mission Control Header) */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Agent<span className="text-slate-400 font-light">Workspace</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 font-mono hidden sm:inline-block">
                            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AG</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Greeting & Quick Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded textxs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
                                Online
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                            {getGreeting()}, Agent
                        </h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">
                            Here is your daily briefing. You have <span className="font-semibold text-amber-600 dark:text-amber-400">{priorities.length} items</span> requiring attention.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onInviteCustomer}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-500/30"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Invite Client</span>
                        </button>
                    </div>
                </div>

                {/* KPI Grid (Mission Control) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Total Customers */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-16 h-16 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Clients</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{totalCustomers}</span>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">+2 this week</span>
                        </div>
                    </div>

                    {/* Active Policies */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileText className="w-16 h-16 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Active Policies</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{summary.activated * 2 + 5}</span> {/* Mock logic for now */}
                            <span className="text-xs font-medium text-slate-400">across {summary.activated} clients</span>
                        </div>
                    </div>

                    {/* Pending Actions */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertCircle className="w-16 h-16 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Pending Actions</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{priorities.length}</span>
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">Requires attention</span>
                        </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-16 h-16 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Conversion Rate</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{conversionRate}%</span>
                            <span className="text-xs font-medium text-slate-400">Invite acceptance</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Priority Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Priority Stream
                        </h3>

                        {priorities.length > 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                                {priorities.map((priority) => (
                                    <button
                                        key={priority.id}
                                        onClick={() => onPriorityClick?.(priority.customerId)}
                                        className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
                                    >
                                        <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                            {getPriorityIcon(priority.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                    {priority.customerName}
                                                </h4>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${getPriorityBadgeStyle(priority.priority)}`}>
                                                    {priority.priority === 1 ? 'Critical' : priority.priority === 2 ? 'High' : 'Medium'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                                {priority.message}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="capitalize">{priority.type.replace('_', ' ')}</span>
                                                <span>•</span>
                                                <span>Today</span>
                                            </div>
                                        </div>
                                        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">All caught up!</h3>
                                <p className="text-slate-500 mt-1">No pending priorities. Great job.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Quick Views */}
                    <div className="space-y-6">
                        {/* Status Summary */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Client Status</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600 dark:text-slate-300">Activated</span>
                                        <span className="font-medium">{summary.activated}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${(summary.activated / totalCustomers) * 100}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600 dark:text-slate-300">Invited (Pending)</span>
                                        <span className="font-medium">{summary.invited}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(summary.invited / totalCustomers) * 100}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600 dark:text-slate-300">Inactive</span>
                                        <span className="font-medium">{summary.inactive}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${(summary.inactive / totalCustomers) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Mini-Feed (Mock for now) */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Live Feed</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3 text-sm">
                                    <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Maria K.</span> uploaded a Motor policy</p>
                                        <span className="text-xs text-slate-400">2 mins ago</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    <div className="mt-0.5 w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-700 dark:text-slate-300">New gap detected for <span className="font-medium text-slate-900 dark:text-white">John D.</span></p>
                                        <span className="text-xs text-slate-400">1 hour ago</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Stavros L.</span> accepted invitation</p>
                                        <span className="text-xs text-slate-400">3 hours ago</span>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 text-center">View All Activity</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
