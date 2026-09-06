"use client"

import {
    AlertTriangle,
    CalendarClock,
    FileUp,
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
import { resolveLocale } from "@/lib/i18n/format"

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
    const locale = resolveLocale(language)

    const money = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    })

    return (
        <section id="agent-kpis" aria-labelledby="agent-kpi-heading" className={className}>
            <h2 id="agent-kpi-heading" className="sr-only">
                {copy.heading}
            </h2>
            <StatGrid>
            <StatTile href="/customers" countKey="agent.totalClients" icon={Users} accent="neutral" label={copy.totalClients} value={String(stats.totalClients)} />
            <StatTile href="/customers?filter=expiring" countKey="agent.expiringClients" icon={CalendarClock} accent="warning" label={copy.expiringClients} value={String(stats.clientsWithExpiring)} />
            <StatTile href="/customers?filter=gaps" countKey="agent.gapClients" icon={AlertTriangle} accent="critical" label={copy.gapClients} value={String(stats.clientsWithGaps)} />
            <StatTile href="/customers?filter=invited" countKey="agent.pendingInvites" icon={Mail} accent="neutral" label={copy.pendingInvites} value={String(stats.pendingInvites)} />
            <StatTile href="/customers" countKey="agent.policiesThisMonth" icon={FileUp} accent="positive" label={copy.policiesThisMonth} value={String(stats.policiesThisMonth)} />
            <StatTile href="/tasks" countKey="agent.followUps" icon={ListChecks} accent="warning" label={copy.followUps} value={String(stats.recommendedFollowUps)} />
            <StatTile href="/opportunities" countKey="agent.pipelineEur" icon={TrendingUp} accent="positive" label={copy.pipeline} value={money.format(stats.pipelineEstimateEur)} />
            {/* F2 (PW-TRANSPARENCY-02): the «Μέσος δείκτης προστασίας» tile — the
                average of the customers' protection scores, threshold-coloured —
                is gone. A score is not a verdict until an underwriter says so. */}
            </StatGrid>
        </section>    )
}
