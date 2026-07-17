"use client"

import {
    AlertTriangle,
    CalendarClock,
    FileUp,
    Gauge,
    ListChecks,
    Mail,
    TrendingUp,
    Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import type { AgentPortalStats } from "@/lib/services/agent-portal.service"

/**
 * The B2B portal KPI strip — eight book-of-business metrics rendered as
 * compact stat cards. Used on the agent dashboard and the client directory.
 */

interface AgentKpiStripProps {
    stats: AgentPortalStats
    className?: string
}

const ACCENTS: Record<string, string> = {
    slate: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    green: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
}

function KpiCard({
    icon: Icon,
    accent,
    label,
    value,
    sub,
}: {
    icon: LucideIcon
    accent: string
    label: string
    value: string
    sub?: string
}) {
    return (
        <div className="arc-card p-4">
            <div className="flex items-start gap-3">
                <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl ${ACCENTS[accent] || ACCENTS.slate}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        {label}
                    </p>
                    <p className="mt-0.5 truncate text-xl font-black text-foreground">{value}</p>
                    {sub && <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{sub}</p>}
                </div>
            </div>
        </div>
    )
}

export function AgentKpiStrip({ stats, className = "" }: AgentKpiStripProps) {
    const { language } = useLanguage()
    const copy = getRoleCopy(language).agentKpis
    const locale = language === "el" ? "el-GR" : "en-US"

    const money = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    })

    return (
        <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
            <KpiCard icon={Users} accent="slate" label={copy.totalClients} value={String(stats.totalClients)} />
            <KpiCard icon={CalendarClock} accent="amber" label={copy.expiringClients} value={String(stats.clientsWithExpiring)} />
            <KpiCard icon={AlertTriangle} accent="red" label={copy.gapClients} value={String(stats.clientsWithGaps)} />
            <KpiCard icon={Mail} accent="blue" label={copy.pendingInvites} value={String(stats.pendingInvites)} />
            <KpiCard icon={FileUp} accent="green" label={copy.policiesThisMonth} value={String(stats.policiesThisMonth)} />
            <KpiCard icon={ListChecks} accent="amber" label={copy.followUps} value={String(stats.recommendedFollowUps)} />
            <KpiCard icon={TrendingUp} accent="green" label={copy.pipeline} value={money.format(stats.pipelineEstimateEur)} />
            <KpiCard
                icon={Gauge}
                accent={
                    stats.portfolioCompleteness === null
                        ? "slate"
                        : stats.portfolioCompleteness >= 70
                            ? "green"
                            : stats.portfolioCompleteness >= 40
                                ? "amber"
                                : "red"
                }
                label={copy.completeness}
                value={stats.portfolioCompleteness !== null ? `${stats.portfolioCompleteness}/100` : "—"}
                sub={stats.portfolioCompleteness === null ? copy.noScores : undefined}
            />
        </div>
    )
}
