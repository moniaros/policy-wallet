"use client"

import React, { useMemo } from 'react'
import { DashboardSummary, Priority, DashboardProps } from './types'
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
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

/* ────────────────────────────────────────────────────
   Inline keyframes – injected once via <style>
   ──────────────────────────────────────────────────── */
const ANIMATION_CSS = `
@keyframes agentFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes agentPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); }
  50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
}
@keyframes agentShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes agentDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .5; transform: scale(.7); }
}
`

export function Dashboard({
    summary,
    priorities,
    onPriorityClick,
    onInviteCustomer
}: DashboardProps) {
    const { t, language } = useLanguage()
    const isGreek = language === 'el'

    // ─── Copy ────────────────────────────────────────
    const copy = useMemo(() => ({
        greeting: (() => {
            const h = new Date().getHours()
            if (h < 12) return t.dashboard.greeting.morning
            if (h < 18) return t.dashboard.greeting.afternoon
            return t.dashboard.greeting.evening
        })(),
        agentWorkspace: isGreek ? 'Χώρος Εργασίας' : 'Workspace',
        brandAgent: 'Agent',
        briefing: isGreek
            ? 'Η σημερινή σας ενημέρωση. Έχετε'
            : "Here's your daily briefing. You have",
        itemsAttention: (n: number) =>
            isGreek
                ? `${n} ${n === 1 ? 'στοιχείο' : 'στοιχεία'} που χρειάζονται προσοχή.`
                : `${n} ${n === 1 ? 'item' : 'items'} requiring attention.`,
        inviteClient: t.dashboard.inviteCustomer,
        totalClients: isGreek ? 'Σύνολο Πελατών' : 'Total Clients',
        activePolicies: isGreek ? 'Ενεργά Συμβόλαια' : 'Active Policies',
        pendingActions: isGreek ? 'Εκκρεμείς Ενέργειες' : 'Pending Actions',
        conversionRate: isGreek ? 'Ρυθμός Μετατροπής' : 'Conversion Rate',
        priorityStream: t.dashboard.priorityQueue,
        clientStatus: isGreek ? 'Κατάσταση Πελατών' : 'Client Status',
        liveFeed: isGreek ? 'Ζωντανή Ροή' : 'Live Feed',
        allCaughtUp: t.dashboard.allClear,
        noPriorities: t.dashboard.noPriorities,
        viewAll: isGreek ? 'Προβολή Όλων' : 'View All',
        today: isGreek ? 'Σήμερα' : 'Today',
        online: isGreek ? 'Online' : 'Online',
        activated: t.dashboard.active,
        invited: t.dashboard.invited,
        inactive: t.dashboard.inactive,
        across: isGreek ? 'σε' : 'across',
        clients: isGreek ? 'πελάτες' : 'clients',
        requiresAttention: isGreek ? 'Χρειάζεται προσοχή' : 'Requires attention',
        inviteAcceptance: isGreek ? 'Αποδοχή πρόσκλησης' : 'Invite acceptance',
        thisWeek: isGreek ? 'αυτή την εβδ.' : 'this week',
        critical: isGreek ? 'Κρίσιμο' : 'Critical',
        high: isGreek ? 'Υψηλό' : 'High',
        medium: isGreek ? 'Μεσαίο' : 'Medium',
        // Mock feed items
        feedItems: isGreek ? [
            { name: 'Μαρία Κ.', action: 'ανέβασε ένα Motor συμβόλαιο', time: '2 λεπτά πριν', color: 'blue' },
            { name: 'Γιάννης Δ.', action: 'εντοπίστηκε νέο κενό', time: '1 ώρα πριν', color: 'purple' },
            { name: 'Σταύρος Λ.', action: 'αποδέχθηκε πρόσκληση', time: '3 ώρες πριν', color: 'emerald' },
        ] : [
            { name: 'Maria K.', action: 'uploaded a Motor policy', time: '2 mins ago', color: 'blue' },
            { name: 'John D.', action: 'new gap detected', time: '1 hour ago', color: 'purple' },
            { name: 'Stavros L.', action: 'accepted invitation', time: '3 hours ago', color: 'emerald' },
        ],
    }), [t, isGreek])

    // ─── Computed KPIs ───────────────────────────────
    const conversionRate = summary.invited > 0
        ? Math.round((summary.activated / (summary.activated + summary.invited)) * 100)
        : 0
    const totalCustomers = summary.activated + summary.invited + summary.inactive

    const kpiCards = [
        {
            label: copy.totalClients,
            value: totalCustomers,
            sub: `+2 ${copy.thisWeek}`,
            subColor: 'text-emerald-500',
            icon: Users,
            gradient: 'from-blue-500 to-indigo-600',
            bgGlow: 'bg-blue-500/10 dark:bg-blue-500/5',
        },
        {
            label: copy.activePolicies,
            value: summary.activated * 2 + 5,
            sub: `${copy.across} ${summary.activated} ${copy.clients}`,
            subColor: 'text-slate-400',
            icon: FileText,
            gradient: 'from-emerald-500 to-teal-600',
            bgGlow: 'bg-emerald-500/10 dark:bg-emerald-500/5',
        },
        {
            label: copy.pendingActions,
            value: priorities.length,
            sub: copy.requiresAttention,
            subColor: 'text-amber-500',
            icon: AlertCircle,
            gradient: 'from-amber-500 to-orange-600',
            bgGlow: 'bg-amber-500/10 dark:bg-amber-500/5',
        },
        {
            label: copy.conversionRate,
            value: `${conversionRate}%`,
            sub: copy.inviteAcceptance,
            subColor: 'text-slate-400',
            icon: TrendingUp,
            gradient: 'from-violet-500 to-purple-600',
            bgGlow: 'bg-violet-500/10 dark:bg-violet-500/5',
        },
    ]

    // ─── Priority helpers ────────────────────────────
    const priorityIcon = (type: string) => {
        const cls = 'w-5 h-5'
        switch (type) {
            case 'open_opportunity': return <BarChart3 className={`${cls} text-amber-500`} />
            case 'pending_invite': return <Mail className={`${cls} text-blue-500`} />
            case 'follow_up': return <MessageCircle className={`${cls} text-violet-500`} />
            default: return <Zap className={`${cls} text-slate-400`} />
        }
    }

    const priorityBadge = (p: number) => {
        if (p === 1) return { label: copy.critical, cls: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20', pulse: true }
        if (p === 2) return { label: copy.high, cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20', pulse: false }
        return { label: copy.medium, cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20', pulse: false }
    }

    // ─── Donut chart ─────────────────────────────────
    const segments = useMemo(() => {
        if (totalCustomers === 0) return []
        const activePct = (summary.activated / totalCustomers) * 100
        const invitedPct = (summary.invited / totalCustomers) * 100
        const inactivePct = (summary.inactive / totalCustomers) * 100
        return [
            { pct: activePct, color: '#10b981', label: copy.activated, count: summary.activated },
            { pct: invitedPct, color: '#3b82f6', label: copy.invited, count: summary.invited },
            { pct: inactivePct, color: '#94a3b8', label: copy.inactive, count: summary.inactive },
        ]
    }, [summary, totalCustomers, copy])

    const donutDashSegments = useMemo(() => {
        const circumference = 2 * Math.PI * 40 // r=40
        let offset = 0
        return segments.map(seg => {
            const dashLen = (seg.pct / 100) * circumference
            const dashGap = circumference - dashLen
            const result = { ...seg, dashLen, dashGap, offset }
            offset += dashLen
            return result
        })
    }, [segments])

    return (
        <>
            {/* ─── Injected animations ─── */}
            <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
                {/* ═══════════ HEADER ═══════════ */}
                <header className="relative overflow-hidden border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30">
                    {/* Decorative gradient blur */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/25">
                                <Briefcase className="w-5 h-5" />
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
                            </div>
                            <h1 className="text-lg font-extrabold tracking-tight">
                                {copy.brandAgent}
                                <span className="text-slate-400 dark:text-slate-500 font-light ml-0.5">{copy.agentWorkspace}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-mono tracking-wider hidden sm:inline-block">
                                {new Date().toLocaleDateString(isGreek ? 'el-GR' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-inner">
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">AG</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* ═══════════ GREETING & QUICK ACTIONS ═══════════ */}
                    <div
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
                        style={{ animation: 'agentFadeUp .5s ease-out both' }}
                    >
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 mb-3">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                {copy.online}
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                                {copy.greeting}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Agent</span>
                            </h2>
                            <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xl text-[15px]">
                                {copy.briefing}{' '}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">{copy.itemsAttention(priorities.length)}</span>
                            </p>
                        </div>

                        <button
                            onClick={onInviteCustomer}
                            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{copy.inviteClient}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>

                    {/* ═══════════ KPI GRID ═══════════ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {kpiCards.map((card, i) => {
                            const Icon = card.icon
                            return (
                                <div
                                    key={card.label}
                                    className={`group relative bg-white dark:bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default`}
                                    style={{ animation: `agentFadeUp .5s ease-out ${100 + i * 80}ms both` }}
                                >
                                    {/* Glow background */}
                                    <div className={`absolute inset-0 ${card.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                    {/* Gradient accent bar */}
                                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                                                <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{card.label}</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</span>
                                            <span className={`text-[11px] font-semibold ${card.subColor}`}>{card.sub}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ═══════════ MAIN CONTENT ═══════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ──── Priority Stream (2/3) ──── */}
                        <div
                            className="lg:col-span-2 space-y-4"
                            style={{ animation: 'agentFadeUp .5s ease-out 500ms both' }}
                        >
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
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
                                    {priorities.map((priority, idx) => {
                                        const badge = priorityBadge(priority.priority)
                                        return (
                                            <button
                                                key={priority.id}
                                                onClick={() => onPriorityClick?.(priority.customerId)}
                                                className="w-full flex items-start gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all text-left group relative cursor-pointer"
                                                style={{ animation: `agentFadeUp .4s ease-out ${550 + idx * 60}ms both` }}
                                            >
                                                {/* Timeline connector */}
                                                {idx < priorities.length - 1 && (
                                                    <div className="absolute left-[34px] top-[52px] bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                                                )}

                                                <div
                                                    className="relative mt-0.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-sm"
                                                    style={badge.pulse ? { animation: 'agentPulse 2s infinite' } : undefined}
                                                >
                                                    {priorityIcon(priority.type)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {priority.customerName}
                                                        </h4>
                                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${badge.cls}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1.5 line-clamp-2">
                                                        {priority.message}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="capitalize">{priority.type.replace(/_/g, ' ')}</span>
                                                        <span className="opacity-40">·</span>
                                                        <span>{copy.today}</span>
                                                    </div>
                                                </div>

                                                <div className="self-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 text-blue-600">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-10 text-center">
                                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <Sparkles className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{copy.allCaughtUp}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">{copy.noPriorities}</p>
                                </div>
                            )}
                        </div>

                        {/* ──── Sidebar (1/3) ──── */}
                        <div
                            className="space-y-5"
                            style={{ animation: 'agentFadeUp .5s ease-out 600ms both' }}
                        >
                            {/* Client Status Ring */}
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    {copy.clientStatus}
                                </h3>

                                {totalCustomers > 0 ? (
                                    <div className="flex items-center gap-5">
                                        {/* SVG Donut */}
                                        <div className="relative w-24 h-24 shrink-0">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                {donutDashSegments.map((seg, i) => (
                                                    <circle
                                                        key={i}
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="none"
                                                        stroke={seg.color}
                                                        strokeWidth="10"
                                                        strokeDasharray={`${seg.dashLen} ${seg.dashGap}`}
                                                        strokeDashoffset={-seg.offset}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-700"
                                                    />
                                                ))}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalCustomers}</span>
                                                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{isGreek ? 'σύνολο' : 'total'}</span>
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="flex-1 space-y-2.5">
                                            {segments.map(seg => (
                                                <div key={seg.label} className="flex items-center gap-2.5">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{seg.label}</span>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{seg.count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 text-center py-4">{isGreek ? 'Δεν υπάρχουν πελάτες ακόμα' : 'No clients yet'}</p>
                                )}
                            </div>

                            {/* Live Activity Feed */}
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" />
                                    {copy.liveFeed}
                                </h3>
                                <div className="space-y-4">
                                    {copy.feedItems.map((item: any, i: number) => {
                                        const dotColors: Record<string, string> = {
                                            blue: 'bg-blue-500',
                                            purple: 'bg-violet-500',
                                            emerald: 'bg-emerald-500',
                                        }
                                        return (
                                            <div key={i} className="flex gap-3 text-sm group/feed" style={{ animation: `agentFadeUp .4s ease-out ${700 + i * 80}ms both` }}>
                                                <div className="relative mt-1.5 shrink-0">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${dotColors[item.color] || 'bg-slate-400'}`}
                                                        style={{ animation: `agentDotPulse 2.5s ease-in-out ${i * 0.4}s infinite` }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                                                        <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>{' '}
                                                        {item.action}
                                                    </p>
                                                    <span className="text-[11px] text-slate-400 mt-0.5 block">{item.time}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button className="w-full mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-center transition-colors flex items-center justify-center gap-1 group/btn cursor-pointer">
                                    {copy.viewAll}
                                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
