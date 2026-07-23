"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
    TrendingUp,
    Users,
    DollarSign,
    FileText,
    ShieldAlert,
    CalendarClock,
    CheckCircle2,
    BarChart3,
    Target,
    Zap,
    RefreshCw,
    AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import type { InsightsData } from "./actions"

import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"

interface InsightsClientProps {
    data: InsightsData
    // language kept for prop signature compatibility
    language?: string
}

/* ─── Helpers ─────────────────────────────────────── */

const fmt = (n: number, lang: string) =>
    new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-GB", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n)

const fmtCompact = (n: number, lang: string) =>
    new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-GB", {
        style: "currency",
        currency: "EUR",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    }).format(n)

const fmtNum = (n: number, lang: string) =>
    new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-GB", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    }).format(n)

const lobLabels: Record<string, { en: string; el: string; color: string }> = {
    motor: { en: "Motor", el: "Αυτοκίνητο", color: "#29685B" },
    health: { en: "Health", el: "Υγεία", color: "#3b82f6" },
    home: { en: "Home", el: "Κατοικία", color: "#8b5cf6" },
    life: { en: "Life", el: "Ζωή", color: "#f59e0b" },
    travel: { en: "Travel", el: "Ταξίδι", color: "#ec4899" },
    pet: { en: "Pet", el: "Κατοικίδιο", color: "#89D9B2" },
    other: { en: "Other", el: "Άλλο", color: "#64748b" },
}

const getLobLabel = (lob: string, lang: string, t: any) => {
    const fallback = lobLabels[lob]?.[lang === "el" ? "el" : "en"] ?? lob
    // Optional: hook it up to t.policyTypes if we want pure translation instead of hardcoded lobLabels
    return fallback
}

const getLobColor = (lob: string) => lobLabels[lob]?.color ?? "#64748b"

