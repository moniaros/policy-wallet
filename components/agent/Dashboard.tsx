"use client"

import { useMemo } from "react"
import { AlertCircle, ArrowRight, Clock3, UserPlus, Users } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import type { DashboardProps } from "./types"

function getPriorityTone(priority: number) {
    if (priority >= 8) return "text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900/30"
    if (priority >= 5) return "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/30"
    return "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/30"
}

export function Dashboard({ summary, priorities, onPriorityClick, onInviteCustomer }: DashboardProps) {
    const { language } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const totalCustomers = useMemo(
        () => summary.invited + summary.activated + summary.inactive,
        [summary]
    )

    const sortedPriorities = useMemo(
        () => [...priorities].sort((a, b) => b.priority - a.priority),
        [priorities]
    )

    return (
        <div className="space-y-6 p-4 md:p-8">
            <section className="rounded-3xl border border-[var(--pw-border)] bg-white/85 p-6 shadow-sm dark:bg-slate-900/80">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {roleCopy.agentDashboard.workspace}
                        </p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            {roleCopy.agentDashboard.dashboardTitle}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {roleCopy.agentDashboard.itemsAttention(sortedPriorities.length)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onInviteCustomer}
                        className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
                    >
                        <UserPlus className="h-4 w-4" />
                        {roleCopy.customerList.addClient}
                    </button>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-2xl border border-[var(--pw-border)] bg-white p-4 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{roleCopy.agentDashboard.totalClients}</span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalCustomers}</p>
                </article>
                <article className="rounded-2xl border border-[var(--pw-border)] bg-white p-4 dark:bg-slate-900">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{roleCopy.customerList.activated}</div>
                    <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">{summary.activated}</p>
                </article>
                <article className="rounded-2xl border border-[var(--pw-border)] bg-white p-4 dark:bg-slate-900">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{roleCopy.customerList.invited}</div>
                    <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">{summary.invited}</p>
                </article>
                <article className="rounded-2xl border border-[var(--pw-border)] bg-white p-4 dark:bg-slate-900">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{roleCopy.customerList.inactive}</div>
                    <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">{summary.inactive}</p>
                </article>
            </section>

            <section className="rounded-3xl border border-[var(--pw-border)] bg-white p-6 shadow-sm dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                        <Clock3 className="h-5 w-5 text-amber-500" />
                        {roleCopy.agentDashboard.pendingActions}
                    </h2>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {sortedPriorities.length}
                    </span>
                </div>

                {sortedPriorities.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {roleCopy.agentDashboard.allCaughtUpSubtext}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedPriorities.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => onPriorityClick?.(item.customerId)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:shadow-sm ${getPriorityTone(item.priority)}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black">{item.customerName}</p>
                                        <p className="mt-1 text-sm">{item.message}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 opacity-80" />
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{roleCopy.agentDashboard.requiresAttention}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
