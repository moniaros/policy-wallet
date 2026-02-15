"use client"

import React, { useMemo } from "react"
import { DashboardProps } from "./types"
import {
    TrendingUp,
    Users,
    Mail,
    Zap,
    ArrowRight,
    FileText,
    AlertCircle,
    Plus,
    Activity,
    Clock,
    ChevronRight,
    Briefcase,
    Shield,
    Sparkles,
    BarChart3,
    ArrowUpRight,
    MessageCircle,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"

export function Dashboard({ summary, priorities, onPriorityClick, onInviteCustomer }: DashboardProps) {
    const { t, language } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const isGreek = language === "el"

    const copy = useMemo(() => ({
        greeting: (() => {
            const h = new Date().getHours()
            if (h < 12) return t.dashboard.greeting.morning
            if (h < 18) return t.dashboard.greeting.afternoon
            return t.dashboard.greeting.evening
        })(),
        inviteClient: t.dashboard.inviteCustomer,
        totalClients: roleCopy.agentDashboard.totalClients,
        activePolicies: roleCopy.agentDashboard.activePolicies,
        pendingActions: roleCopy.agentDashboard.pendingActions,
        conversionRate: roleCopy.agentDashboard.conversionRate,
        priorityStream: t.dashboard.priorityQueue,
        allCaughtUp: t.dashboard.allClear,
        noPriorities: t.dashboard.noPriorities,
    }), [t, roleCopy])

    const conversionRate = summary.invited > 0
        ? Math.round((summary.activated / (summary.activated + summary.invited)) * 100)
        : 0
    const totalCustomers = summary.activated + summary.invited + summary.inactive

    const kpiCards = [
        { label: copy.totalClients, value: totalCustomers, sub: `+2 ${roleCopy.agentDashboard.thisWeek}`, icon: Users },
        { label: copy.activePolicies, value: summary.activated * 2 + 5, sub: `${roleCopy.agentDashboard.across} ${summary.activated} ${roleCopy.agentDashboard.clients}`, icon: FileText },
        { label: copy.pendingActions, value: priorities.length, sub: roleCopy.agentDashboard.requiresAttention, icon: AlertCircle },
        { label: copy.conversionRate, value: `${conversionRate}%`, sub: roleCopy.agentDashboard.inviteAcceptance, icon: TrendingUp },
    ]

    const priorityIcon = (type: string) => {
        const cls = "w-5 h-5"
        switch (type) {
            case "open_opportunity": return <BarChart3 className={`${cls} text-amber-500`} />
            case "pending_invite": return <Mail className={`${cls} text-blue-500`} />
            case "follow_up": return <MessageCircle className={`${cls} text-violet-500`} />
            default: return <Zap className={`${cls} text-slate-400`} />
        }
    }

    const priorityBadge = (p: number) => {
        if (p === 1) return { label: roleCopy.agentDashboard.critical, cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" }
        if (p === 2) return { label: roleCopy.agentDashboard.high, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" }
        return { label: roleCopy.agentDashboard.medium, cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
            <header className="relative overflow-hidden border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/25">
                            <Briefcase className="w-5 h-5" />
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
                        </div>
                        <h1 className="text-lg font-extrabold tracking-tight">
                            {roleCopy.agentDashboard.brandAgent}
                            <span className="text-slate-400 dark:text-slate-500 font-light ml-1">{roleCopy.agentDashboard.workspace}</span>
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 mb-3">
                            {roleCopy.agentDashboard.online}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                            {copy.greeting}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{roleCopy.agentDashboard.brandAgent}</span>
                        </h2>
                        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xl text-[15px]">
                            {roleCopy.agentDashboard.briefing} <span className="font-semibold text-amber-600 dark:text-amber-400">{roleCopy.agentDashboard.itemsAttention(priorities.length)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onInviteCustomer}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{copy.inviteClient}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {kpiCards.map((card) => {
                        const Icon = card.icon
                        return (
                            <div key={card.label} className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <Icon className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" style={{ width: 18, height: 18 }} />
                                    </div>
                                </div>
                                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{card.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</span>
                                    <span className="text-[11px] font-semibold text-slate-400">{card.sub}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-amber-500" />
                                {copy.priorityStream}
                            </h3>
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                {priorities.length} {priorities.length === 1 ? t.dashboard.item : t.dashboard.items}
                            </span>
                        </div>

                        {priorities.length > 0 ? (
                            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
                                {priorities.map((priority) => {
                                    const badge = priorityBadge(priority.priority)
                                    return (
                                        <button
                                            key={priority.id}
                                            onClick={() => onPriorityClick?.(priority.customerId)}
                                            className="w-full flex items-start gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all text-left group cursor-pointer"
                                        >
                                            <div className="relative mt-0.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                {priorityIcon(priority.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{priority.customerName}</h4>
                                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${badge.cls}`}>{badge.label}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1.5 line-clamp-2">{priority.message}</p>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="capitalize">{priority.type.replace(/_/g, " ")}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-all self-center" />
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-10 text-center">
                                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                    <Sparkles className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{copy.allCaughtUp}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">{copy.noPriorities}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                {roleCopy.agentDashboard.clientStatus}
                            </h3>
                            <p className="text-sm text-slate-500">{summary.activated} {t.dashboard.active} / {summary.invited} {t.dashboard.invited} / {summary.inactive} {t.dashboard.inactive}</p>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />
                                {roleCopy.agentDashboard.liveFeed}
                            </h3>
                            <div className="space-y-4">
                                {roleCopy.agentDashboard.feedItems.map((item, i) => (
                                    <div key={`${item.name}-${i}`} className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-700 dark:text-slate-300 leading-snug">
                                                <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span> {item.action}
                                            </p>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">{item.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 text-center transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                {roleCopy.agentDashboard.viewAll}
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

