"use client"

import React, { useMemo, useState } from "react"
import { Search, Phone, Mail, LayoutList, LayoutGrid, Download, UserPlus, Sparkles, FileText, ChevronRight, ArrowDownUp } from "lucide-react"

import { Customer, CustomerListProps } from "./types"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { EmptyState, CustomerPreviewRow } from "@/components/ui/EmptyState"
import { ConsentStatusBadge, type ConsentStatus } from "@/components/ui/ConsentStatusBadge"
import { TableShell } from "@/components/ui/TableShell"
import { RowCheckbox } from "@/components/ui/form"

export function CustomerList({
    customers,
    onCustomerClick,
    onAddCustomer,
    onCall,
    onEmail,
    onBulkAction,
}: CustomerListProps) {
    const { language, t } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "activated" | "invited" | "inactive">("all")
    const [sortBy, setSortBy] = useState<"name" | "policyCount" | "lastInteractionDate">("name")
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const filteredCustomers = useMemo(() => {
        let filtered = customers
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = customers.filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.surname.toLowerCase().includes(query) ||
                    c.email.toLowerCase().includes(query) ||
                    c.phone?.toLowerCase().includes(query),
            )
        }
        if (statusFilter !== "all") {
            filtered = filtered.filter((c) => c.activationStatus === statusFilter)
        }

        filtered = [...filtered].sort((a, b) => {
            // 'el' collation, matching the shared table sort — the default puts
            // Greek names after z, so a Greek client list would order wrongly.
            if (sortBy === "name") return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, "el", { sensitivity: "base" })
            if (sortBy === "policyCount") return b.policyCount - a.policyCount
            if (!a.lastInteractionDate) return 1
            if (!b.lastInteractionDate) return -1
            return new Date(b.lastInteractionDate).getTime() - new Date(a.lastInteractionDate).getTime()
        })
        return filtered
    }, [customers, searchQuery, statusFilter, sortBy])

    const statusCounts = useMemo(
        () => ({
            all: customers.length,
            activated: customers.filter((c) => c.activationStatus === "activated").length,
            invited: customers.filter((c) => c.activationStatus === "invited").length,
            inactive: customers.filter((c) => c.activationStatus === "inactive").length,
        }),
        [customers],
    )

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredCustomers.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(filteredCustomers.map((c) => c.id)))
    }

    const formatLastContact = (dateStr?: string) => {
        if (!dateStr) return roleCopy.customerList.never
        const date = new Date(dateStr)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return roleCopy.customerList.today
        if (diffDays === 1) return roleCopy.customerList.yesterday
        if (diffDays < 7) return roleCopy.customerList.daysAgo(diffDays)
        return date.toLocaleDateString(language === "el" ? "el-GR" : "en-GB")
    }

    const ACTION_LABELS: Record<string, string> = {
        resend_invite: roleCopy.customerList.actionResendInvite,
        add_first_policy: roleCopy.customerList.actionAddFirstPolicy,
        request_consent: roleCopy.customerList.actionRequestConsent,
        review_renewal: roleCopy.customerList.actionReviewRenewal,
        discuss_gaps: roleCopy.customerList.actionDiscussGaps,
        check_in: roleCopy.customerList.actionCheckIn,
        all_good: roleCopy.customerList.actionAllGood,
    }
    const ACTION_TONES: Record<string, string> = {
        resend_invite: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        add_first_policy: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        request_consent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        review_renewal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        discuss_gaps: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        check_in: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
        all_good: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    }
    const CONSENT_LABELS: Record<string, string> = {
        granted: roleCopy.customerList.consentGranted,
        attested: roleCopy.customerList.consentAttested,
        none: roleCopy.customerList.consentNone,
    }
    const consentStatusOf = (raw: string | null | undefined): ConsentStatus =>
        raw === 'granted' || raw === 'attested' ? raw : 'none'

    const healthTone = (score: number | null | undefined) => {
        if (score === null || score === undefined) return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-500"
        if (score >= 70) return "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
        if (score >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    }

    const formatRenewal = (iso: string | null | undefined) => {
        if (!iso) return "—"
        return new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")
    }

    const renewalSoon = (iso: string | null | undefined) => {
        if (!iso) return false
        return new Date(iso).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="search"
                        placeholder={roleCopy.customerList.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pw-input pw-input-sm pl-10 pr-4"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex bg-neutral-100/80 dark:bg-neutral-800/80 p-1 rounded-xl gap-0.5">
                        {(["all", "activated", "invited", "inactive"] as const).map((status) => {
                            const isActive = statusFilter === status
                            const label = status === "all" ? roleCopy.customerList.all : roleCopy.customerList[status]
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-2.5 py-1.5 rounded-lg text-micro font-semibold transition-all cursor-pointer ${isActive ? "bg-white dark:bg-neutral-700 shadow-sm text-foreground" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
                                >
                                    {label} ({statusCounts[status]})
                                </button>
                            )
                        })}
                    </div>

                    <div className="hidden xl:flex bg-neutral-100/80 dark:bg-neutral-800/80 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("table")}
                            aria-label={t.a11yLabels.tableView}
                            aria-pressed={viewMode === "table"}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-white dark:bg-neutral-700 shadow-sm text-foreground" : "text-neutral-500"}`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            aria-label={t.a11yLabels.gridView}
                            aria-pressed={viewMode === "grid"}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-neutral-700 shadow-sm text-foreground" : "text-neutral-500"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-primary text-white dark:text-[#1A2420] text-xs font-bold px-2.5 py-1 rounded-full">{selectedIds.size}</span>
                        <span className="text-sm text-primary dark:text-mint font-medium">
                            {selectedIds.size === 1 ? roleCopy.customerList.selectedOne : roleCopy.customerList.selectedMany}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => onBulkAction?.("email", Array.from(selectedIds))} className="p-2 text-primary dark:text-mint hover:bg-primary/10 dark:hover:bg-primary/25 rounded-xl transition-colors cursor-pointer" title={roleCopy.customerList.sendEmail}>
                            <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={() => onBulkAction?.("export", Array.from(selectedIds))} className="p-2 text-primary dark:text-mint hover:bg-primary/10 dark:hover:bg-primary/25 rounded-xl transition-colors cursor-pointer" title={roleCopy.customerList.export}>
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {customers.length === 0 ? (
                <EmptyState
                    icon={UserPlus}
                    headline={roleCopy.customerList.zeroHeadline}
                    description={roleCopy.customerList.zeroBenefit}
                    cta={onAddCustomer ? { label: roleCopy.customerList.zeroCta, onClick: onAddCustomer } : undefined}
                    previewLabel={roleCopy.customerList.zeroPreviewLabel}
                    preview={
                        <>
                            <CustomerPreviewRow
                                name={roleCopy.customerList.zeroExampleName1}
                                meta={roleCopy.customerList.zeroExampleMeta1}
                                initial={roleCopy.customerList.zeroExampleName1.charAt(0)}
                            />
                            <CustomerPreviewRow
                                name={roleCopy.customerList.zeroExampleName2}
                                meta={roleCopy.customerList.zeroExampleMeta2}
                                initial={roleCopy.customerList.zeroExampleName2.charAt(0)}
                                healthy={false}
                            />
                        </>
                    }
                    trust={roleCopy.customerList.zeroTrust}
                />
            ) : filteredCustomers.length === 0 && statusFilter === "invited" && !searchQuery.trim() ? (
                <EmptyState
                    icon={Mail}
                    headline={roleCopy.customerList.invitedEmptyTitle}
                    description={roleCopy.customerList.invitedEmptySubtitle}
                    cta={onAddCustomer ? { label: roleCopy.customerList.invitedEmptyCta, onClick: onAddCustomer } : undefined}
                />
            ) : filteredCustomers.length === 0 ? (
                <EmptyState
                    icon={Search}
                    headline={roleCopy.customerList.emptyTitle}
                    description={roleCopy.customerList.emptySubtitle}
                    cta={{
                        label: t.emptyStates.clearFilters,
                        onClick: () => {
                            setSearchQuery("")
                            setStatusFilter("all")
                        },
                    }}
                />
            ) : (
                /* Presentation is CSS-first, like the wallet: the dense table is
                   desktop-only and the existing card grid IS the mobile view, so an
                   agent on a phone gets cards instead of a horizontally-scrolling
                   table. `viewMode` only decides what DESKTOP shows. */
                <>
                {viewMode === "table" && (
                <div className="hidden xl:block bg-white/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
                    <TableShell label={t.nav.customers}>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50/80 dark:bg-neutral-950/50 text-micro font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 border-b border-neutral-200/60 dark:border-neutral-800/60">
                                <tr>
                                    <th className="px-4 py-3.5 w-10">
                                        <RowCheckbox label={t.common.all} checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} onChange={toggleAll} />
                                    </th>
                                    <th aria-sort={sortBy === "name" ? "ascending" : "none"} className="px-4 py-3.5">
                                        <button type="button" onClick={() => setSortBy("name")} className="inline-flex items-center gap-1 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:text-neutral-300">
                                            {roleCopy.customerList.tableClient}
                                            {sortBy === "name" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th aria-sort={sortBy === "policyCount" ? "descending" : "none"} className="px-4 py-3.5 text-center">
                                        <button type="button" onClick={() => setSortBy("policyCount")} className="inline-flex items-center gap-1 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:text-neutral-300">
                                            {roleCopy.customerList.tablePolicies}
                                            {sortBy === "policyCount" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3.5 text-center">{roleCopy.customerList.tableHealth}</th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableNextRenewal}</th>
                                    <th className="px-4 py-3.5 text-center">{roleCopy.customerList.tableGaps}</th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableConsent}</th>
                                    <th aria-sort={sortBy === "lastInteractionDate" ? "descending" : "none"} className="px-4 py-3.5 text-right">
                                        <button type="button" onClick={() => setSortBy("lastInteractionDate")} className="inline-flex items-center gap-1 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:text-neutral-300">
                                            {roleCopy.customerList.tableLastActivity}
                                            {sortBy === "lastInteractionDate" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableAction}</th>
                                    <th className="px-4 py-3.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                {filteredCustomers.map((customer) => {
                                    const intel = customer.intelligence
                                    return (
                                    <tr key={customer.id} onClick={() => onCustomerClick(customer.id)} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all cursor-pointer">
                                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                            <RowCheckbox label={`${customer.name} ${customer.surname}`} checked={selectedIds.has(customer.id)} onChange={() => toggleSelection(customer.id)} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-foreground text-body-sm">{customer.name} {customer.surname}</span>
                                                <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-kicker font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-800 dark:text-neutral-600">
                                                    {roleCopy.customerList[customer.activationStatus]}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 truncate max-w-[200px] text-micro text-neutral-500 dark:text-neutral-500">{customer.email}</div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">{customer.policyCount}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold ${healthTone(intel?.healthScore)}`}>
                                                {intel?.healthScore !== null && intel?.healthScore !== undefined ? intel.healthScore : "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-caption">
                                            <span className={renewalSoon(intel?.nextRenewalDate) ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                                                {formatRenewal(intel?.nextRenewalDate)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {intel && intel.gapCount > 0 ? (
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold ${intel.criticalGapCount > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                                    <Sparkles className="w-3 h-3" />
                                                    {intel.gapCount}
                                                </span>
                                            ) : (
                                                <span className="text-caption text-neutral-300 dark:text-neutral-600">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <ConsentStatusBadge
                                                status={consentStatusOf(intel?.consentStatus)}
                                                label={CONSENT_LABELS[consentStatusOf(intel?.consentStatus)]}
                                            />
                                        </td>
                                        <td className="px-4 py-3.5 text-right text-caption text-neutral-500 whitespace-nowrap">{formatLastContact(customer.lastInteractionDate)}</td>
                                        <td className="px-4 py-3.5">
                                            {intel && (
                                                <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-kicker font-semibold ${ACTION_TONES[intel.recommendedAction]}`}>
                                                    {ACTION_LABELS[intel.recommendedAction]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {customer.phone && <button aria-label={t.a11yLabels.callClient} onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 hover:text-primary dark:hover:text-mint transition-colors cursor-pointer"><Phone className="w-3.5 h-3.5" /></button>}
                                                <button aria-label={t.a11yLabels.emailClient} onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 hover:text-primary dark:hover:text-mint transition-colors cursor-pointer"><Mail className="w-3.5 h-3.5" /></button>
                                                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </TableShell>
                </div>
                )}

                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${viewMode === "table" ? "xl:hidden" : ""}`}>
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} onClick={() => onCustomerClick(customer.id)} className="group relative bg-white/80 dark:bg-neutral-900/80 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 transition-all duration-300 cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-foreground text-body">{customer.name} {customer.surname}</h3>
                                    <span className="inline-flex items-center gap-1 text-kicker px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-muted text-neutral-600 dark:text-neutral-300">
                                        {roleCopy.customerList[customer.activationStatus]}
                                    </span>
                                </div>
                                <RowCheckbox label={`${customer.name} ${customer.surname}`} checked={selectedIds.has(customer.id)} onChange={(e) => { e.stopPropagation(); toggleSelection(customer.id) }} />
                            </div>
                            <div className="flex justify-between items-center text-caption text-muted-foreground mb-4">
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{customer.policyCount} {roleCopy.customerList.policies}</span>
                                <span>{formatLastContact(customer.lastInteractionDate)}</span>
                            </div>
                            {customer.intelligence && (
                                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-kicker font-bold ${healthTone(customer.intelligence.healthScore)}`}>
                                        {roleCopy.customerList.tableHealth}: {customer.intelligence.healthScore ?? "—"}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-kicker font-semibold ${ACTION_TONES[customer.intelligence.recommendedAction]}`}>
                                        {ACTION_LABELS[customer.intelligence.recommendedAction]}
                                    </span>
                                </div>
                            )}
                            {customer.openGapsCount > 0 && (
                                <div className="flex items-center gap-1.5 text-micro text-amber-700 dark:text-amber-400 font-semibold mb-3 bg-amber-50/80 dark:bg-amber-900/15 px-2.5 py-1.5 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                                    <Sparkles className="w-3 h-3" />
                                    <span>{customer.openGapsCount} {customer.openGapsCount === 1 ? roleCopy.customerList.openOpportunityOne : roleCopy.customerList.openOpportunityMany}</span>
                                </div>
                            )}
                            <div className="flex gap-2 pt-3 border-t border-neutral-100/80 dark:border-neutral-800/60">
                                <button className="flex-1 py-2 text-xs font-semibold bg-neutral-50/80 hover:bg-muted/80 dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center gap-1">
                                    {roleCopy.customerList.profile}
                                    <ChevronRight className="w-3 h-3 opacity-50" />
                                </button>
                                {customer.phone && <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-2 text-neutral-500 hover:text-primary dark:hover:text-mint hover:bg-primary-soft dark:hover:bg-primary/15 rounded-xl transition-colors cursor-pointer"><Phone className="w-4 h-4" /></button>}
                                <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-2 text-neutral-500 hover:text-primary dark:hover:text-mint hover:bg-primary-soft dark:hover:bg-primary/15 rounded-xl transition-colors cursor-pointer"><Mail className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
    )
}