const urgencyColor = (days: number) => {
    if (days <= 7)  return { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" }
    if (days <= 30) return { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" }
    return { border: "border-l-primary", bg: "bg-primary-tint dark:bg-primary/15", text: "text-[#166534] dark:text-mint", badge: "bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint" }
}

const severityConfig: Record<string, { color: string; bg: string; label: { en: string; el: string } }> = {
    critical: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30", label: { en: "Critical", el: "Κρίσιμο" } },
    high:     { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30", label: { en: "High", el: "Υψηλό" } },
    medium:   { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30", label: { en: "Medium", el: "Μεσαίο" } },
    low:      { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30", label: { en: "Low", el: "Χαμηλό" } },
}

/* ─── Fade-in helper ────────────────────────────────── */

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/* ─── Donut chart SVG component ─────────────────────── */

function DonutChart({
    segments,
    size = 180,
    strokeWidth = 22,
}: {
    segments: { value: number; color: string; label: string }[]
    size?: number
    strokeWidth?: number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const total = segments.reduce((s, seg) => s + seg.value, 0)

    if (total === 0) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="currentColor" className="text-neutral-200 dark:text-neutral-800"
                    strokeWidth={strokeWidth} />
            </svg>
        )
    }

    // cumulative ratio preceding each segment (no mutation during render)
    const offsets = segments.map((_, i) =>
        segments.slice(0, i).reduce((s, seg) => s + seg.value / total, 0)
    )

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="currentColor" className="text-neutral-100 dark:text-neutral-800"
                strokeWidth={strokeWidth} />
            {segments.map((seg, i) => {
                const ratio = seg.value / total
                const dashLength = circumference * ratio
                const dashGap = circumference - dashLength
                const offset = circumference * offsets[i] - circumference * 0.25
                return (
                    <circle key={i} cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke={seg.color} strokeWidth={strokeWidth}
                        strokeDasharray={`${dashLength} ${dashGap}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease" }}
                    />
                )
            })}
        </svg>
    )
}

/* ─── Main component ────────────────────────────────── */

export function InsightsClient({ data }: InsightsClientProps) {
    const { language, t } = useLanguage()
    const locale = language === "el" ? "el-GR" : "en-GB"
    const lang = language || "en"
    const p = t.insights.practice

    /* KPI cards data */
    const kpis = useMemo(() => [
        {
            label: p.totalPremium,
            value: fmtCompact(data.premiumSummary.totalPremium, lang),
            icon: DollarSign,
            bgAccent: "bg-primary-tint dark:bg-primary/15",
        },
        {
            label: p.avgPremiumPerCustomer,
            value: fmt(data.premiumSummary.avgPremiumPerCustomer, lang),
            icon: TrendingUp,
            bgAccent: "bg-mint/20 dark:bg-primary/15",
        },
        {
            label: p.policiesPerCustomer,
            value: fmtNum(data.premiumSummary.avgPoliciesPerCustomer, lang),
            icon: FileText,
            bgAccent: "bg-muted",
        },
        {
            label: p.activationRate,
            value: `${data.portfolioHealth.activationRate}%`,
            icon: Zap,
            bgAccent: "bg-amber-50 dark:bg-amber-950/30",
        },
    ], [data, lang, p])

    /* Donut segments */
    const donutSegments = useMemo(() => [
        { value: data.portfolioHealth.activeCustomers, color: "#29685B", label: p.active },
        { value: data.portfolioHealth.invitedCustomers, color: "#f59e0b", label: p.invited },
        { value: data.portfolioHealth.inactiveCustomers, color: "#94a3b8", label: p.inactive },
    ], [data.portfolioHealth, p])

    /* Premium breakdown max */
    const maxPremium = useMemo(() =>
        Math.max(...data.policyBreakdown.map(p => p.totalPremium), 1),
        [data.policyBreakdown]
    )

    /* Funnel stages */
    const funnel = useMemo(() => {
        const m = data.opportunityMetrics
        const maxStage = Math.max(m.open, m.contacted, m.quoted, m.won, m.lost, 1)
        return [
            { key: "open", label: p.stageOpen, value: m.open, color: "#3b82f6", pct: (m.open / maxStage) * 100 },
            { key: "contacted", label: p.stageContacted, value: m.contacted, color: "#8b5cf6", pct: (m.contacted / maxStage) * 100 },
            { key: "quoted", label: p.stageQuoted, value: m.quoted, color: "#f59e0b", pct: (m.quoted / maxStage) * 100 },
            { key: "won", label: p.stageWon, value: m.won, color: "#29685B", pct: (m.won / maxStage) * 100 },
            { key: "lost", label: p.stageLost, value: m.lost, color: "#ef4444", pct: (m.lost / maxStage) * 100 },
        ]
    }, [data.opportunityMetrics, p])

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950">
            {/* ── Header ── */}
            <div className="relative overflow-hidden bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60">
                <div className="absolute inset-0 bg-primary/5" />
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
                    <div className="flex items-center gap-4">
                        <div className="relative bg-primary text-white dark:text-[#1A2420] p-3 rounded-2xl shadow-lg shadow-primary/25">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-foreground tracking-tight">
                                {p.heading}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {p.subheading}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {kpis.map((kpi, i) => {
                        const Icon = kpi.icon
                        return (
                            <FadeIn key={kpi.label} delay={i * 0.08} className="arc-card p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${kpi.bgAccent}`}>
                                        <Icon className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                                    </div>
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                    {kpi.label}
                                </p>
                                <p className="text-3xl font-black text-foreground tracking-tight">
                                    {kpi.value}
                                </p>
                            </FadeIn>
                        )
                    })}
                </div>

                {/* ── Row: Portfolio Health + Premium Breakdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Portfolio Health Ring */}
                    <FadeIn delay={0.35} className="arc-card p-6">
                        <h2 className="text-lg font-extrabold text-foreground mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary dark:text-mint" />
                            {p.portfolioHealth}
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center gap-8">
                            <div className="relative flex-shrink-0">
                                <DonutChart segments={donutSegments} size={180} strokeWidth={22} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-foreground">
                                        {data.portfolioHealth.totalCustomers}
                                    </span>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                        {p.customers}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                {donutSegments.map((seg) => (
                                    <div key={seg.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{seg.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-foreground">{seg.value}</span>
                                            <span className="text-xs font-bold text-neutral-400">
                                                {data.portfolioHealth.totalCustomers > 0
                                                    ? `${Math.round((seg.value / data.portfolioHealth.totalCustomers) * 100)}%`
                                                    : "0%"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>

                    {/* Premium Breakdown */}
                    <FadeIn delay={0.45} className="arc-card p-6">
                        <h2 className="text-lg font-extrabold text-foreground mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary dark:text-mint" />
                            {p.premiumBreakdown}
                        </h2>
                        {data.policyBreakdown.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                                icon={BarChart3}
                                headline={p.noData}
                                description={t.emptyStates.insights.premiumBreakdownDesc}
                            />
                        ) : (
                            <div className="space-y-4">
                                {data.policyBreakdown.map((item) => {
                                    const color = getLobColor(item.lineOfBusiness)
                                    const pct = (item.totalPremium / maxPremium) * 100
                                    return (
                                        <div key={item.lineOfBusiness}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                                    {getLobLabel(item.lineOfBusiness, lang, t)}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-neutral-400">{item.count} {p.policiesAbbr}</span>
                                                    <span className="text-sm font-black text-foreground">{fmt(item.totalPremium, lang)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ background: color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(pct, 2)}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </FadeIn>
                </div>

                {/* ── Row: Opportunity Funnel + Renewal Timeline ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Opportunity Funnel */}
                    <FadeIn delay={0.55} className="arc-card p-6">
                        <h2 className="text-lg font-extrabold text-foreground mb-2 flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary dark:text-mint" />
                            {p.opportunityFunnel}
                        </h2>
                        <p className="text-xs text-neutral-400 mb-6">
                            {p.conversionRate}:{" "}
                            <span className="font-black text-primary dark:text-mint">{data.opportunityMetrics.conversionRate}%</span>
                            {" · "}
                            {p.total}:{" "}
                            <span className="font-black text-foreground">{data.opportunityMetrics.total}</span>
                        </p>

                        {data.opportunityMetrics.total === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                                icon={Target}
                                headline={p.noOpportunities}
                                description={t.emptyStates.insights.opportunitiesDesc}
                            />
                        ) : (
                            <div className="space-y-3.5">
                                {funnel.map((stage, i) => (
                                    <div key={stage.key}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{stage.label}</span>
                                            </div>
                                            <span className="text-lg font-black text-foreground">{stage.value}</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: stage.color, opacity: 0.85 }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(stage.pct, 3)}%` }}
                                                transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FadeIn>

                    {/* Renewal Timeline */}
                    <FadeIn delay={0.65} className="arc-card p-6">
                        <h2 className="text-lg font-extrabold text-foreground mb-2 flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-amber-500" />
                            {p.renewalTimeline}
                        </h2>
                        <p className="text-xs text-neutral-400 mb-5">
                            {p.expiringWithin90}
                        </p>

                        {data.renewalTimeline.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                                icon={CheckCircle2}
                                headline={p.noUpcomingRenewals}
                                description={t.emptyStates.insights.renewalsDesc}
                            />
                        ) : (
                            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                                {data.renewalTimeline.slice(0, 15).map((item) => {
                                    const uc = urgencyColor(item.daysUntilExpiry)
                                    return (
                                        <div
                                            key={item.policyId}
                                            className={`border-l-4 ${uc.border} ${uc.bg} rounded-xl px-4 py-3 transition-all hover:shadow-sm`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-foreground truncate">
                                                        {item.customerName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {item.insurerName} · {getLobLabel(item.lineOfBusiness, lang, t)} · {item.policyNumber}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${uc.badge}`}>
                                                        {item.daysUntilExpiry}{p.daysAbbr}
                                                    </span>
                                                    <p className="text-xs font-bold text-neutral-500 mt-1">
                                                        {fmt(item.premiumAmount, lang)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </FadeIn>
                </div>

                {/* ── Renewal Metrics ── */}
                {data.renewalMetrics && (
                    <FadeIn delay={0.7} className="arc-card p-6 mb-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-primary dark:text-mint" />
                                {p.renewalMetrics}
                            </h2>
                            <Link
                                href="/renewals"
                                className="text-xs font-bold text-primary dark:text-mint hover:text-primary-hover dark:hover:text-mint/80 transition-colors"
                            >
                                {p.manageRenewals}
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                            {[
                                { label: p.tracked, value: data.renewalMetrics.totalTracked, color: "text-foreground" },
                                { label: p.pending, value: data.renewalMetrics.pendingRenewals, color: "text-amber-600 dark:text-amber-400" },
                                { label: p.overdue, value: data.renewalMetrics.overdueRenewals, color: "text-rose-600 dark:text-rose-400" },
                                { label: p.renewed, value: data.renewalMetrics.renewedThisMonth, color: "text-[#166534] dark:text-mint" },
                                { label: p.lapsed, value: data.renewalMetrics.lapsedThisMonth, color: "text-rose-600 dark:text-rose-400" },
                                { label: p.renewalRate, value: `${data.renewalMetrics.renewalRate}%`, color: "text-primary dark:text-mint" },
                                { label: p.premiumAtRisk, value: fmt(data.renewalMetrics.premiumAtRisk, lang), color: "text-orange-600 dark:text-orange-400" },
                            ].map((metric) => (
                                <div key={metric.label} className="text-center">
                                    <p className={`text-2xl font-black ${metric.color}`}>{metric.value}</p>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{metric.label}</p>
                                </div>
                            ))}
                        </div>
                        {data.renewalMetrics.overdueRenewals > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2.5">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span className="font-bold">
                                    {p.expiredWithoutAction.replace("{n}", String(data.renewalMetrics.overdueRenewals))}
                                </span>
                            </div>
                        )}
                    </FadeIn>
                )}

                {/* ── Coverage Gaps Summary ── */}
                <FadeIn delay={0.75} className="arc-card p-6">
                    <h2 className="text-lg font-extrabold text-foreground mb-2 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        {p.coverageGaps}
                    </h2>
                    <p className="text-xs text-neutral-400 mb-5">
                        {p.recentGapsDesc}
                    </p>

                    {data.recentGaps.length === 0 ? (
                        <EmptyState
                            className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                            icon={CheckCircle2}
                            headline={p.noGaps}
                            description={p.wellCovered}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                            {data.recentGaps.map((gap) => {
                                const sev = severityConfig[gap.severity] ?? severityConfig.low
                                return (
                                    <div key={gap.id} className={`rounded-xl p-4 ${sev.bg}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sev.color}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${sev.color}`}>
                                                {sev.label[language === "el" ? "el" : "en"]}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-foreground line-clamp-2 mb-1">
                                            {gap.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{gap.customerName}</p>
                                        <p className="text-[11px] text-neutral-400 mt-2">
                                            {gap.policyNumber} · {new Date(gap.detectedAt).toLocaleDateString(locale)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </FadeIn>
            </div>
        </div>
    )
}
