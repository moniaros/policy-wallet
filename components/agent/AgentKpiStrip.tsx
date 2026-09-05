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
import { StatTile, StatGrid } from "@/components/ui/StatTile"

/**
 * The B2B portal KPI strip — eight book-of-business metrics rendered as
 * compact stat cards. Used on the agent dashboard and the client directory.
 */

interface AgentKpiStripProps {
    stats: AgentPortalStats
    className?: string
}


export function AgentKpiStrip({ stats, className = "" }: AgentKpiStripProps) {
    const { language } = useLanguage()
    const copy = getRoleCopy(language).agentKpis
    const locale = language === "el" ? "el-GR" : "en-GB"

    const money = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    })

    return (
        <StatGrid className={className}>
            <StatTile icon={Users} accent="neutral" label={copy.totalClients} value={String(stats.totalClients)} />
            <StatTile icon={CalendarClock} accent="warning" label={copy.expiringClients} value={String(stats.clientsWithExpiring)} />
            <StatTile icon={AlertTriangle} accent="critical" label={copy.gapClients} value={String(stats.clientsWithGaps)} />
            <StatTile icon={Mail} accent="neutral" label={copy.pendingInvites} value={String(stats.pendingInvites)} />
            <StatTile icon={FileUp} accent="positive" label={copy.policiesThisMonth} value={String(stats.policiesThisMonth)} />
            <StatTile icon={ListChecks} accent="warning" label={copy.followUps} value={String(stats.recommendedFollowUps)} />
            <StatTile icon={TrendingUp} accent="positive" label={copy.pipeline} value={money.format(stats.pipelineEstimateEur)} />
            <StatTile
                icon={Gauge}
                accent={
                    stats.portfolioCompleteness === null
                        ? "neutral"
                        : stats.portfolioCompleteness >= 70
                            ? "positive"
                            : stats.portfolioCompleteness >= 40
                                ? "warning"
                                : "critical"
                }
                label={copy.completeness}
                value={stats.portfolioCompleteness !== null ? `${stats.portfolioCompleteness}/100` : "—"}
                hint={stats.portfolioCompleteness === null ? copy.noScores : undefined}
            />
        </StatGrid>
    )
}
