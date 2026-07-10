"use client"

import { useState } from "react"
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
    DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import type { RenewalView } from "./actions"
import { updateRenewalOutcome, getAgentRenewals, sendBatchRenewalReminder } from "./actions"

const copy = {
    en: {
        title: "Renewals",
        subtitle: "Track and manage upcoming policy renewals across your portfolio.",
        kicker: "PIPELINE",
        pending: "Pending",
        overdue: "Overdue",
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
        selected: "selected",
        notes: "Notes (optional)",
        save: "Save",
        cancel: "Cancel",
    },
    el: {
        title: "Ανανεώσεις",
        subtitle: "Παρακολούθηση και διαχείριση ανανεώσεων ασφαλιστηρίων.",
        kicker: "PIPELINE",
        pending: "Εκκρεμεί",
        overdue: "Ληξιπρόθεσμο",
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
        selected: "επιλεγμένα",
        notes: "Σημειώσεις (προαιρετικά)",
        save: "Αποθήκευση",
        cancel: "Ακύρωση",
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

export function RenewalsClient({ initialRenewals, stats }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const router = useRouter()

    const [renewals, setRenewals] = useState(initialRenewals)
    const [statusFilter, setStatusFilter] = useState("all")
    const [timeframe, setTimeframe] = useState<"7" | "15" | "30" | "60" | "90" | "all">("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [outcomeModal, setOutcomeModal] = useState<{ renewalId: string; customerName: string } | null>(null)
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
            toast.success(language === "el" ? "Αποτέλεσμα καταγράφηκε" : "Outcome recorded")
            setOutcomeModal(null)
            setOutcomeNotes("")
            router.refresh()
            // Refresh list
            const updated = await getAgentRenewals({ status: statusFilter === "all" ? undefined : statusFilter, timeframe })
            setRenewals(updated)
        } else {
            toast.error(result.error || "Failed")
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
            toast.error(result.error || "Failed")
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

    const getStatusBadge = (status: string, daysLeft: number) => {
        if (status === "completed") return (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#166534] bg-primary-soft dark:text-mint dark:bg-primary/15 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {t.completed}
            </span>
        )
        if (status === "overdue" || status === "lapsed") return (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 px-2.5 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> {status === "overdue" ? t.overdue : t.lapsed}
            </span>
        )
        if (daysLeft <= 7) return (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {daysLeft}d
            </span>
        )
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> {daysLeft}d
            </span>
        )
    }

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Header */}
                <div className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">{t.kicker}</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                        {t.title}
                    </h1>
                    <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
                        {t.subtitle}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <StatCard icon={CalendarClock} label={t.expiringThisWeek} value={stats.expiringThisWeek} accent="amber" />
                    <StatCard icon={Clock} label={t.expiringThisMonth} value={stats.expiringThisMonth} accent="blue" />
                    <StatCard icon={ShieldAlert} label={t.overdue} value={stats.overdue} accent="rose" />
                    <StatCard icon={CheckCircle2} label={t.completedThisMonth} value={stats.completedThisMonth} accent="emerald" />
                    <StatCard icon={DollarSign} label={t.premiumAtRisk} value={`€${stats.premiumAtRisk.toLocaleString()}`} accent="orange" />
                    <StatCard icon={TrendingUp} label={t.totalTracked} value={stats.total} accent="slate" />
                </div>

                {/* Filters + Batch Actions */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.filterBy}:</span>
                    </div>
                    {["all", "pending", "overdue", "completed", "lapsed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => handleFilterChange(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                statusFilter === s
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                        >
                            {s === "all" ? t.all : s === "pending" ? t.pending : s === "overdue" ? t.overdue : s === "completed" ? t.completed : t.lapsed}
                        </button>
                    ))}

                    <div className="ml-auto flex items-center gap-2">
                        <select
                            value={timeframe}
                            onChange={(e) => handleFilterChange(statusFilter, e.target.value as typeof timeframe)}
                            className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300"
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
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white dark:text-[#1A2420] text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {t.sendBatchReminder} ({selectedIds.size})
                            </button>
                        )}
                    </div>
                </div>

                {/* Timeline Table */}
                {renewals.length === 0 ? (
                    <div className="arc-card p-12 text-center">
                        <CalendarClock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">{t.noRenewals}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t.noRenewalsDesc}</p>
                    </div>
                ) : (
                    <div className="arc-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size > 0 && selectedIds.size === renewals.filter(r => r.status === "pending" || r.status === "overdue").length}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customer}</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.insurer}</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.lob}</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.premium}</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.expires}</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.status}</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.actions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renewals.map((r) => {
                                        const isActionable = r.status === "pending" || r.status === "overdue"
                                        return (
                                            <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    {isActionable && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(r.id)}
                                                            onChange={() => toggleSelect(r.id)}
                                                            className="rounded border-slate-300 dark:border-slate-600"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-900 dark:text-white">{r.customerName}</span>
                                                    <br />
                                                    <span className="text-xs text-slate-400">{r.policyNumber}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.insurerName}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded">
                                                        {r.lineOfBusiness}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                                    {r.premiumAmount ? `€${r.premiumAmount.toLocaleString()}` : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                                    {formatDate(r.policyEndDate)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {getStatusBadge(r.status, r.daysBeforeExpiry)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
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
                                                        <span className="text-xs text-slate-400">
                                                            {r.outcome.replace(/_/g, " ")}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Outcome Modal */}
                {outcomeModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {t.markOutcome}
                            </h3>
                            <p className="text-sm text-slate-500">{outcomeModal.customerName}</p>

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
                                                : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.notes}</label>
                                <textarea
                                    value={outcomeNotes}
                                    onChange={(e) => setOutcomeNotes(e.target.value)}
                                    rows={2}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setOutcomeModal(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={handleOutcomeSave}
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover transition-colors disabled:opacity-50"
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
        amber: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
        blue: "text-primary bg-primary-tint dark:text-mint dark:bg-primary/15",
        rose: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20",
        emerald: "text-primary bg-primary-soft dark:text-mint dark:bg-primary/15",
        orange: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20",
        slate: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800",
    }

    return (
        <div className="arc-card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accentMap[accent] ?? accentMap.slate}`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    )
}
