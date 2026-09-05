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

import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { StatGrid, StatTile } from "@/components/ui/StatTile"
import { useLanguage } from "@/contexts/LanguageContext"
import { provenanceOf } from "@/lib/gaps/provenance"
import { provenanceLabelWithCitation } from "@/components/gaps/provenance-label"
import { daysLeftLabel } from "@/lib/wallet/days-left-label"
import { displayInsurerName, displayPolicyNumber } from "@/lib/wallet/policy-identity"

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

// Labels only. The per-line hex colours that used to sit beside these are
// gone: a bar's row label already says which line it is, so the fill carries
// no meaning and paints in the one brand colour like every other bar in the
// app.
const lobLabels: Record<string, { en: string; el: string }> = {
    motor: { en: "Motor", el: "Αυτοκίνητο" },
    health: { en: "Health", el: "Υγεία" },
    home: { en: "Home", el: "Κατοικία" },
    life: { en: "Life", el: "Ζωή" },
    travel: { en: "Travel", el: "Ταξίδι" },
    pet: { en: "Pet", el: "Κατοικίδιο" },
    other: { en: "Other", el: "Άλλο" },
}

const getLobLabel = (lob: string, lang: string) =>
    lobLabels[lob]?.[lang === "el" ? "el" : "en"] ?? lob

// A TIMING pill on the status tokens — the state as a word beside it, never
// colour alone. The coloured side bar and tinted row that used to carry this
// are gone (DESIGN.md: no coloured border or side bar on a callout).
const urgencyPill = (days: number) => {
    if (days <= 7) return "bg-status-danger-tint text-status-danger"
    if (days <= 30) return "bg-status-warning-tint text-status-warning"
    return "bg-muted text-foreground"
}

