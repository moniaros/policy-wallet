"use client"

import React from 'react'
import { DashboardSummary, Priority, DashboardProps } from './types'
import { TrendingUp, Users, Mail, Zap, ArrowRight, Phone, MessageCircle } from 'lucide-react'

export function Dashboard({
    summary,
    priorities,
    onPriorityClick,
    onInviteCustomer
}: DashboardProps) {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const getPriorityIcon = (type: string) => {
        switch (type) {
            case 'open_opportunity':
                return <Zap className="w-5 h-5" strokeWidth={2.5} />
            case 'pending_invite':
                return <Mail className="w-5 h-5" strokeWidth={2.5} />
            default:
                return <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
        }
    }

    const getPriorityColor = (type: string) => {
        switch (type) {
            case 'open_opportunity':
                return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            case 'pending_invite':
                return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            default:
                return 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Mobile-optimized container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

                {/* Header Section */}
                <header className="mb-8 sm:mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8">
                        <div className="flex-1">
                            {/* Greeting Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded-full mb-4">
                                <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                    {getGreeting()}
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3 sm:mb-4 leading-tight">
                                Today's <span className="text-sky-600 dark:text-sky-400">Command</span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                                Focus on activated customers and open opportunities that need your attention.
                            </p>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={onInviteCustomer}
                            className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white rounded-2xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5 active:scale-95"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="hidden sm:inline">Invite Customer</span>
                            <span className="sm:hidden">Invite</span>
                        </button>
                    </div>
                </header>

                {/* Stats Grid - Mobile Optimized */}
                <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-16">
                    {/* Activated */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Active
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-none">
                                {summary.activated}
                            </span>
                        </div>
                    </div>

                    {/* Pending Invite */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Invited
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-none">
                                {summary.invited}
                            </span>
                        </div>
                    </div>

                    {/* Inactive */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Inactive
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-none">
                                {summary.inactive}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Priority Queue */}
                <div>
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Priority Queue
                        </h2>
                        {priorities.length > 0 && (
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {priorities.length} {priorities.length === 1 ? 'item' : 'items'}
                            </span>
                        )}
                    </div>

                    {priorities.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                            {priorities.map((priority: Priority) => (
                                <button
                                    key={priority.id}
                                    onClick={() => onPriorityClick?.(priority.customerId)}
                                    className="w-full flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl text-left hover:border-sky-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${getPriorityColor(priority.type)}`}>
                                            {getPriorityIcon(priority.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                                                    {priority.customerName}
                                                </span>
                                                <span className="hidden sm:inline text-slate-300 dark:text-slate-700 font-light">•</span>
                                                <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                                    {priority.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                {priority.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="ml-3 p-2 sm:p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-all flex-shrink-0">
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Empty State
                        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl py-12 sm:py-16 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                All Clear!
                            </h3>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto px-4">
                                No priorities at the moment. Great work staying on top of everything!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
