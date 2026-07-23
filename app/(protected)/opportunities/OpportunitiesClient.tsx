"use client"

import { useState } from "react"
import { Target } from "lucide-react"
import { OpportunityUpdateModal } from "@/components/agent/OpportunityUpdateModal"
import { EmptyState, RecommendationPreviewCard } from "@/components/ui/EmptyState"
import { updateOpportunityStatus } from "../agent/actions"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { TableShell } from "@/components/ui/TableShell"

import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
interface Opportunity {
    id: string
    customerName: string
    customerEmail: string
    title: string
    status: string
    severity: string
    nextActionAt: Date | null
    notes: string | null
    policyId: string | null
    conversionLikelihood: "high" | "medium" | "low" | null
    conversionScore: number | null
}

interface OpportunitiesClientProps {
    initialOpportunities: Opportunity[]
}

type OppSortKey = "customer" | "status" | "likelihood" | "nextAction"

export function OpportunitiesClient({ initialOpportunities }: OpportunitiesClientProps) {
    const [opportunities, setOpportunities] = useState(initialOpportunities)
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
    const [filter, setFilter] = useState<string>('all')
    const router = useRouter()
    const { language, t } = useLanguage()
    const opp_t = t.agentPages.opportunities
    const statusLabel = (key: string) =>
        opp_t.status[key as keyof typeof opp_t.status] ?? key

    const handleUpdate = async (opportunityId: string, status: string, notes: string, nextActionDate?: string) => {
        await updateOpportunityStatus(
            opportunityId,
            status as any,
            notes,
            nextActionDate
        )

        // Update local state
        setOpportunities(opps =>
            opps.map(o => o.id === opportunityId
                ? { ...o, status, notes, nextActionAt: nextActionDate ? new Date(nextActionDate) : null }
                : o
            )
        )

        router.refresh()
    }

    const { sort, toggle, setSort } = useTableSort<OppSortKey>()
    const filteredOpportunities = opportunities.filter(opp => {
        if (filter === 'all') return true
        return opp.status === filter
    })
    const sortedOpportunities = applySort<Opportunity, OppSortKey>(filteredOpportunities, sort, {
        customer: (o: Opportunity) => o.customerName,
        status: (o: Opportunity) => o.status,
        likelihood: (o: Opportunity) => o.conversionScore,
        nextAction: (o: Opportunity) => (o.nextActionAt ? new Date(o.nextActionAt) : null),
    })

    const statusCounts = {
        all: opportunities.length,
        open: opportunities.filter(o => o.status === 'open').length,
        contacted: opportunities.filter(o => o.status === 'contacted').length,
        quoted: opportunities.filter(o => o.status === 'quoted').length,
        won: opportunities.filter(o => o.status === 'won').length,
        lost: opportunities.filter(o => o.status === 'lost').length,
    }

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-page mx-auto px-4 sm:px-6 py-12 lg:py-16">
                <header className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">{opp_t.kicker}</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                        {opp_t.title}
                    </h1>
                    <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        {opp_t.subtitle}
                    </p>
                </header>

                {/* Filters */}
                <div className="mb-8 flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {[
                        { key: 'all', count: statusCounts.all },
                        { key: 'open', count: statusCounts.open },
                        { key: 'contacted', count: statusCounts.contacted },
                        { key: 'quoted', count: statusCounts.quoted },
                        { key: 'won', count: statusCounts.won },
                        { key: 'lost', count: statusCounts.lost },
                    ].map(({ key, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-5 py-2.5 rounded-full font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-300 ${filter === key
                                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xl shadow-neutral-900/10'
                                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white shadow-sm'
                                }`}
                        >
                            {statusLabel(key)} {count > 0 && <span className="ml-1.5 opacity-60 text-xs">({count})</span>}
                        </button>
                    ))}
                </div>

                {/* Opportunities Table */}
                {filteredOpportunities.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        headline={filter === 'all' ? t.emptyStates.opportunities.headline : t.emptyStates.opportunities.filteredHeadline}
                        description={filter === 'all' ? opp_t.emptyAll : opp_t.emptyFiltered.replace('{status}', statusLabel(filter))}
                        cta={filter === 'all'
                            ? { label: t.emptyStates.viewClients, href: '/customers' }
                            : { label: t.emptyStates.clearFilters, onClick: () => setFilter('all') }}
                        previewLabel={filter === 'all' ? t.emptyStates.example : undefined}
                        preview={filter === 'all' ? (
                            <RecommendationPreviewCard
                                title={t.emptyStates.opportunities.exampleTitle}
                                meta={t.emptyStates.opportunities.exampleMeta}
                                urgencyLabel={t.emptyStates.opportunities.exampleUrgency}
                            />
                        ) : undefined}
                    />
                ) : (
                <div className="pw-card overflow-hidden border-t-4 border-t-primary">
                    <TableShell label={opp_t.title}>
                        <MobileSortControl sort={sort} onSort={toggle} onClear={() => setSort(null)} columns={[{ key: "customer", label: opp_t.colCustomer }, { key: "status", label: opp_t.colStatus }, { key: "likelihood", label: opp_t.colLikelihood }, { key: "nextAction", label: opp_t.colNextAction }]} label={opp_t.sortLabel} defaultLabel={opp_t.defaultOrder} className="mb-3" />
                        <table className="pw-stacked-table w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-900/20 border-b border-neutral-100 dark:border-neutral-800/60">
                                    <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={opp_t.colCustomer} align="left" className="px-6 py-5 pl-8" />
                                    <th className="px-6 py-5 text-micro font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{opp_t.colOpportunity}</th>
                                    <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={opp_t.colStatus} align="left" className="px-6 py-5" />
                                    <SortableColumn columnKey="likelihood" sort={sort} onSort={toggle} label={opp_t.colLikelihood} align="left" className="px-6 py-5" />
                                    <SortableColumn columnKey="nextAction" sort={sort} onSort={toggle} label={opp_t.colNextAction} align="left" className="px-6 py-5" />
                                    <th className="px-6 py-5 text-micro font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right pr-8">{opp_t.colActions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                {sortedOpportunities.map((opp) => (
                                        <tr key={opp.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors group">
                                            <td data-label={opp_t.colCustomer} className="px-6 py-6 pl-8">
                                                <div className="font-bold text-foreground capitalize tracking-tight">{opp.customerName}</div>
                                                <div className="text-xs font-medium text-muted-foreground mt-1">{opp.customerEmail}</div>
                                            </td>
                                            <td data-label={opp_t.colOpportunity} className="px-6 py-6">
                                                <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{opp.title}</div>
                                                {opp.notes && (
                                                    <div className="text-body-sm text-muted-foreground mt-1.5 line-clamp-1 max-w-[300px]">
                                                        {opp.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colStatus} className="px-6 py-6">
                                                <span className={`pw-pill uppercase tracking-widest ${opp.status === 'won' ? 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint' :
                                                    opp.status === 'lost' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                                                        opp.status === 'quoted' ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400' :
                                                            opp.status === 'contacted' ? 'bg-mint/25 text-primary dark:bg-primary/15 dark:text-mint' :
                                                                'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    {statusLabel(opp.status)}
                                                </span>
                                            </td>
                                            <td data-label={opp_t.colLikelihood} className="px-6 py-6">
                                                {opp.conversionLikelihood ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`inline-block h-2 w-2 rounded-full ${
                                                            opp.conversionLikelihood === "high" ? "bg-primary" :
                                                            opp.conversionLikelihood === "medium" ? "bg-amber-500" : "bg-neutral-400"
                                                        }`} />
                                                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                                                            {opp_t.likelihood[opp.conversionLikelihood]}
                                                        </span>
                                                        {opp.conversionScore != null && (
                                                            <span className="text-kicker text-neutral-400 dark:text-neutral-500 font-mono">
                                                                {opp.conversionScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-neutral-400">—</span>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colNextAction} className="px-6 py-6 text-sm font-bold text-muted-foreground">
                                                {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB') : '—'}
                                            </td>
                                            <td data-label={opp_t.colActions} className="px-6 py-6 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setSelectedOpp(opp)}
                                                        className="pw-secondary-button pw-btn-sm"
                                                    >
                                                        {opp_t.update}
                                                    </button>

                                                    {opp.policyId && (
                                                        <a
                                                            href={`/wallet/${opp.policyId}`}
                                                            className="pw-primary-button pw-btn-sm"
                                                        >
                                                            {opp_t.view}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </TableShell>
                </div>
                )}
            </div>

            {/* Update Modal */}
            {selectedOpp && (
                <OpportunityUpdateModal
                    isOpen={!!selectedOpp}
                    onClose={() => setSelectedOpp(null)}
                    opportunity={{
                        id: selectedOpp.id,
                        customerName: selectedOpp.customerName,
                        title: selectedOpp.title,
                        status: selectedOpp.status,
                        notes: selectedOpp.notes || undefined
                    }}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    )
}
