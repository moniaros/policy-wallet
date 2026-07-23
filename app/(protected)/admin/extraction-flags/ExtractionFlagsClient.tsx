"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Flag, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { resolveExtractionFlag, type ExtractionFlagQueueItem } from "../actions"
import { formatDateTime } from "@/lib/i18n/format"

interface ExtractionFlagsClientProps {
    items: ExtractionFlagQueueItem[]
    summary: { open: number; selfHealed: number; total: number }
}

const MSG_HANDLED = "Flag marked as handled"
const MSG_FAILED = "Action failed"

function formatDate(value: string | null) {
    if (!value) return "-"
    return formatDateTime(value, 'en')
}

function reviewStatePill(state: string | null, handled: boolean) {
    if (handled) {
        return { label: "Handled", classes: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint" }
    }
    if (state === "confirmed") {
        return { label: "User confirmed", classes: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint" }
    }
    if (state === "unconfirmed") {
        return { label: "Re-analyzed", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" }
    }
    if (state === "flagged") {
        return { label: "Still flagged", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" }
    }
    return { label: "No state", classes: "bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300" }
}

export default function ExtractionFlagsClient({ items, summary }: ExtractionFlagsClientProps) {
    const router = useRouter()
    const [busyId, setBusyId] = useState<string | null>(null)

    const handleResolve = async (eventId: string) => {
        setBusyId(eventId)
        try {
            const result = await resolveExtractionFlag(eventId)
            if ("error" in result) {
                toast.error(result.error || MSG_FAILED)
                return
            }
            toast.success(MSG_HANDLED)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : MSG_FAILED)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                    <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-black dark:text-white">Extraction Flags</h1>
                    <p className="text-sm text-black/55 dark:text-white/60">
                        User reports of incorrect AI extraction, from the upload review screen.
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="pw-card rounded-2xl p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-black/50 dark:text-white/55">Open</p>
                    <p className="mt-1 text-3xl font-black text-black dark:text-white">{summary.open}</p>
                </div>
                <div className="pw-card rounded-2xl p-4">
                    <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-black/50 dark:text-white/55">
                        <Sparkles className="h-3 w-3" />
                        Self-healed (re-analyzed or confirmed)
                    </p>
                    <p className="mt-1 text-3xl font-black text-black dark:text-white">{summary.selfHealed}</p>
                </div>
                <div className="pw-card rounded-2xl p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-black/50 dark:text-white/55">Total reports</p>
                    <p className="mt-1 text-3xl font-black text-black dark:text-white">{summary.total}</p>
                </div>
            </div>

            {/* Table */}
            {items.length === 0 ? (
                <div className="pw-card rounded-2xl p-12 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary dark:text-mint" />
                    <p className="text-sm font-semibold text-black/70 dark:text-white/75">
                        No extraction flags reported.
                    </p>
                </div>
            ) : (
                <div className="pw-card overflow-hidden rounded-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-black/10 text-micro font-bold uppercase tracking-wider text-black/45 dark:border-white/10 dark:text-white/50">
                                <tr>
                                    <th className="px-4 py-3">Flagged</th>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Policy</th>
                                    <th className="px-4 py-3">Report</th>
                                    <th className="px-4 py-3 text-center">Confidence</th>
                                    <th className="px-4 py-3">State</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/10">
                                {items.map((item) => {
                                    const pill = reviewStatePill(item.currentReviewState, item.handled)
                                    return (
                                        <tr key={item.id} className={item.handled ? "opacity-55" : undefined}>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-black/60 dark:text-white/65">
                                                {formatDate(item.flaggedAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-body-sm font-semibold text-black dark:text-white">
                                                    {item.userName || "-"}
                                                </p>
                                                <p className="text-xs text-black/50 dark:text-white/55">{item.userEmail}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-body-sm font-semibold text-black dark:text-white">
                                                    {item.insurerName || "-"}
                                                </p>
                                                <p className="text-xs text-black/50 dark:text-white/55">
                                                    {[item.policyNumber, item.lineOfBusiness].filter(Boolean).join(" · ") || item.policyId || "-"}
                                                </p>
                                            </td>
                                            <td className="max-w-[280px] px-4 py-3 text-xs leading-relaxed text-black/70 dark:text-white/75">
                                                {item.reason}
                                                {item.provider && (
                                                    <span className="mt-0.5 block text-kicker uppercase tracking-wider text-black/40 dark:text-white/45">
                                                        via {item.provider}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-black/70 dark:text-white/75">
                                                {item.currentConfidence !== null ? `${Math.round(item.currentConfidence)}%` : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${pill.classes}`}>
                                                    {pill.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!item.handled && (
                                                    <button
                                                        type="button"
                                                        disabled={busyId === item.id}
                                                        onClick={() => handleResolve(item.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-micro font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 dark:text-[#1A2420]"
                                                    >
                                                        {busyId === item.id ? (
                                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-3 w-3" />
                                                        )}
                                                        Mark handled
                                                    </button>
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
        </div>
    )
}
