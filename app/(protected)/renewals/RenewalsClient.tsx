"use client"

import { useId, useMemo, useRef, useState } from "react"
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
import { StatTile } from "@/components/ui/StatTile"
import { CardHead } from "@/components/dashboard/home/CardHead"
import type { RenewalView } from "./actions"
import { updateRenewalOutcome, getAgentRenewals, sendBatchRenewalReminder } from "./actions"
import { useDialog } from "@/hooks/useDialog"
import { TableShell } from "@/components/ui/TableShell"
import { RowCheckbox } from "@/components/ui/form"

import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
import { displayInsurerName } from '@/lib/wallet/policy-identity'
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
            insurer: (r) => displayInsurerName(r.insurerName),
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

    /**
     * Sequence number for the in-flight filter fetch. Switching filters quickly
     * fired overlapping requests and whichever RESOLVED last won — so a slow
     * response for an abandoned filter could overwrite the list the user is
     * actually looking at. Only the newest request may commit its result.
     */
    const filterRequestRef = useRef(0)
    const [isFiltering, setIsFiltering] = useState(false)

    const handleFilterChange = async (newStatus: string, newTimeframe?: typeof timeframe) => {
        const s = newStatus
        const tf = newTimeframe ?? timeframe
        setStatusFilter(s)
        if (newTimeframe) setTimeframe(tf)

        const requestId = ++filterRequestRef.current
        setIsFiltering(true)
        try {
            const result = await getAgentRenewals({
                status: s === "all" ? undefined : s,
                timeframe: tf,
            })
            if (requestId !== filterRequestRef.current) return // superseded
            setRenewals(result)
        } catch (error) {
            if (requestId !== filterRequestRef.current) return
            console.error("[RenewalsClient] filter fetch failed", error)
            toast.error(t.actionFailed)
        } finally {
            if (requestId === filterRequestRef.current) setIsFiltering(false)
        }
    }

    const handleOutcomeSave = async () => {
        if (!outcomeModal) return
        setIsSaving(true)
        try {
            const result = await updateRenewalOutcome(outcomeModal.renewalId, {
                outcome: outcomeChoice,
                notes: outcomeNotes || undefined,
            })

            if (!result.success) {
                toast.error(result.error || t.actionFailed)
                return
            }

            toast.success(t.outcomeRecorded)
            setOutcomeModal(null)
            setOutcomeNotes("")
            router.refresh()

            // Best-effort list refresh: the outcome is already saved, so a
            // failure here must not report the save itself as failed.
            try {
                const updated = await getAgentRenewals({
                    status: statusFilter === "all" ? undefined : statusFilter,
                    timeframe,
                })
                setRenewals(updated)
            } catch {
                // router.refresh() above will reconcile the list.
            }
        } catch {
            // A transport failure used to skip setIsSaving(false) entirely,
            // pinning the modal on "Saving…" with the outcome unrecorded.
            toast.error(t.actionFailed)
        } finally {
            setIsSaving(false)
        }
    }

    const handleBatchReminder = async () => {
        if (selectedIds.size === 0) return
        setIsSending(true)
        try {
            const result = await sendBatchRenewalReminder(Array.from(selectedIds))

            if (!result.success) {
                toast.error(result.error || t.actionFailed)
                return
            }

            toast.success(
                language === "el"
                    ? `${result.sent} υπενθυμίσεις στάλθηκαν`
                    : `${result.sent} reminders sent`
            )
            // Only clear the selection once the send is confirmed — clearing it
            // on a failure would leave the advisor unable to retry without
            // re-selecting every renewal.
            setSelectedIds(new Set())
        } catch {
            toast.error(t.actionFailed)
        } finally {
            setIsSending(false)
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

    // Status pills on the status TOKENS, the state as a word: no palette
    // literals, no CSS uppercase (Greek capitals drop the tonos).
    const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold"
    const getStatusBadge = (status: string, daysLeft: number) => {
        if (status === "completed") return (
            <span className={`${pill} bg-status-success-tint text-status-success`}>
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {t.completed}
            </span>
        )
        if (status === "overdue" || status === "lapsed") return (
            <span className={`${pill} bg-status-danger-tint text-status-danger`}>
                <XCircle className="h-3 w-3" aria-hidden="true" /> {status === "overdue" ? t.overdue : t.lapsed}
            </span>
        )
        if (daysLeft <= 7) return (
            <span className={`${pill} bg-status-warning-tint text-status-warning`}>
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {daysLeftLabel(daysLeft, dayLabels)}
            </span>
        )
        return (
            <span className={`${pill} bg-muted text-muted-foreground`}>
                <Clock className="h-3 w-3" aria-hidden="true" /> {daysLeftLabel(daysLeft, dayLabels)}
            </span>
        )
    }

    // Pinned to Athens via the shared helper: a bare toLocaleDateString resolves
    // against the runtime zone, so this rendered UTC on the server and Athens in
    // the browser for the same policy.
    const formatDate = (iso: string) =>
        formatDateShared(iso, language === "el" ? "el" : "en", { day: "2-digit", month: "short", year: "numeric" })

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is. The «PIPELINE» eyebrow is gone:
                    the heading carries its own weight. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                </div>

                {/* Six fact tiles on the shared StatTile — the accent tints the
                    glyph only; the number stays in the text colour. */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <StatTile icon={CalendarClock} label={t.expiringThisWeek} value={stats.expiringThisWeek} accent="warning" />
                    <StatTile icon={Clock} label={t.expiringThisMonth} value={stats.expiringThisMonth} accent="brand" />
                    <StatTile icon={ShieldAlert} label={t.overdue} value={stats.overdue} accent="critical" />
                    <StatTile icon={CheckCircle2} label={t.completedThisMonth} value={stats.completedThisMonth} accent="positive" />
                    <StatTile icon={Euro} label={t.premiumAtRisk} value={formatCurrencyFull(stats.premiumAtRisk, language === "el" ? "el" : "en")} accent="warning" />
                    <StatTile icon={TrendingUp} label={t.totalTracked} value={stats.total} />
                </div>

                {/* Filters — the status switch on the segmented recipe, the
                    timeframe as a select, the batch action when rows are ticked. */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="pw-segmented pw-scroll-strip min-w-0" role="group" aria-label={t.filterBy}>
                        {["all", "pending", "overdue", "completed", "lapsed"].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleFilterChange(s)}
                                disabled={isFiltering}
                                aria-busy={isFiltering}
                                aria-pressed={statusFilter === s}
                                className="pw-segment disabled:cursor-progress"
                            >
                                {s === "all" ? t.all : s === "pending" ? t.pending : s === "overdue" ? t.overdue : s === "completed" ? t.completed : t.lapsed}
                            </button>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <select
                            aria-label={gt.a11yLabels.timeframeFilter}
                            value={timeframe}
                            onChange={(e) => handleFilterChange(statusFilter, e.target.value as typeof timeframe)}
                            disabled={isFiltering}
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
                        <div className="pw-pad pb-0">
                            <CardHead
                                icon={CalendarClock}
                                title={t.title}
                                meta={<span className="tabular-nums">{renewals.length}</span>}
                            />
                            {/* thead is sr-only below lg, so the column headers cannot be used
                                on a phone — this drives the same sort state. */}
                            <MobileSortControl
                                sort={sort}
                                onSort={toggle}
                                onClear={() => setSort(null)}
                                columns={[{ key: "customer", label: t.customer }, { key: "insurer", label: t.insurer }, { key: "lob", label: t.lob }, { key: "premium", label: t.premium }, { key: "expires", label: t.expires }]}
                                label={t.sortLabel}
                                defaultLabel={t.defaultOrder}
                                className="mt-3"
                            />
                        </div>
                        <TableShell label={t.title}>
                            <table className="pw-stacked-table w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
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
                                        <th className="px-4 py-3 text-center text-caption font-semibold text-muted-foreground">{t.status}</th>
                                        <th className="px-4 py-3 text-right text-caption font-semibold text-muted-foreground">{t.actions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renewals.map((r) => {
                                        const isActionable = r.status === "pending" || r.status === "overdue"
                                        return (
                                            <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">
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
                                                    <span className="font-semibold text-foreground">{r.customerName}</span>
                                                    <br />
                                                    <span className="text-caption text-muted-foreground">{r.policyNumber}</span>
                                                </td>
                                                <td data-label={t.insurer} className="px-4 py-3 text-foreground">{displayInsurerName(r.insurerName)}</td>
                                                <td data-label={t.lob} className="px-4 py-3">
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-medium text-foreground">
                                                        {normalizeBranch(r.lineOfBusiness).label[language]}
                                                    </span>
                                                </td>
                                                <td data-label={t.premium} className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                                    {r.premiumAmount ? formatCurrencyFull(r.premiumAmount, language === "el" ? "el" : "en") : "—"}
                                                </td>
                                                <td data-label={t.expires} className="px-4 py-3 text-center text-muted-foreground">
                                                    {formatDate(r.policyEndDate)}
                                                </td>
                                                <td data-label={t.status} className="px-4 py-3 text-center">
                                                    {getStatusBadge(r.status, r.daysBeforeExpiry)}
                                                    {/* MEDIC renewal-actionable gate (§H): ready = real-date
                                                        window + active customer-accepted relationship; a
                                                        missing connection is the one hole worth flagging.
                                                        Suppressed rows (completed/renewed) show nothing. */}
                                                    {r.readiness.ready && (
                                                        <span className="mt-1 block text-caption font-semibold text-primary dark:text-mint">
                                                            {t.readyToContact}
                                                        </span>
                                                    )}
                                                    {!r.readiness.ready && r.readiness.missing.includes('consent_to_contact') && (
                                                        <span className="mt-1 block text-caption text-muted-foreground">
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
                                                            className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary transition-colors hover:underline dark:text-mint"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                            {t.markOutcome}
                                                        </button>
                                                    )}
                                                    {r.outcome && (
                                                        <span className="text-caption text-muted-foreground">
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
                        <div ref={renewDialogRef} role="dialog" aria-modal="true" aria-labelledby={renewTitleId} tabIndex={-1} className="pw-card w-full max-w-md space-y-5 p-6 shadow-xl">
                            <h3 id={renewTitleId} className="text-title font-semibold text-foreground">
                                {t.markOutcome}
                            </h3>
                            <p className="text-sm text-muted-foreground">{outcomeModal.customerName}</p>

                            <div className="space-y-2">
                                {([
                                    ["renewed_same_insurer", t.renewedSame],
                                    ["renewed_different_insurer", t.renewedDifferent],
                                    ["lapsed", t.lapsed],
                                    ["cancelled", t.cancelled],
                                ] as [OutcomeType, string][]).map(([value, label]) => (
                                    <label
                                        key={value}
                                        className={`pw-subcard flex min-h-11 cursor-pointer items-center gap-3 p-3 transition-colors ${
                                            outcomeChoice === value ? "ring-2 ring-primary" : "hover:bg-muted"
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
                                        <span className="text-sm font-semibold text-foreground">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                {/* Was a sibling <label> with no htmlFor, so the
                                    textarea had no accessible name — on the field
                                    that records WHY a renewal lapsed. */}
                                <label htmlFor="renewal-outcome-notes" className="text-caption font-medium text-muted-foreground">{t.notes}</label>
                                <textarea
                                    id="renewal-outcome-notes"
                                    value={outcomeNotes}
                                    onChange={(e) => setOutcomeNotes(e.target.value)}
                                    rows={2}
                                    className="pw-input mt-1 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setOutcomeModal(null)}
                                    className="pw-soft-button flex-1"
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
