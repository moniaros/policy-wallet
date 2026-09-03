"use client"

import React, { useMemo, useState } from "react"
import { Search, Phone, Mail, LayoutList, LayoutGrid, Download, UserPlus, Sparkles, FileText, ChevronRight, ArrowDownUp, Users } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"

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
    // Recommended-action pills on the status TOKENS: info = a step to take,
    // warning = something waiting, danger = a gap to discuss, success = all
    // good, muted = a routine check-in.
    const ACTION_TONES: Record<string, string> = {
        resend_invite: "bg-status-info-tint text-status-info",
        add_first_policy: "bg-status-info-tint text-status-info",
        request_consent: "bg-status-warning-tint text-status-warning",
        review_renewal: "bg-status-warning-tint text-status-warning",
        discuss_gaps: "bg-status-danger-tint text-status-danger",
        check_in: "bg-muted text-muted-foreground",
        all_good: "bg-status-success-tint text-status-success",
    }
    const CONSENT_LABELS: Record<string, string> = {
        granted: roleCopy.customerList.consentGranted,
        attested: roleCopy.customerList.consentAttested,
        none: roleCopy.customerList.consentNone,
    }
    const consentStatusOf = (raw: string | null | undefined): ConsentStatus =>
        raw === 'granted' || raw === 'attested' ? raw : 'none'

    const healthTone = (score: number | null | undefined) => {
        if (score === null || score === undefined) return "bg-muted text-muted-foreground"
        if (score >= 70) return "bg-status-success-tint text-status-success"
        if (score >= 40) return "bg-status-warning-tint text-status-warning"
        return "bg-status-danger-tint text-status-danger"
    }
    const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold"

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
            {/* Toolbar on the canvas — search, the status switch on the segmented
                recipe, and (from xl, where the table exists) the table/grid
                toggle. No card around it: a toolbar is not content. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full flex-1 sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        aria-label={roleCopy.customerList.searchPlaceholder}
                        placeholder={roleCopy.customerList.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pw-input pw-input-sm pl-10 pr-4"
                    />
                </div>

                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                    <div className="pw-segmented pw-scroll-strip min-w-0" role="group" aria-label={roleCopy.customerList.tableClient}>
                        {(["all", "activated", "invited", "inactive"] as const).map((status) => {
                            const label = status === "all" ? roleCopy.customerList.all : roleCopy.customerList[status]
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setStatusFilter(status)}
                                    aria-pressed={statusFilter === status}
                                    className="pw-segment"
                                >
                                    {label}
                                    <span className="tabular-nums font-medium">{statusCounts[status]}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* xl only — below that the cards ARE the presentation and a
                        toggle would be a no-op (customer-list-responsive). */}
                    <div className="pw-segmented hidden xl:flex">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            aria-label={t.a11yLabels.tableView}
                            aria-pressed={viewMode === "table"}
                            className="pw-segment grid h-10 w-10 place-items-center px-0"
                        >
                            <LayoutList className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            aria-label={t.a11yLabels.gridView}
                            aria-pressed={viewMode === "grid"}
                            className="pw-segment grid h-10 w-10 place-items-center px-0"
                        >
                            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="pw-subcard flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3">
                        <span className="rounded-full bg-primary px-2.5 py-1 text-caption font-semibold tabular-nums text-primary-foreground">{selectedIds.size}</span>
                        <span className="text-sm font-medium text-foreground">
                            {selectedIds.size === 1 ? roleCopy.customerList.selectedOne : roleCopy.customerList.selectedMany}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => onBulkAction?.("email", Array.from(selectedIds))} className="pw-soft-button h-11 w-11 px-0" aria-label={roleCopy.customerList.sendEmail} title={roleCopy.customerList.sendEmail}>
                            <Mail className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => onBulkAction?.("export", Array.from(selectedIds))} className="pw-soft-button h-11 w-11 px-0" aria-label={roleCopy.customerList.export} title={roleCopy.customerList.export}>
                            <Download className="h-4 w-4" aria-hidden="true" />
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
                <div className="hidden xl:block pw-card overflow-hidden">
                    <div className="pw-pad pb-0">
                        <CardHead
                            icon={Users}
                            title={t.nav.customers}
                            meta={<span className="tabular-nums">{filteredCustomers.length}</span>}
                        />
                    </div>
                    <TableShell label={t.nav.customers}>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border text-caption font-semibold text-muted-foreground">
                                <tr>
                                    <th className="w-10 px-4 py-3">
                                        <RowCheckbox label={t.common.all} checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} onChange={toggleAll} />
                                    </th>
                                    <th aria-sort={sortBy === "name" ? "ascending" : "none"} className="px-4 py-3">
                                        <button type="button" onClick={() => setSortBy("name")} className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                                            {roleCopy.customerList.tableClient}
                                            {sortBy === "name" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th aria-sort={sortBy === "policyCount" ? "descending" : "none"} className="px-4 py-3 text-center">
                                        <button type="button" onClick={() => setSortBy("policyCount")} className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                                            {roleCopy.customerList.tablePolicies}
                                            {sortBy === "policyCount" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center">{roleCopy.customerList.tableHealth}</th>
                                    <th className="px-4 py-3">{roleCopy.customerList.tableNextRenewal}</th>
                                    <th className="px-4 py-3 text-center">{roleCopy.customerList.tableGaps}</th>
                                    <th className="px-4 py-3">{roleCopy.customerList.tableConsent}</th>
                                    <th aria-sort={sortBy === "lastInteractionDate" ? "descending" : "none"} className="px-4 py-3 text-right">
                                        <button type="button" onClick={() => setSortBy("lastInteractionDate")} className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                                            {roleCopy.customerList.tableLastActivity}
                                            {sortBy === "lastInteractionDate" && <ArrowDownUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3">{roleCopy.customerList.tableAction}</th>
                                    <th className="w-10 px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredCustomers.map((customer) => {
                                    const intel = customer.intelligence
                                    return (
                                    <tr key={customer.id} onClick={() => onCustomerClick(customer.id)} className="group cursor-pointer transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <RowCheckbox label={`${customer.name} ${customer.surname}`} checked={selectedIds.has(customer.id)} onChange={() => toggleSelection(customer.id)} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground">{customer.name} {customer.surname}</span>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-caption font-medium text-foreground">
                                                    {roleCopy.customerList[customer.activationStatus]}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 max-w-[200px] truncate text-caption text-muted-foreground">{customer.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-caption font-semibold tabular-nums text-foreground">{customer.policyCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`${pill} tabular-nums ${healthTone(intel?.healthScore)}`}>
                                                {intel?.healthScore !== null && intel?.healthScore !== undefined ? intel.healthScore : "—"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-caption">
                                            <span className={renewalSoon(intel?.nextRenewalDate) ? "font-semibold text-status-warning" : "text-muted-foreground"}>
                                                {formatRenewal(intel?.nextRenewalDate)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {intel && intel.gapCount > 0 ? (
                                                <span className={`${pill} gap-1 tabular-nums ${intel.criticalGapCount > 0 ? "bg-status-danger-tint text-status-danger" : "bg-status-warning-tint text-status-warning"}`}>
                                                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                                                    {intel.gapCount}
                                                </span>
                                            ) : (
                                                <span className="text-caption tabular-nums text-muted-foreground">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ConsentStatusBadge
                                                status={consentStatusOf(intel?.consentStatus)}
                                                label={CONSENT_LABELS[consentStatusOf(intel?.consentStatus)]}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-caption text-muted-foreground">{formatLastContact(customer.lastInteractionDate)}</td>
                                        <td className="px-4 py-3">
                                            {intel && (
                                                <span className={`${pill} ${ACTION_TONES[intel.recommendedAction]}`}>
                                                    {ACTION_LABELS[intel.recommendedAction]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                {customer.phone && <button type="button" aria-label={t.a11yLabels.callClient} onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Phone className="h-4 w-4" aria-hidden="true" /></button>}
                                                <button type="button" aria-label={t.a11yLabels.emailClient} onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Mail className="h-4 w-4" aria-hidden="true" /></button>
                                                <ChevronRight className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
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

                {/* The card grid — the phone's presentation, and the desktop's
                    when the toggle says grid. One white card per customer: the
                    person as the card head, facts as caption rows, pills for
                    the two signals, soft pills for the actions. */}
                <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${viewMode === "table" ? "xl:hidden" : ""}`}>
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} onClick={() => onCustomerClick(customer.id)} className="pw-card pw-pad group relative cursor-pointer">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground">{customer.name} {customer.surname}</h3>
                                    <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-caption font-medium text-foreground">
                                        {roleCopy.customerList[customer.activationStatus]}
                                    </span>
                                </div>
                                <RowCheckbox label={`${customer.name} ${customer.surname}`} checked={selectedIds.has(customer.id)} onChange={(e) => { e.stopPropagation(); toggleSelection(customer.id) }} />
                            </div>
                            <div className="mb-3 flex items-center justify-between text-caption text-muted-foreground">
                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" aria-hidden="true" />{customer.policyCount} {roleCopy.customerList.policies}</span>
                                <span>{formatLastContact(customer.lastInteractionDate)}</span>
                            </div>
                            {customer.intelligence && (
                                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                    <span className={`${pill} tabular-nums ${healthTone(customer.intelligence.healthScore)}`}>
                                        {roleCopy.customerList.tableHealth}: {customer.intelligence.healthScore ?? "—"}
                                    </span>
                                    <span className={`${pill} ${ACTION_TONES[customer.intelligence.recommendedAction]}`}>
                                        {ACTION_LABELS[customer.intelligence.recommendedAction]}
                                    </span>
                                </div>
                            )}
                            {customer.openGapsCount > 0 && (
                                <div className="pw-subcard mb-3 flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-semibold text-status-warning">
                                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                                    <span>{customer.openGapsCount} {customer.openGapsCount === 1 ? roleCopy.customerList.openOpportunityOne : roleCopy.customerList.openOpportunityMany}</span>
                                </div>
                            )}
                            <div className="flex gap-2 border-t border-border pt-3">
                                <button type="button" className="pw-soft-button flex-1">
                                    {roleCopy.customerList.profile}
                                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                {customer.phone && <button type="button" aria-label={t.a11yLabels.callClient} onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="pw-soft-button h-11 w-11 px-0"><Phone className="h-4 w-4" aria-hidden="true" /></button>}
                                <button type="button" aria-label={t.a11yLabels.emailClient} onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="pw-soft-button h-11 w-11 px-0"><Mail className="h-4 w-4" aria-hidden="true" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
    )
}
