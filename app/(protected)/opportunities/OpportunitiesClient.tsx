"use client"

import { useState } from "react"
import { Target, Sparkles } from "lucide-react"
import { OpportunityUpdateModal } from "@/components/agent/OpportunityUpdateModal"
import { EmptyState, RecommendationPreviewCard } from "@/components/ui/EmptyState"
import { updateOpportunityStatus, runBookCrossSell } from "../agent/actions"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { TableShell } from "@/components/ui/TableShell"
import { CardHead } from "@/components/dashboard/home/CardHead"

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
        const res = await updateOpportunityStatus(
            opportunityId,
            status as any,
            notes,
            nextActionDate,
            outcome
        )

        // updateOpportunityStatus RETURNS { error } on unauthorized / not-found
        // rather than throwing. Ignoring that return meant the local state was
        // updated and the modal closed on a rejected write, so an advisor saw
        // an opportunity move to Quoted or Won when the server had refused —
        // and opportunity status feeds the pipeline, conversion rate and the
        // revenue figures on /insights. Throw so the caller's existing
        // error handling (toast + Sentry) actually fires.
        if (res && "error" in res && res.error) {
            throw new Error(String(res.error))
        }

        // Only reflect the change locally once the server has accepted it.
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
                    res.error === 'UPGRADE_REQUIRED'
                        ? opp_t.scanBookUpgrade
                        : res.error === 'RATE_LIMITED'
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
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is, plus the one primary action
                    (the book scan). min-w-0 lets the title column shrink so the
                    action keeps its size; full-width on a phone. */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">{opp_t.title}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{opp_t.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                        <button
                            onClick={handleScanBook}
                            disabled={isScanning}
                            aria-busy={isScanning}
                            className="pw-primary-button w-full justify-center sm:w-auto"
                        >
                            <Sparkles className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-pulse' : ''}`} />
                            <span>{isScanning ? opp_t.scanBookRunning : opp_t.scanBook}</span>
                        </button>
                        <p
                            role="status"
                            aria-live="polite"
                            className="max-w-xs text-caption text-muted-foreground sm:text-right"
                        >
                            {scanMessage || opp_t.scanBookHint}
                        </p>
                    </div>
                </header>

                {/* The status filter is a view switch — the segmented recipe. */}
                <div className="pw-segmented pw-scroll-strip" role="group" aria-label={opp_t.colStatus}>
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
                            type="button"
                            onClick={() => setFilter(key)}
                            aria-pressed={filter === key}
                            className="pw-segment"
                        >
                            {statusLabel(key)}
                            {count > 0 && <span className="tabular-nums font-medium">{count}</span>}
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
                        // Soft: the page's one primary is the book scan in the header.
                        ctaVariant="soft"
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
                <div className="pw-card overflow-hidden">
                    <div className="pw-pad pb-0">
                        <CardHead
                            icon={Target}
                            title={opp_t.title}
                            meta={<span className="tabular-nums">{filteredOpportunities.length}</span>}
                        />
                        {/* An agent allocates their day by this column. The score is a
                            heuristic over gap severity, profile completeness, engagement
                            and detection recency — it has never been calibrated against
                            the won/lost outcomes the product already records, so it is a
                            prioritisation aid, not a forecast. Say which. */}
                        <p className="mt-3 text-caption leading-snug text-muted-foreground">
                            {opp_t.likelihoodNote}
                        </p>
                        <MobileSortControl sort={sort} onSort={toggle} onClear={() => setSort(null)} columns={[{ key: "customer", label: opp_t.colCustomer }, { key: "status", label: opp_t.colStatus }, { key: "likelihood", label: opp_t.colLikelihood }, { key: "qualification", label: opp_t.colQualification }, { key: "nextAction", label: opp_t.colNextAction }]} label={opp_t.sortLabel} defaultLabel={opp_t.defaultOrder} className="mt-3" />
                    </div>
                    <TableShell label={opp_t.title}>
                        <table className="pw-stacked-table w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={opp_t.colCustomer} align="left" className="px-6 py-4" />
                                    <th className="px-6 py-4 text-caption font-semibold text-muted-foreground">{opp_t.colOpportunity}</th>
                                    <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={opp_t.colStatus} align="left" className="px-6 py-4" />
                                    <SortableColumn columnKey="likelihood" sort={sort} onSort={toggle} label={opp_t.colLikelihood} align="left" className="px-6 py-4" />
                                    <SortableColumn columnKey="qualification" sort={sort} onSort={toggle} label={opp_t.colQualification} align="left" className="px-6 py-4" />
                                    <SortableColumn columnKey="nextAction" sort={sort} onSort={toggle} label={opp_t.colNextAction} align="left" className="px-6 py-4" />
                                    <th className="px-6 py-4 text-right text-caption font-semibold text-muted-foreground">{opp_t.colActions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {sortedOpportunities.map((opp) => (
                                        <tr key={opp.id} className="group transition-colors hover:bg-muted/40">
                                            <td data-label={opp_t.colCustomer} className="px-6 py-5">
                                                <div className="font-semibold text-foreground">{opp.customerName}</div>
                                                <div className="mt-0.5 text-caption text-muted-foreground">{opp.customerEmail}</div>
                                            </td>
                                            <td data-label={opp_t.colOpportunity} className="px-6 py-5">
                                                <div className="text-sm font-semibold text-foreground">{opp.title}</div>
                                                {opp.notes && (
                                                    <div className="text-body-sm text-muted-foreground mt-1.5 line-clamp-1 max-w-[300px]">
                                                        {opp.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colStatus} className="px-6 py-5">
                                                {/* The state as a word on the status tokens: won =
                                                    success, lost = danger, open = warning (it wants
                                                    attention), contacted = info, quoted = neutral. */}
                                                <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold ${opp.status === 'won' ? 'bg-status-success-tint text-status-success' :
                                                    opp.status === 'lost' ? 'bg-status-danger-tint text-status-danger' :
                                                        opp.status === 'quoted' ? 'bg-muted text-foreground' :
                                                            opp.status === 'contacted' ? 'bg-status-info-tint text-status-info' :
                                                                'bg-status-warning-tint text-status-warning'
                                                    }`}>
                                                    {statusLabel(opp.status)}
                                                </span>
                                            </td>
                                            <td data-label={opp_t.colLikelihood} className="px-6 py-5">
                                                {opp.conversionLikelihood ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`inline-block h-2 w-2 rounded-full ${
                                                            opp.conversionLikelihood === "high" ? "bg-status-success" :
                                                            opp.conversionLikelihood === "medium" ? "bg-status-warning" : "bg-muted-foreground"
                                                        }`} aria-hidden="true" />
                                                        <span className="text-caption font-semibold text-foreground">
                                                            {opp_t.likelihood[opp.conversionLikelihood]}
                                                        </span>
                                                        {opp.conversionScore != null && (
                                                            <span className="text-caption tabular-nums text-muted-foreground">
                                                                {opp.conversionScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-caption text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colQualification} className="px-6 py-5">
                                                {opp.medicScore != null ? (
                                                    <span className="inline-flex items-baseline gap-1">
                                                        <span className="text-sm font-semibold tabular-nums text-foreground">{opp.medicScore}</span>
                                                        <span className="text-caption text-muted-foreground">/100</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-caption text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td data-label={opp_t.colNextAction} className="px-6 py-5 text-sm text-muted-foreground">
                                                {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB') : '—'}
                                            </td>
                                            <td data-label={opp_t.colActions} className="px-6 py-5 text-right">
                                                {/* Soft pills: the page's one primary is the book scan. */}
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedOpp(opp)}
                                                        className="pw-soft-button"
                                                    >
                                                        {opp_t.update}
                                                    </button>

                                                    {opp.policyId && (
                                                        <a
                                                            href={`/wallet/${opp.policyId}`}
                                                            className="pw-soft-button"
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
