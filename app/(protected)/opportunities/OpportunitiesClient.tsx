"use client"

import { useState } from "react"
import { Target, Sparkles } from "lucide-react"
import { OpportunityUpdateModal } from "@/components/agent/OpportunityUpdateModal"
import { EmptyState, RecommendationPreviewCard } from "@/components/ui/EmptyState"
import { updateOpportunityStatus, runBookCrossSell } from "../agent/actions"
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
    /** MEDIC qualification score (0–100) — null until the advisor qualifies. */
    medicScore: number | null
    /** MEDIC snapshot for the modal scorecard (read view). */
    medic: import("@/lib/medic/types").MedicData | null
}

interface OpportunitiesClientProps {
    initialOpportunities: Opportunity[]
}

type OppSortKey = "customer" | "status" | "likelihood" | "qualification" | "nextAction"

export function OpportunitiesClient({ initialOpportunities }: OpportunitiesClientProps) {
    const [opportunities, setOpportunities] = useState(initialOpportunities)
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
    const [filter, setFilter] = useState<string>('all')
    const router = useRouter()
    const { language, t } = useLanguage()
    const opp_t = t.agentPages.opportunities
    const statusLabel = (key: string) =>
        opp_t.status[key as keyof typeof opp_t.status] ?? key

    const handleUpdate = async (
        opportunityId: string,
        status: string,
        notes: string,
        nextActionDate?: string,
        outcome?: string
    ) => {
        await updateOpportunityStatus(
            opportunityId,
            status as any,
            notes,
            nextActionDate,
            outcome
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

    // F-06: book-wide cross-sell. The service existed and worked with no UI
    // caller at all, so a top-3 advisor revenue feature shipped nothing.
    const [isScanning, setIsScanning] = useState(false)
    const [scanMessage, setScanMessage] = useState<string | null>(null)

    const handleScanBook = async () => {
        setIsScanning(true)
        setScanMessage(null)
        try {
            const res = await runBookCrossSell()
            if ('error' in res) {
                setScanMessage(
                    res.error === 'upgrade_required'
                        ? opp_t.scanBookUpgrade
                        : res.error === 'rate_limited'
                            ? opp_t.scanBookRateLimited
                            : t.apiErrors.generic
                )
                return
            }
            setScanMessage(
                res.opportunitiesCreated > 0
                    ? opp_t.scanBookFound
                        .replace('{count}', String(res.opportunitiesCreated))
                        .replace('{customers}', String(res.customersAnalyzed))
                    : opp_t.scanBookNoneFound.replace('{customers}', String(res.customersAnalyzed))
            )
            router.refresh()
        } catch {
            // A transport failure must not leave the button stuck on "Scanning".
            setScanMessage(t.apiErrors.generic)
        } finally {
            setIsScanning(false)
        }
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
        qualification: (o: Opportunity) => o.medicScore,
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
                {/* min-w-0 lets the title column shrink so the action keeps its
                    full size; the button is full-width and centred on mobile and
                    right-aligned from sm, matching /customers. */}
                <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="min-w-0">
                        <span className="pw-kicker inline-block mb-2">{opp_t.kicker}</span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                            {opp_t.title}
                        </h1>
                        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                            {opp_t.subtitle}
                        </p>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
                        <button
                            onClick={handleScanBook}
                            disabled={isScanning}
                            aria-busy={isScanning}
                            className="pw-primary-button justify-center w-full sm:w-auto"
                        >
                            <Sparkles className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-pulse' : ''}`} />
                            <span>{isScanning ? opp_t.scanBookRunning : opp_t.scanBook}</span>
                        </button>
                        <p
                            role="status"
                            aria-live="polite"
                            className="text-xs font-medium text-neutral-500 dark:text-neutral-400 max-w-xs text-center sm:text-right"
                        >
                            {scanMessage || opp_t.scanBookHint}
                        </p>
                    </div>
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
                                : 'bg-white text-neutral-600 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 hover:text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white shadow-sm'
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
                    {/* An agent allocates their day by this column. The score is a
                        heuristic over gap severity, profile completeness, engagement
                        and detection recency — it has never been calibrated against
                        the won/lost outcomes the product already records, so it is a
                        prioritisation aid, not a forecast. Say which. */}
                    <p className="px-6 pt-4 text-caption leading-snug text-muted-foreground">
                        {opp_t.likelihoodNote}
                    </p>
                    <TableShell label={opp_t.title}>
                        <MobileSortControl sort={sort} onSort={toggle} onClear={() => setSort(null)} columns={[{ key: "customer", label: opp_t.colCustomer }, { key: "status", label: opp_t.colStatus }, { key: "likelihood", label: opp_t.colLikelihood }, { key: "qualification", label: opp_t.colQualification }, { key: "nextAction", label: opp_t.colNextAction }]} label={opp_t.sortLabel} defaultLabel={opp_t.defaultOrder} className="mb-3" />
                        <table className="pw-stacked-table w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-900/20 border-b border-neutral-100 dark:border-neutral-800/60">
                                    <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={opp_t.colCustomer} align="left" className="px-6 py-5 pl-8" />
                                    <th className="px-6 py-5 text-micro font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{opp_t.colOpportunity}</th>
                                    <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={opp_t.colStatus} align="left" className="px-6 py-5" />
                                    <SortableColumn columnKey="likelihood" sort={sort} onSort={toggle} label={opp_t.colLikelihood} align="left" className="px-6 py-5" />
                                    <SortableColumn columnKey="qualification" sort={sort} onSort={toggle} label={opp_t.colQualification} align="left" className="px-6 py-5" />
                                    <SortableColumn columnKey="nextAction" sort={sort} onSort={toggle} label={opp_t.colNextAction} align="left" className="px-6 py-5" />
                                    <th className="px-6 py-5 text-micro font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-right pr-8">{opp_t.colActions}</th>
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
                                                            <span className="text-kicker text-neutral-500 dark:text-neutral-400 font-mono">
                                                                {opp.conversionScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">—</span>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colQualification} className="px-6 py-6">
                                                {opp.medicScore != null ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">{opp.medicScore}</span>
                                                        <span className="text-kicker text-neutral-500 dark:text-neutral-400">/100</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">—</span>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colNextAction} className="px-6 py-6 text-sm font-bold text-muted-foreground">
                                                {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB') : '—'}
                                            </td>
                                            <td data-label={opp_t.colActions} className="px-6 py-6 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
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
                    // Remount per opportunity: the modal seeds local state
                    // (medicView, note draft) from props on mount.
                    key={selectedOpp.id}
                    isOpen={!!selectedOpp}
                    onClose={() => setSelectedOpp(null)}
                    opportunity={{
                        id: selectedOpp.id,
                        customerName: selectedOpp.customerName,
                        title: selectedOpp.title,
                        status: selectedOpp.status,
                        notes: selectedOpp.notes || undefined,
                        // The scorecard's data — omitting this rendered the
                        // empty state for EVERY opportunity (caught by the
                        // MEDIC-ladder E2E, exactly as §K's verification intended).
                        medic: selectedOpp.medic,
                    }}
                    onUpdate={handleUpdate}
                    // Without this, a € / EB patch left the row's score stale AND
                    // reopening the modal re-seeded from the stale row — the
                    // advisor's saved edits looked lost.
                    onMedicChange={(opportunityId, medic, medicScore) => {
                        setOpportunities(opps =>
                            opps.map(o => o.id === opportunityId ? { ...o, medic, medicScore } : o)
                        )
                        setSelectedOpp(prev =>
                            prev && prev.id === opportunityId ? { ...prev, medic, medicScore } : prev
                        )
                    }}
                />
            )}
        </div>
    )
}
