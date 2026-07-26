"use client"

import { useId, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    CalendarClock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    Send,
    ChevronDown,
    RefreshCw,
    TrendingUp,
    ShieldAlert,
    Euro,
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { formatCurrencyFull } from "@/lib/agent/format"
import { formatDate as formatDateShared } from "@/lib/i18n/format"
import { daysLeftLabel } from "@/lib/wallet/days-left-label"
import { EmptyState, RenewalPreviewRow } from "@/components/ui/EmptyState"
import type { RenewalView } from "./actions"
import { updateRenewalOutcome, getAgentRenewals, sendBatchRenewalReminder } from "./actions"
import { useDialog } from "@/hooks/useDialog"
import { TableShell } from "@/components/ui/TableShell"
import { RowCheckbox } from "@/components/ui/form"

import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
const copy = {
    en: {
        title: "Renewals",
        sortLabel: "Sort",
        defaultOrder: "Default order",
        subtitle: "Track and manage upcoming policy renewals across your portfolio.",
        kicker: "PIPELINE",
        pending: "Pending",
        readyToContact: "Ready to contact",
        noActiveConnection: "No active connection",
        overdue: "Overdue",
        expiresToday: "Today",
        expiresTomorrow: "Tomorrow",
        daysLeftSuffix: "d",
        completed: "Completed",
        lapsed: "Lapsed",
        all: "All",
        expiringThisWeek: "Expiring this week",
        expiringThisMonth: "Expiring this month",
        completedThisMonth: "Renewed this month",
        lapsedThisMonth: "Lapsed this month",
        premiumAtRisk: "Premium at risk",
        totalTracked: "Total tracked",
        filterBy: "Filter",
        timeframe: "Timeframe",
        days: "days",
        customer: "Customer",
        policy: "Policy",
        insurer: "Insurer",
        lob: "Line",
        premium: "Premium",
        expires: "Expires",
        daysLeft: "Days left",
        status: "Status",
        actions: "Actions",
        markOutcome: "Record Outcome",
        renewedSame: "Renewed (same insurer)",
        renewedDifferent: "Renewed (different)",
        cancelled: "Cancelled",
        sendReminder: "Send Reminder",
        sendBatchReminder: "Send Reminders",
        noRenewals: "No renewals to display",
        noRenewalsDesc: "Renewals will appear here as policies approach their expiry dates.",
        emptyHeadline: "No renewal alerts",
        emptyBenefit: "As client policies come in, expirations appear here 90 days ahead — never miss a renewal again.",
        emptyCta: "Add client policies",
        emptyPreviewLabel: "Example",
        emptyExampleName: "Maria K. — Motor",
        emptyExampleMeta: "Interamerican · €312/yr",
        emptyExampleDays: "in 45 days",
        selected: "selected",
        notes: "Notes (optional)",
        save: "Save",
        cancel: "Cancel",
        outcomeRecorded: "Outcome recorded",
        actionFailed: "Failed",
    },
    el: {
        title: "Ανανεώσεις",
        sortLabel: "Ταξινόμηση",
        defaultOrder: "Προεπιλεγμένη σειρά",
        subtitle: "Παρακολούθηση και διαχείριση ανανεώσεων ασφαλιστηρίων.",
        kicker: "PIPELINE",
        pending: "Εκκρεμεί",
        readyToContact: "Έτοιμο για επικοινωνία",
        noActiveConnection: "Χωρίς ενεργή σύνδεση",
        overdue: "Ληξιπρόθεσμο",
        expiresToday: "Σήμερα",
        expiresTomorrow: "Αύριο",
        daysLeftSuffix: " ημ.",
        completed: "Ολοκληρώθηκε",
        lapsed: "Εκπνοή",
        all: "Όλα",
        expiringThisWeek: "Λήγουν αυτή την εβδομάδα",
        expiringThisMonth: "Λήγουν αυτόν τον μήνα",
        completedThisMonth: "Ανανεώθηκαν",
        lapsedThisMonth: "Εκπνοή μήνα",
        premiumAtRisk: "Ασφάλιστρα σε κίνδυνο",
        totalTracked: "Σύνολο",
        filterBy: "Φίλτρο",
        timeframe: "Χρονικό πλαίσιο",
        days: "ημέρες",
        customer: "Πελάτης",
        policy: "Ασφαλιστήριο",
        insurer: "Ασφαλιστής",
        lob: "Κλάδος",
        premium: "Ασφάλιστρο",
        expires: "Λήξη",
        daysLeft: "Ημέρες",
        status: "Κατάσταση",
        actions: "Ενέργειες",
        markOutcome: "Καταγραφή Αποτελέσματος",
        renewedSame: "Ανανέωση (ίδιος ασφαλιστής)",
        renewedDifferent: "Ανανέωση (διαφορετικός)",
        cancelled: "Ακύρωση",
        sendReminder: "Αποστολή Υπενθύμισης",
        sendBatchReminder: "Αποστολή Υπενθυμίσεων",
        noRenewals: "Δεν υπάρχουν ανανεώσεις",
        noRenewalsDesc: "Οι ανανεώσεις θα εμφανιστούν εδώ καθώς πλησιάζουν οι ημερομηνίες λήξης.",
        emptyHeadline: "Κανένας συναγερμός ανανέωσης",
        emptyBenefit: "Μόλις προστεθούν ασφαλιστήρια πελατών, οι λήξεις εμφανίζονται εδώ 90 ημέρες πριν — ποτέ ξανά χαμένη ανανέωση.",
        emptyCta: "Προσθήκη ασφαλιστηρίων πελατών",
        emptyPreviewLabel: "Παράδειγμα",
        emptyExampleName: "Μαρία Κ. — Αυτοκίνητο",
        emptyExampleMeta: "Interamerican · €312/έτος",
        emptyExampleDays: "σε 45 ημέρες",
        selected: "επιλεγμένα",
        notes: "Σημειώσεις (προαιρετικά)",
        save: "Αποθήκευση",
        cancel: "Ακύρωση",
        outcomeRecorded: "Αποτέλεσμα καταγράφηκε",
        actionFailed: "Αποτυχία",
    },
}

interface Props {
    initialRenewals: RenewalView[]
    stats: {
        total: number
        pending: number
        overdue: number
        completedThisMonth: number
        lapsedThisMonth: number
        expiringThisWeek: number
        expiringThisMonth: number
        premiumAtRisk: number
    }
}

type OutcomeType = "renewed_same_insurer" | "renewed_different_insurer" | "lapsed" | "cancelled"

type RenewalSortKey = "customer" | "insurer" | "lob" | "premium" | "expires"

export function RenewalsClient({ initialRenewals, stats }: Props) {
    const { language, t: gt } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const router = useRouter()

    const [renewalRows, setRenewals] = useState(initialRenewals)
    const [statusFilter, setStatusFilter] = useState("all")
    const [timeframe, setTimeframe] = useState<"7" | "15" | "30" | "60" | "90" | "all">("all")
    // The server order (expiry ascending) is the meaningful default, so the
    // third toggle state returns to it rather than cycling asc/desc forever.
    const { sort, toggle, setSort } = useTableSort<RenewalSortKey>()
    const renewals = useMemo(
        () => applySort<RenewalView, RenewalSortKey>(renewalRows, sort, {
            customer: (r) => r.customerName,
            insurer: (r) => r.insurerName,
            lob: (r) => r.lineOfBusiness,
            premium: (r) => r.premiumAmount,
            expires: (r) => (r.policyEndDate ? new Date(r.policyEndDate) : null),
        }),
        [renewalRows, sort]
    )

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [outcomeModal, setOutcomeModal] = useState<{ renewalId: string; customerName: string } | null>(null)
    // The outcome modal was a bare overlay: no trap, no Escape, no dialog role.
    const renewDialogRef = useDialog<HTMLDivElement>(() => setOutcomeModal(null), Boolean(outcomeModal))
    const renewTitleId = useId()
    const [outcomeChoice, setOutcomeChoice] = useState<OutcomeType>("renewed_same_insurer")
    const [outcomeNotes, setOutcomeNotes] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const handleFilterChange = async (newStatus: string, newTimeframe?: typeof timeframe) => {
        const s = newStatus
        const tf = newTimeframe ?? timeframe
        setStatusFilter(s)
        if (newTimeframe) setTimeframe(tf)

        const result = await getAgentRenewals({
            status: s === "all" ? undefined : s,
            timeframe: tf,
        })
        setRenewals(result)
    }

    const handleOutcomeSave = async () => {
        if (!outcomeModal) return
        setIsSaving(true)
        const result = await updateRenewalOutcome(outcomeModal.renewalId, {
            outcome: outcomeChoice,
            notes: outcomeNotes || undefined,
        })
        setIsSaving(false)

        if (result.success) {
            toast.success(t.outcomeRecorded)
            setOutcomeModal(null)
            setOutcomeNotes("")
            router.refresh()
            // Refresh list
            const updated = await getAgentRenewals({ status: statusFilter === "all" ? undefined : statusFilter, timeframe })
            setRenewals(updated)
        } else {
            toast.error(result.error || t.actionFailed)
        }
    }

    const handleBatchReminder = async () => {
        if (selectedIds.size === 0) return
        setIsSending(true)
        const result = await sendBatchRenewalReminder(Array.from(selectedIds))
        setIsSending(false)

        if (result.success) {
            toast.success(
                language === "el"
                    ? `${result.sent} υπενθυμίσεις στάλθηκαν`
                    : `${result.sent} reminders sent`
            )
            setSelectedIds(new Set())
        } else {
            toast.error(result.error || t.actionFailed)
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        const pendingIds = renewals.filter(r => r.status === "pending" || r.status === "overdue").map(r => r.id)
        if (selectedIds.size === pendingIds.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(pendingIds))
        }
    }

    // «5d» was hardcoded English on a Greek-default UI — and the countdown reached
    // 0 and 1, where a bare number is the wrong thing to read on the last day of
    // cover. (lint:i18n-changed only inspects CHANGED files, so a literal that
    // has always been here was never put in front of it.)
    const dayLabels = { today: t.expiresToday, tomorrow: t.expiresTomorrow, suffix: t.daysLeftSuffix }

    const getStatusBadge = (status: string, daysLeft: number) => {
        if (status === "completed") return (
            <span className="inline-flex items-center gap-1 text-kicker font-black uppercase tracking-widest text-[#166534] bg-primary-soft dark:text-mint dark:bg-primary/15 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {t.completed}
            </span>
        )
        if (status === "overdue" || status === "lapsed") return (
            <span className="inline-flex items-center gap-1 text-kicker font-black uppercase tracking-widest text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 px-2.5 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> {status === "overdue" ? t.overdue : t.lapsed}
            </span>
        )
        if (daysLeft <= 7) return (
            <span className="inline-flex items-center gap-1 text-kicker font-black uppercase tracking-widest text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {daysLeftLabel(daysLeft, dayLabels)}
            </span>
        )
        return (
            <span className="inline-flex items-center gap-1 text-kicker font-black uppercase tracking-widest text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> {daysLeftLabel(daysLeft, dayLabels)}
            </span>
        )
    }

    // Pinned to Athens via the shared helper: a bare toLocaleDateString resolves
    // against the runtime zone, so this rendered UTC on the server and Athens in
    // the browser for the same policy.
    const formatDate = (iso: string) =>
        formatDateShared(iso, language === "el" ? "el" : "en", { day: "2-digit", month: "short", year: "numeric" })

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-page-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Header */}
                <div className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">{t.kicker}</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                        {t.title}
                    </h1>
                    <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        {t.subtitle}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <StatCard icon={CalendarClock} label={t.expiringThisWeek} value={stats.expiringThisWeek} accent="amber" />
                    <StatCard icon={Clock} label={t.expiringThisMonth} value={stats.expiringThisMonth} accent="blue" />
                    <StatCard icon={ShieldAlert} label={t.overdue} value={stats.overdue} accent="rose" />
                    <StatCard icon={CheckCircle2} label={t.completedThisMonth} value={stats.completedThisMonth} accent="emerald" />
                    <StatCard icon={Euro} label={t.premiumAtRisk} value={formatCurrencyFull(stats.premiumAtRisk, language === "el" ? "el" : "en")} accent="orange" />
                    <StatCard icon={TrendingUp} label={t.totalTracked} value={stats.total} accent="slate" />
                </div>

                {/* Filters + Batch Actions */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5">
                        <Filter className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{t.filterBy}:</span>
                    </div>
                    {["all", "pending", "overdue", "completed", "lapsed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => handleFilterChange(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                statusFilter === s
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                            }`}
                        >
                            {s === "all" ? t.all : s === "pending" ? t.pending : s === "overdue" ? t.overdue : s === "completed" ? t.completed : t.lapsed}
                        </button>
                    ))}

                    <div className="ml-auto flex items-center gap-2">
                        <select
                            aria-label={gt.a11yLabels.timeframeFilter}
                            value={timeframe}
                            onChange={(e) => handleFilterChange(statusFilter, e.target.value as typeof timeframe)}
                            className="pw-input pw-input-sm"
                        >
                            <option value="all">{t.all}</option>
                            <option value="7">7 {t.days}</option>
                            <option value="15">15 {t.days}</option>
                            <option value="30">30 {t.days}</option>
                            <option value="60">60 {t.days}</option>
                            <option value="90">90 {t.days}</option>
                        </select>

                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBatchReminder}
                                disabled={isSending}
                                className="pw-primary-button"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {t.sendBatchReminder} ({selectedIds.size})
                            </button>
                        )}
                    </div>
                </div>

                {/* Timeline Table */}
                {renewals.length === 0 ? (
                    stats.total === 0 ? (
                        <EmptyState
                            icon={CalendarClock}
                            headline={t.emptyHeadline}
                            description={t.emptyBenefit}
                            cta={{ label: t.emptyCta, href: "/customers" }}
                            previewLabel={t.emptyPreviewLabel}
                            preview={
                                <RenewalPreviewRow
                                    name={t.emptyExampleName}
                                    meta={t.emptyExampleMeta}
                                    daysLabel={t.emptyExampleDays}
                                />
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={Filter}
                            headline={t.noRenewals}
                            description={t.noRenewalsDesc}
                            cta={{
                                label: gt.emptyStates.clearFilters,
                                onClick: () => handleFilterChange("all", "all"),
                            }}
                        />
                    )
                ) : (
                    <div className="pw-card overflow-hidden">
                        {/* thead is sr-only below lg, so the column headers cannot be used
                            on a phone — this drives the same sort state. */}
                        <MobileSortControl
                            sort={sort}
                            onSort={toggle}
                            onClear={() => setSort(null)}
                            columns={[{ key: "customer", label: t.customer }, { key: "insurer", label: t.insurer }, { key: "lob", label: t.lob }, { key: "premium", label: t.premium }, { key: "expires", label: t.expires }]}
                            label={t.sortLabel}
                            defaultLabel={t.defaultOrder}
                            className="mb-3"
                        />
                        <TableShell label={t.title}>
                            <table className="pw-stacked-table w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <th className="px-4 py-3 text-left">
                                            <RowCheckbox
                                                label={t.all}
                                                checked={selectedIds.size > 0 && selectedIds.size === renewals.filter(r => r.status === "pending" || r.status === "overdue").length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={t.customer} align="left" />
                                        <SortableColumn columnKey="insurer" sort={sort} onSort={toggle} label={t.insurer} align="left" />
                                        <SortableColumn columnKey="lob" sort={sort} onSort={toggle} label={t.lob} align="left" />
                                        <SortableColumn columnKey="premium" sort={sort} onSort={toggle} label={t.premium} align="right" />
                                        <SortableColumn columnKey="expires" sort={sort} onSort={toggle} label={t.expires} align="center" />
                                        <th className="px-4 py-3 text-center text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{t.status}</th>
                                        <th className="px-4 py-3 text-right text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{t.actions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renewals.map((r) => {
                                        const isActionable = r.status === "pending" || r.status === "overdue"
                                        return (
                                            <tr key={r.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    {isActionable && (
                                                        <RowCheckbox
                                                            label={r.customerName}
                                                            checked={selectedIds.has(r.id)}
                                                            onChange={() => toggleSelect(r.id)}
                                                        />
                                                    )}
                                                </td>
                                                <td data-label={t.customer} className="px-4 py-3">
                                                    <span className="font-bold text-foreground">{r.customerName}</span>
                                                    <br />
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{r.policyNumber}</span>
                                                </td>
                                                <td data-label={t.insurer} className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{r.insurerName}</td>
                                                <td data-label={t.lob} className="px-4 py-3">
                                                    <span className="text-xs font-bold text-neutral-500 bg-muted dark:text-neutral-400 px-2 py-0.5 rounded">
                                                        {normalizeBranch(r.lineOfBusiness).label[language]}
                                                    </span>
                                                </td>
                                                <td data-label={t.premium} className="px-4 py-3 text-right font-bold text-foreground">
                                                    {r.premiumAmount ? formatCurrencyFull(r.premiumAmount, language === "el" ? "el" : "en") : "—"}
                                                </td>
                                                <td data-label={t.expires} className="px-4 py-3 text-center text-neutral-600 dark:text-neutral-400">
                                                    {formatDate(r.policyEndDate)}
                                                </td>
                                                <td data-label={t.status} className="px-4 py-3 text-center">
                                                    {getStatusBadge(r.status, r.daysBeforeExpiry)}
                                                    {/* MEDIC renewal-actionable gate (§H): ready = real-date
                                                        window + active customer-accepted relationship; a
                                                        missing connection is the one hole worth flagging.
                                                        Suppressed rows (completed/renewed) show nothing. */}
                                                    {r.readiness.ready && (
                                                        <span className="mt-1 block text-kicker font-bold uppercase tracking-wider text-primary dark:text-mint">
                                                            {t.readyToContact}
                                                        </span>
                                                    )}
                                                    {!r.readiness.ready && r.readiness.missing.includes('consent_to_contact') && (
                                                        <span className="mt-1 block text-kicker font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                                            {t.noActiveConnection}
                                                        </span>
                                                    )}
                                                </td>
                                                <td data-label={t.actions} className="px-4 py-3 text-right">
                                                    {isActionable && (
                                                        <button
                                                            onClick={() => {
                                                                setOutcomeModal({ renewalId: r.id, customerName: r.customerName })
                                                                setOutcomeChoice("renewed_same_insurer")
                                                                setOutcomeNotes("")
                                                            }}
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-primary dark:text-mint hover:text-primary-hover dark:hover:text-mint transition-colors"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                            {t.markOutcome}
                                                        </button>
                                                    )}
                                                    {r.outcome && (
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {r.outcome.replace(/_/g, " ")}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </TableShell>
                    </div>
                )}

                {/* Outcome Modal */}
                {outcomeModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div ref={renewDialogRef} role="dialog" aria-modal="true" aria-labelledby={renewTitleId} tabIndex={-1} className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
                            <h3 id={renewTitleId} className="text-lg font-black text-foreground">
                                {t.markOutcome}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{outcomeModal.customerName}</p>

                            <div className="space-y-2">
                                {([
                                    ["renewed_same_insurer", t.renewedSame],
                                    ["renewed_different_insurer", t.renewedDifferent],
                                    ["lapsed", t.lapsed],
                                    ["cancelled", t.cancelled],
                                ] as [OutcomeType, string][]).map(([value, label]) => (
                                    <label
                                        key={value}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                            outcomeChoice === value
                                                ? "bg-primary-tint dark:bg-primary/15 ring-2 ring-primary"
                                                : "bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="outcome"
                                            value={value}
                                            checked={outcomeChoice === value}
                                            onChange={() => setOutcomeChoice(value)}
                                            className="accent-primary"
                                        />
                                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                <label className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{t.notes}</label>
                                <textarea
                                    value={outcomeNotes}
                                    onChange={(e) => setOutcomeNotes(e.target.value)}
                                    rows={2}
                                    className="pw-input mt-1 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setOutcomeModal(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-muted text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={handleOutcomeSave}
                                    disabled={isSaving}
                                    className="pw-primary-button flex-1"
                                >
                                    {isSaving ? "..." : t.save}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    accent: string
}) {
    const accentMap: Record<string, string> = {
        amber: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
        blue: "text-primary bg-primary-tint dark:text-mint dark:bg-primary/15",
        rose: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20",
        emerald: "text-primary bg-primary-soft dark:text-mint dark:bg-primary/15",
        orange: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20",
        slate: "text-neutral-600 bg-neutral-50 dark:text-neutral-400 dark:bg-neutral-800",
    }

    return (
        <div className="pw-card pw-pad-tight">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accentMap[accent] ?? accentMap.slate}`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-foreground">{value}</p>
            <p className="text-kicker font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    )
}
