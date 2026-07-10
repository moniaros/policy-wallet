"use client"

import React, { useMemo, useState } from "react"
import { Search, Phone, Mail, User, LayoutList, LayoutGrid, Download, UserPlus, Sparkles, FileText, ChevronRight } from "lucide-react"

import { Customer, CustomerListProps } from "./types"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { EmptyState, CustomerPreviewRow } from "@/components/ui/EmptyState"

export function CustomerList({
    customers,
    onCustomerClick,
    onAddCustomer,
    onCall,
    onEmail,
    onBulkAction,
}: CustomerListProps) {
    const { language } = useLanguage()
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
            if (sortBy === "name") return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
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
        return date.toLocaleDateString(language === "el" ? "el-GR" : "en-US")
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
        check_in: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        all_good: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    }
    const CONSENT_LABELS: Record<string, string> = {
        granted: roleCopy.customerList.consentGranted,
        attested: roleCopy.customerList.consentAttested,
        none: roleCopy.customerList.consentNone,
    }
    const CONSENT_TONES: Record<string, string> = {
        granted: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
        attested: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        none: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    }

    const healthTone = (score: number | null | undefined) => {
        if (score === null || score === undefined) return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        if (score >= 70) return "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
        if (score >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    }

    const formatRenewal = (iso: string | null | undefined) => {
        if (!iso) return "—"
        return new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-US")
    }

    const renewalSoon = (iso: string | null | undefined) => {
        if (!iso) return false
        return new Date(iso).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder={roleCopy.customerList.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl gap-0.5">
                        {(["all", "activated", "invited", "inactive"] as const).map((status) => {
                            const isActive = statusFilter === status
                            const label = status === "all" ? roleCopy.customerList.all : roleCopy.customerList[status]
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${isActive ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                >
                                    {label} ({statusCounts[status]})
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400"}`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400"}`}
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
                <div className="text-center py-16 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="mx-auto w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                        <User className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{roleCopy.customerList.emptyTitle}</h3>
                    <p className="text-slate-500 text-sm mb-4">{roleCopy.customerList.emptySubtitle}</p>
                </div>
            ) : viewMode === "table" ? (
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-slate-800/60">
                                <tr>
                                    <th className="px-4 py-3.5 w-10">
                                        <input type="checkbox" checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} onChange={toggleAll} className="rounded border-slate-300 text-primary focus:ring-primary" />
                                    </th>
                                    <th className="px-4 py-3.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy("name")}>{roleCopy.customerList.tableClient}</th>
                                    <th className="px-4 py-3.5 text-center cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy("policyCount")}>{roleCopy.customerList.tablePolicies}</th>
                                    <th className="px-4 py-3.5 text-center">{roleCopy.customerList.tableHealth}</th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableNextRenewal}</th>
                                    <th className="px-4 py-3.5 text-center">{roleCopy.customerList.tableGaps}</th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableConsent}</th>
                                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy("lastInteractionDate")}>{roleCopy.customerList.tableLastActivity}</th>
                                    <th className="px-4 py-3.5">{roleCopy.customerList.tableAction}</th>
                                    <th className="px-4 py-3.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
                                {filteredCustomers.map((customer) => {
                                    const intel = customer.intelligence
                                    return (
                                    <tr key={customer.id} onClick={() => onCustomerClick(customer.id)} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all cursor-pointer">
                                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedIds.has(customer.id)} onChange={() => toggleSelection(customer.id)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-slate-900 dark:text-white text-[13px]">{customer.name} {customer.surname}</span>
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                    {roleCopy.customerList[customer.activationStatus]}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 truncate max-w-[200px] text-[11px] text-slate-400 dark:text-slate-500">{customer.email}</div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">{customer.policyCount}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${healthTone(intel?.healthScore)}`}>
                                                {intel?.healthScore !== null && intel?.healthScore !== undefined ? intel.healthScore : "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[12px]">
                                            <span className={renewalSoon(intel?.nextRenewalDate) ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}>
                                                {formatRenewal(intel?.nextRenewalDate)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {intel && intel.gapCount > 0 ? (
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${intel.criticalGapCount > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                                    <Sparkles className="w-3 h-3" />
                                                    {intel.gapCount}
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-slate-300 dark:text-slate-600">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CONSENT_TONES[intel?.consentStatus || "none"]}`}>
                                                {CONSENT_LABELS[intel?.consentStatus || "none"]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right text-[12px] text-slate-400 whitespace-nowrap">{formatLastContact(customer.lastInteractionDate)}</td>
                                        <td className="px-4 py-3.5">
                                            {intel && (
                                                <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_TONES[intel.recommendedAction]}`}>
                                                    {ACTION_LABELS[intel.recommendedAction]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {customer.phone && <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary dark:hover:text-mint transition-colors cursor-pointer"><Phone className="w-3.5 h-3.5" /></button>}
                                                <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary dark:hover:text-mint transition-colors cursor-pointer"><Mail className="w-3.5 h-3.5" /></button>
                                                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} onClick={() => onCustomerClick(customer.id)} className="group relative bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">{customer.name} {customer.surname}</h3>
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {roleCopy.customerList[customer.activationStatus]}
                                    </span>
                                </div>
                                <input type="checkbox" checked={selectedIds.has(customer.id)} onChange={(e) => { e.stopPropagation(); toggleSelection(customer.id) }} className="rounded border-slate-300 text-primary focus:ring-primary" />
                            </div>
                            <div className="flex justify-between items-center text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{customer.policyCount} {roleCopy.customerList.policies}</span>
                                <span>{formatLastContact(customer.lastInteractionDate)}</span>
                            </div>
                            {customer.intelligence && (
                                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${healthTone(customer.intelligence.healthScore)}`}>
                                        {roleCopy.customerList.tableHealth}: {customer.intelligence.healthScore ?? "—"}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_TONES[customer.intelligence.recommendedAction]}`}>
                                        {ACTION_LABELS[customer.intelligence.recommendedAction]}
                                    </span>
                                </div>
                            )}
                            {customer.openGapsCount > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold mb-3 bg-amber-50/80 dark:bg-amber-900/15 px-2.5 py-1.5 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                                    <Sparkles className="w-3 h-3" />
                                    <span>{customer.openGapsCount} {customer.openGapsCount === 1 ? roleCopy.customerList.openOpportunityOne : roleCopy.customerList.openOpportunityMany}</span>
                                </div>
                            )}
                            <div className="flex gap-2 pt-3 border-t border-slate-100/80 dark:border-slate-800/60">
                                <button className="flex-1 py-2 text-xs font-semibold bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1">
                                    {roleCopy.customerList.profile}
                                    <ChevronRight className="w-3 h-3 opacity-50" />
                                </button>
                                {customer.phone && <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-2 text-slate-400 hover:text-primary dark:hover:text-mint hover:bg-primary-soft dark:hover:bg-primary/15 rounded-xl transition-colors cursor-pointer"><Phone className="w-4 h-4" /></button>}
                                <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-2 text-slate-400 hover:text-primary dark:hover:text-mint hover:bg-primary-soft dark:hover:bg-primary/15 rounded-xl transition-colors cursor-pointer"><Mail className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

