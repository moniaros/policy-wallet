"use client"

import React, { useMemo } from "react"
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
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"

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
    type: "renewal" | "follow_up" | "claim" | "opportunity"
    customerName: string
    description: string
    dueDate: string
    priority: "high" | "medium" | "low"
    value?: number
}

interface DesktopDashboardProps {
    stats: DashboardStats
    priorities: Priority[]
    recentActivity: Array<{
        id: string
        type: "policy_added" | "customer_invited" | "renewal_completed" | "claim_filed"
        customerName: string
        timestamp: string
        details: string
    }>
    onPriorityClick: (id: string) => void
    onInviteCustomer: () => void
}

export function DesktopDashboard({ stats, priorities, recentActivity, onPriorityClick, onInviteCustomer }: DesktopDashboardProps) {
    const { language, t } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const statCards = useMemo(() => [
        {
            label: roleCopy.agentDashboard.totalClients,
            value: stats.totalCustomers,
            change: stats.monthlyGrowth,
            icon: Users,
            trend: stats.monthlyGrowth > 0 ? "up" as const : "down" as const,
        },
        {
            label: roleCopy.agentDashboard.activePolicies,
            value: stats.totalPolicies,
            change: 12,
            icon: FileText,
            trend: "up" as const,
        },
        {
            label: language === "el" ? "Συνολικό Ασφάλιστρο" : "Total Premium",
            value: new Intl.NumberFormat(language === "el" ? "el-GR" : "en-US", { style: "currency", currency: "EUR", notation: "compact" }).format(stats.totalPremium),
            change: 8.5,
            icon: DollarSign,
            trend: "up" as const,
        },
        {
            label: roleCopy.agentDashboard.conversionRate,
            value: `${stats.conversionRate}%`,
            change: 3.2,
            icon: Target,
            trend: "up" as const,
        },
    ], [stats, language, roleCopy])

    const getPriorityColor = (priority: Priority["priority"]) => {
        switch (priority) {
            case "high": return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
            case "medium": return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            case "low": return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
        }
    }

    const getPriorityIcon = (type: Priority["type"]) => {
        const cls = "w-5 h-5"
        switch (type) {
            case "renewal": return <Calendar className={cls} />
            case "follow_up": return <Clock className={cls} />
            case "claim": return <AlertCircle className={cls} />
            case "opportunity": return <TrendingUp className={cls} />
        }
    }

    const priorityLabel = (priority: Priority["priority"]) => {
        if (priority === "high") return roleCopy.agentDashboard.high
        if (priority === "medium") return roleCopy.agentDashboard.medium
        return language === "el" ? "Χαμηλό" : "Low"
    }

    const getActivityIcon = (type: typeof recentActivity[0]["type"]) => {
        switch (type) {
            case "policy_added": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            case "customer_invited": return <Users className="w-4 h-4 text-blue-500" />
            case "renewal_completed": return <Calendar className="w-4 h-4 text-violet-500" />
            case "claim_filed": return <AlertCircle className="w-4 h-4 text-amber-500" />
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-[1400px] mx-auto px-8 py-6 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/25">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{roleCopy.agentDashboard.dashboardTitle}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{roleCopy.agentDashboard.dashboardSubtitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={onInviteCustomer}
                            className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                            <Users className="w-5 h-5" />
                            {t.dashboard.inviteCustomer}
                            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-8">
                <div className="grid grid-cols-4 gap-5 mb-8">
                    {statCards.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <div key={stat.label} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-bold ${stat.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                                        {stat.trend === "up" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                                        {stat.change}%
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-8">
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-amber-500" />
                                    {t.dashboard.priorityQueue}
                                </h2>
                                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                    {priorities.length} {priorities.length === 1 ? t.dashboard.item : t.dashboard.items}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {priorities.length === 0 ? (
                                    <div className="text-center py-14">
                                        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                                            <Sparkles className="w-7 h-7" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t.dashboard.allClear}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">{roleCopy.agentDashboard.allCaughtUpSubtext}</p>
                                    </div>
                                ) : (
                                    priorities.map((priority) => (
                                        <div
                                            key={priority.id}
                                            onClick={() => onPriorityClick(priority.id)}
                                            className={`border-l-4 ${getPriorityColor(priority.priority)} rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">{getPriorityIcon(priority.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">{priority.customerName}</h3>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200/50 text-slate-700 dark:text-slate-300">
                                                                {priorityLabel(priority.priority)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{priority.description}</p>
                                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {roleCopy.agentDashboard.due}: {new Date(priority.dueDate).toLocaleDateString(language === "el" ? "el-GR" : "en-US")}
                                                            </span>
                                                            {priority.value && (
                                                                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    <DollarSign className="w-3 h-3" />
                                                                    {new Intl.NumberFormat(language === "el" ? "el-GR" : "en-US", { style: "currency", currency: "EUR" }).format(priority.value)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-all self-center" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-4">
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Activity className="w-4.5 h-4.5 text-violet-500" style={{ width: 18, height: 18 }} />
                                {roleCopy.agentDashboard.recentActivity}
                            </h2>

                            <div className="space-y-5">
                                {recentActivity.map((activity, i) => (
                                    <div key={activity.id} className="flex items-start gap-3 group/item">
                                        <div className="relative mt-0.5">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">{getActivityIcon(activity.type)}</div>
                                            {i < recentActivity.length - 1 && (
                                                <div className="absolute left-1/2 top-[36px] -translate-x-1/2 w-px h-4 bg-slate-200 dark:bg-slate-800" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{activity.customerName}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{activity.details}</p>
                                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(activity.timestamp).toLocaleTimeString(language === "el" ? "el-GR" : "en-US")}
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