/** Resolves a dotted i18n key («dashboard.home.recPriorityHigh») in the dictionary. */
const resolveKey = (dict: unknown, key: string): string | undefined => {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict)
    return typeof value === "string" ? value : undefined
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
    // Segments paint through currentColor so the ring reads from the theme
    // tokens and flips with dark mode; a hex stroke could not.
    segments: { value: number; className: string; label: string }[]
    size?: number
    strokeWidth?: number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const total = segments.reduce((s, seg) => s + seg.value, 0)

    if (total === 0) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="currentColor" className="text-muted"
                    strokeWidth={strokeWidth} />
            </svg>
        )
    }

    // cumulative ratio preceding each segment (no mutation during render)
    const offsets = segments.map((_, i) =>
        segments.slice(0, i).reduce((s, seg) => s + seg.value / total, 0)
    )

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="currentColor" className="text-muted"
                strokeWidth={strokeWidth} />
            {segments.map((seg, i) => {
                const ratio = seg.value / total
                const dashLength = circumference * ratio
                const dashGap = circumference - dashLength
                const offset = circumference * offsets[i] - circumference * 0.25
                return (
                    <circle key={i} cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="currentColor" className={seg.className} strokeWidth={strokeWidth}
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

    /* KPI tiles — the shared fact cell; the accent tints the glyph only. */
    const kpis = useMemo(() => [
        {
            label: p.totalPremium,
            value: fmtCompact(data.premiumSummary.totalPremium, lang),
            icon: DollarSign,
            accent: "brand" as const,
        },
        {
            label: p.avgPremiumPerCustomer,
            value: fmt(data.premiumSummary.avgPremiumPerCustomer, lang),
            icon: TrendingUp,
            accent: "neutral" as const,
        },
        {
            label: p.policiesPerCustomer,
            value: fmtNum(data.premiumSummary.avgPoliciesPerCustomer, lang),
            icon: FileText,
            accent: "neutral" as const,
        },
        {
            label: p.activationRate,
            value: `${data.portfolioHealth.activationRate}%`,
            icon: Zap,
            accent: "neutral" as const,
        },
    ], [data, lang, p])

    /* Donut segments — stroke and legend dot from the same token each. */
    const donutSegments = useMemo(() => [
        { value: data.portfolioHealth.activeCustomers, className: "text-primary", dot: "bg-primary", label: p.active },
        { value: data.portfolioHealth.invitedCustomers, className: "text-status-warning", dot: "bg-status-warning", label: p.invited },
        { value: data.portfolioHealth.inactiveCustomers, className: "text-muted-foreground", dot: "bg-muted-foreground", label: p.inactive },
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
            { key: "open", label: p.stageOpen, value: m.open, pct: (m.open / maxStage) * 100 },
            { key: "contacted", label: p.stageContacted, value: m.contacted, pct: (m.contacted / maxStage) * 100 },
            { key: "quoted", label: p.stageQuoted, value: m.quoted, pct: (m.quoted / maxStage) * 100 },
            { key: "won", label: p.stageWon, value: m.won, pct: (m.won / maxStage) * 100 },
            { key: "lost", label: p.stageLost, value: m.lost, pct: (m.lost / maxStage) * 100 },
        ]
    }, [data.opportunityMetrics, p])

    const qualifiedPct = data.qualification.pipelineEur > 0
        ? Math.round((data.qualification.qualifiedEur / data.qualification.pipelineEur) * 100)
        : 0

    const renewalMetricCells = data.renewalMetrics
        ? [
            { label: p.tracked, value: data.renewalMetrics.totalTracked },
            { label: p.pending, value: data.renewalMetrics.pendingRenewals },
            { label: p.overdue, value: data.renewalMetrics.overdueRenewals },
            { label: p.renewed, value: data.renewalMetrics.renewedThisMonth },
            { label: p.lapsed, value: data.renewalMetrics.lapsedThisMonth },
            { label: p.renewalRate, value: `${data.renewalMetrics.renewalRate}%` },
            { label: p.premiumAtRisk, value: fmt(data.renewalMetrics.premiumAtRisk, lang) },
        ]
        : []

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — the page names itself on the canvas; the blurred
                    white bar with the shadowed icon is gone. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{p.heading}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.subheading}</p>
                </div>

                {/* ── KPI tiles ── */}
                <StatGrid>
                    {kpis.map((kpi, i) => (
                        <FadeIn key={kpi.label} delay={i * 0.08}>
                            <StatTile icon={kpi.icon} label={kpi.label} value={kpi.value} accent={kpi.accent} className="h-full" />
                        </FadeIn>
                    ))}
                </StatGrid>

                {/* ── Row: Portfolio Health + Premium Breakdown ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Portfolio Health Ring */}
                    <FadeIn delay={0.35} className="pw-card pw-pad">
                        <CardHead
                            icon={Users}
                            title={p.portfolioHealth}
                            id="insights-portfolio-health"
                            meta={<span className="tabular-nums">{data.portfolioHealth.totalCustomers}</span>}
                        />
                        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                            <div className="relative flex-shrink-0">
                                <DonutChart segments={donutSegments} size={180} strokeWidth={22} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-h3 font-semibold leading-none tracking-tight tabular-nums text-foreground">
                                        {data.portfolioHealth.totalCustomers}
                                    </span>
                                    <span className="mt-1 text-caption text-muted-foreground">
                                        {p.customers}
                                    </span>
                                </div>
                            </div>
                            <ul className="w-full flex-1 divide-y divide-border">
                                {donutSegments.map((seg) => (
                                    <li key={seg.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                                        <span className="flex items-center gap-2.5 text-sm text-foreground">
                                            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${seg.dot}`} aria-hidden="true" />
                                            {seg.label}
                                        </span>
                                        <span className="flex items-baseline gap-2 tabular-nums">
                                            <span className="text-sm font-semibold text-foreground">{seg.value}</span>
                                            <span className="text-caption text-muted-foreground">
                                                {data.portfolioHealth.totalCustomers > 0
                                                    ? `${Math.round((seg.value / data.portfolioHealth.totalCustomers) * 100)}%`
                                                    : "0%"}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </FadeIn>

                    {/* Premium Breakdown */}
                    <FadeIn delay={0.45} className="pw-card pw-pad">
                        <CardHead icon={BarChart3} title={p.premiumBreakdown} id="insights-premium-breakdown" />
                        {data.policyBreakdown.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                                icon={BarChart3}
                                headline={p.noData}
                                description={t.emptyStates.insights.premiumBreakdownDesc}
                            />
                        ) : (
                            <div className="mt-4 space-y-3">
                                {data.policyBreakdown.map((item) => {
                                    const pct = (item.totalPremium / maxPremium) * 100
                                    return (
                                        <div key={item.lineOfBusiness}>
                                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                                    {getLobLabel(item.lineOfBusiness, lang)}
                                                </span>
                                                <span className="flex flex-shrink-0 items-baseline gap-3 tabular-nums">
                                                    <span className="text-caption text-muted-foreground">{item.count} {p.policiesAbbr}</span>
                                                    <span className="text-sm font-semibold text-foreground">{fmt(item.totalPremium, lang)}</span>
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                                <motion.div
                                                    className="h-full rounded-full bg-primary"
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Opportunity Funnel */}
                    <FadeIn delay={0.55} className="pw-card pw-pad">
                        <CardHead icon={Target} title={p.opportunityFunnel} id="insights-opportunity-funnel" />
                        <p className="mt-2 text-caption text-muted-foreground">
                            {p.conversionRate}:{" "}
                            <span className="font-semibold tabular-nums text-foreground">{data.opportunityMetrics.conversionRate}%</span>
                            {" · "}
                            {p.total}:{" "}
                            <span className="font-semibold tabular-nums text-foreground">{data.opportunityMetrics.total}</span>
                        </p>

                        {/* Manager deal-review (MEDIC §K): how much of the open
                            pipeline's € rests on real qualification evidence,
                            and the two most common holes — the coaching view.
                            Hidden with an empty pipeline. A callout is a
                            sub-card; the track is the card colour because the
                            muted token is the sunken surface's own value. */}
                        {data.qualification.pipelineCount > 0 && (
                            <div className="pw-subcard mt-4 p-3">
                                <p className="text-caption font-semibold text-foreground">
                                    {t.agentUi.qualificationHealthTitle}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-card" aria-hidden="true">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{ width: `${qualifiedPct}%` }}
                                        />
                                    </div>
                                    <span className="text-caption font-semibold tabular-nums text-foreground">
                                        {qualifiedPct}%
                                    </span>
                                </div>
                                <p className="mt-1 text-caption text-muted-foreground">
                                    {t.agentUi.qualificationShareDesc}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                                    <span>
                                        <b className="font-semibold tabular-nums text-foreground">{data.qualification.missingEb}</b>{" "}
                                        {t.agentUi.qualificationMissingEb}
                                    </span>
                                    <span>
                                        <b className="font-semibold tabular-nums text-foreground">{data.qualification.unconfirmedPain}</b>{" "}
                                        {t.agentUi.qualificationUnconfirmedPain}
                                    </span>
                                </div>
                            </div>
                        )}

                        {data.opportunityMetrics.total === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                                icon={Target}
                                headline={p.noOpportunities}
                                description={t.emptyStates.insights.opportunitiesDesc}
                            />
                        ) : (
                            <div className="mt-4 space-y-3">
                                {funnel.map((stage, i) => (
                                    <div key={stage.key}>
                                        <div className="mb-1.5 flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-foreground">{stage.label}</span>
                                            <span className="text-sm font-semibold tabular-nums text-foreground">{stage.value}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                            <motion.div
                                                className="h-full rounded-full bg-primary"
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
                    <FadeIn delay={0.65} className="pw-card pw-pad">
                        <CardHead
                            icon={CalendarClock}
                            title={p.renewalTimeline}
                            id="insights-renewal-timeline"
                            meta={data.renewalTimeline.length > 0 ? <span className="tabular-nums">{data.renewalTimeline.length}</span> : undefined}
                        />
                        <p className="mt-2 text-caption text-muted-foreground">
                            {p.expiringWithin90}
                        </p>

                        {data.renewalTimeline.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                                icon={CheckCircle2}
                                headline={p.noUpcomingRenewals}
                                description={t.emptyStates.insights.renewalsDesc}
                            />
                        ) : (
                            <ul className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                                {data.renewalTimeline.slice(0, 15).map((item) => (
                                    <li key={item.policyId} className="pw-subcard flex items-start justify-between gap-3 p-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {item.customerName}
                                            </p>
                                            <p className="mt-0.5 text-caption text-muted-foreground">
                                                {displayInsurerName(item.insurerName)} · {getLobLabel(item.lineOfBusiness, lang)}
                                                {displayPolicyNumber(item.policyNumber) ? ` · ${displayPolicyNumber(item.policyNumber)}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold ${urgencyPill(item.daysUntilExpiry)}`}>
                                                {/* A policy expiring today used to be dropped from this
                                                    list entirely; now that it is here, "0 ημ." is not
                                                    what an agent should read on the last day of cover. */}
                                                {daysLeftLabel(item.daysUntilExpiry, {
                                                    today: p.expiresTodayBadge,
                                                    tomorrow: p.expiresTomorrowBadge,
                                                    suffix: p.daysAbbr,
                                                })}
                                            </span>
                                            <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                                                {fmt(item.premiumAmount, lang)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FadeIn>
                </div>

                {/* ── Renewal Metrics — seven fact cells on the sunken surface.
                    The number stays in the text colour: a count painted red
                    is a verdict, and «3 ληξιπρόθεσμες» is a count. ── */}
                {data.renewalMetrics && (
                    <FadeIn delay={0.7} className="pw-card pw-pad">
                        <CardHead
                            icon={RefreshCw}
                            title={p.renewalMetrics}
                            id="insights-renewal-metrics"
                            meta={
                                <Link href="/renewals" className="pw-soft-button">
                                    {p.manageRenewals}
                                </Link>
                            }
                        />
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                            {renewalMetricCells.map((metric) => (
                                <div key={metric.label} className="pw-subcard p-3">
                                    <p className="text-caption leading-snug text-muted-foreground">{metric.label}</p>
                                    <p className="mt-1 text-title font-semibold leading-none tracking-tight tabular-nums text-foreground">{metric.value}</p>
                                </div>
                            ))}
                        </div>
                        {data.renewalMetrics.overdueRenewals > 0 && (
                            <p className="pw-subcard mt-3 flex items-center gap-2 px-3 py-2.5 text-caption font-semibold text-status-warning">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                {p.expiredWithoutAction.replace("{n}", String(data.renewalMetrics.overdueRenewals))}
                            </p>
                        )}
                    </FadeIn>
                )}

                {/* ── Coverage Gaps Summary — tiles on the sunken surface; the
                    severity word is a pill on the status tokens, through the
                    primitive. No count in the head: this is a RECENT slice,
                    and a count over a slice reads as the book's total. ── */}
                <FadeIn delay={0.75} className="pw-card pw-pad">
                    <CardHead icon={ShieldAlert} title={p.coverageGaps} id="insights-coverage-gaps" />
                    <p className="mt-2 text-caption text-muted-foreground">
                        {p.recentGapsDesc}
                    </p>

                    {data.recentGaps.length === 0 ? (
                        <EmptyState
                            className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                            icon={CheckCircle2}
                            headline={p.noGaps}
                            description={p.wellCovered}
                        />
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {data.recentGaps.map((gap) => {
                                // Provenance as text (B3), never a severity word or colour (B1).
                                const prov = provenanceOf((gap as { slug?: string | null }).slug)
                                return (
                                    <div key={gap.id} className="pw-subcard p-3">
                                        <span data-fact="gap.provenance" data-provenance={prov} className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-caption font-medium text-foreground">
                                            {provenanceLabelWithCitation((gap as { slug?: string | null }).slug, lang, t.provenance)}
                                        </span>
                                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                                            {gap.title}
                                        </p>
                                        <p className="truncate text-caption text-muted-foreground">{gap.customerName}</p>
                                        <p className="mt-2 text-caption text-muted-foreground">
                                            {displayPolicyNumber(gap.policyNumber) ? `${displayPolicyNumber(gap.policyNumber)} · ` : ""}
                                            {new Date(gap.detectedAt).toLocaleDateString(locale)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {/* Findings not yet classified are disclosed as such (B3). */}
                    {data.recentGaps.some((gap) => provenanceOf((gap as { slug?: string | null }).slug) === "under_review") && (
                        <p className="mt-3 text-caption text-muted-foreground" data-fact="gap.provenanceGroup" data-provenance="under_review">
                            {t.provenance.underReviewDisclosure}
                        </p>
                    )}
                </FadeIn>
            </div>
        </div>
    )
}
