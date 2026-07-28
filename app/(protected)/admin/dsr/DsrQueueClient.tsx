"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, Download, Trash2, CheckCircle2, XCircle, Clock3 } from "lucide-react"
import { toast } from "sonner"
import { getDsrDeadlineInfo } from "@/lib/compliance/dsr-deadline"
import {
    approveDeletionRequest,
    executeDataExportRequestAsAdmin,
    executeDeletionRequest,
    markDeletionRequestInReview,
    rejectDeletionRequest,
} from "../actions"

interface DataExportQueueItem {
    id: string
    userId: string
    userName: string | null
    userEmail: string
    status: "requested" | "processing" | "completed" | "failed" | "expired"
    requestSource: string
    requestedAt: string
    startedAt: string | null
    completedAt: string | null
    expiresAt: string | null
    errorMessage: string | null
}

interface DeletionQueueItem {
    id: string
    userId: string | null
    userName: string | null
    userEmail: string
    userRoles: string
    status: "requested" | "in_review" | "approved" | "processing" | "completed" | "rejected" | "failed"
    legalBasis: string | null
    retentionNotes: string | null
    operatorNotes: string | null
    requestedAt: string
    reviewedAt: string | null
    completedAt: string | null
    errorMessage: string | null
}

interface QueueSummary {
    pendingDataExports: number
    openDeletionRequests: number
    approvedDeletionRequests: number
    totalOpen: number
}

interface DsrQueueClientProps {
    dataExports: DataExportQueueItem[]
    deletionRequests: DeletionQueueItem[]
    summary: QueueSummary
}

// Fixed locale + timeZone so the SSR pass (UTC) and the client hydration pass
// (the admin's local zone) render byte-identical strings. Bare toLocale*()
// without these produced a hydration mismatch on /admin/dsr (POLICYWALLET-8).
const DSR_TZ = "Europe/Athens"
const DSR_LOCALE = "el-GR"

function formatDate(value: string | null) {
    if (!value) {
        return "-"
    }

    return new Date(value).toLocaleString(DSR_LOCALE, { timeZone: DSR_TZ })
}

function getStatusClasses(status: string) {
    switch (status) {
        case "completed":
        case "approved":
            return "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
        case "processing":
        case "in_review":
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        case "requested":
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        case "failed":
        case "rejected":
        case "expired":
            return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        default:
            return "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
    }
}

const OPEN_EXPORT_STATUSES = ["requested", "processing", "failed"]
const OPEN_DELETION_STATUSES_UI = ["requested", "in_review", "approved", "processing", "failed"]

/** GDPR Art. 12(3): one month to respond. Closed requests show a dash. */
function DeadlineCell({ requestedAt, open }: { requestedAt: string; open: boolean }) {
    if (!open) {
        return <span className="text-xs text-stone-500 dark:text-stone-400">-</span>
    }

    const { dueAt, daysLeft, overdue, urgent } = getDsrDeadlineInfo(requestedAt)
    const tone = overdue
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        : urgent
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
    const label = overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`

    return (
        <div>
            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${tone}`}>{label}</span>
            <div className="mt-1 text-kicker text-stone-500 dark:text-stone-400">{dueAt.toLocaleDateString(DSR_LOCALE, { timeZone: DSR_TZ })}</div>
        </div>
    )
}

export default function DsrQueueClient({ dataExports, deletionRequests, summary }: DsrQueueClientProps) {
    const router = useRouter()
    const [busyAction, setBusyAction] = useState<string | null>(null)

    const runAction = async (
        actionKey: string,
        action: () => Promise<{ success: boolean; error?: string }>,
        successMessage: string
    ) => {
        setBusyAction(actionKey)

        try {
            const result = await action()
            if (!result?.success) {
                toast.error(result?.error || "Action failed") // i18n-hardcoded-ignore — admin console is English-only
                return
            }

            toast.success(successMessage)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Action failed")
        } finally {
            setBusyAction(null)
        }
    }

    const handleMoveToReview = async (requestId: string) => {
        const note = window.prompt("Optional review note") || undefined
        await runAction(
            `review-${requestId}`,
            () => markDeletionRequestInReview(requestId, note),
            "Deletion request moved to in-review"
        )
    }

    const handleApprove = async (requestId: string) => {
        const note = window.prompt("Optional approval note") || undefined
        await runAction(
            `approve-${requestId}`,
            () => approveDeletionRequest(requestId, note),
            "Deletion request approved"
        )
    }

    const handleReject = async (requestId: string) => {
        const reason = window.prompt("Rejection reason")
        if (!reason || !reason.trim()) {
            toast.error("Rejection reason is required") // i18n-hardcoded-ignore — admin console is English-only
            return
        }

        await runAction(
            `reject-${requestId}`,
            () => rejectDeletionRequest(requestId, reason),
            "Deletion request rejected"
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">DSR Queue</h1>
                <p className="text-stone-600 dark:text-stone-400 mt-2">
                    Review and execute GDPR data export and deletion requests.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="text-sm text-stone-500 dark:text-stone-400">Pending Data Exports</div>
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{summary.pendingDataExports}</div>
                </div>
                <div className="p-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="text-sm text-stone-500 dark:text-stone-400">Open Deletion Requests</div>
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{summary.openDeletionRequests}</div>
                </div>
                <div className="p-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="text-sm text-stone-500 dark:text-stone-400">Approved for Execution</div>
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{summary.approvedDeletionRequests}</div>
                </div>
            </div>

            <section className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="p-6 border-b border-stone-200 dark:border-stone-700 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary dark:text-mint" />
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Data Export Requests</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Requested</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Due (Art. 12)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Completed</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {dataExports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                                        No data export requests found.
                                    </td>
                                </tr>
                            ) : (
                                dataExports.map((request) => {
                                    const canExecute = ["requested", "failed", "expired"].includes(request.status)
                                    const actionKey = `export-${request.id}`
                                    const isBusy = busyAction === actionKey

                                    return (
                                        <tr key={request.id}>
                                            <td className="px-4 py-4 text-sm text-stone-900 dark:text-stone-100">
                                                <div className="font-medium">{request.userName || "Unknown user"}</div>
                                                <div className="text-xs text-stone-500 dark:text-stone-400">{request.userEmail}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusClasses(request.status)}`}>
                                                    {request.status}
                                                </span>
                                                {request.errorMessage && (
                                                    <div className="mt-1 text-xs text-red-700 dark:text-red-300 dark:text-red-400">{request.errorMessage}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-stone-600 dark:text-stone-400">{formatDate(request.requestedAt)}</td>
                                            <td className="px-4 py-4">
                                                <DeadlineCell requestedAt={request.requestedAt} open={OPEN_EXPORT_STATUSES.includes(request.status)} />
                                            </td>
                                            <td className="px-4 py-4 text-xs text-stone-600 dark:text-stone-400">{formatDate(request.completedAt)}</td>
                                            <td className="px-4 py-4 text-right">
                                                {canExecute ? (
                                                    <button
                                                        onClick={() =>
                                                            runAction(
                                                                actionKey,
                                                                () => executeDataExportRequestAsAdmin(request.id),
                                                                "Data export completed"
                                                            )
                                                        }
                                                        disabled={isBusy}
                                                        className="px-3 py-1.5 text-xs rounded bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover disabled:opacity-60"
                                                    >
                                                        {isBusy ? "Running..." : "Execute"}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-stone-500 dark:text-stone-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="p-6 border-b border-stone-200 dark:border-stone-700 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Deletion Requests</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Legal Basis</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Requested</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Due (Art. 12)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {deletionRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                                        No deletion requests found.
                                    </td>
                                </tr>
                            ) : (
                                deletionRequests.map((request) => {
                                    const reviewKey = `review-${request.id}`
                                    const approveKey = `approve-${request.id}`
                                    const rejectKey = `reject-${request.id}`
                                    const executeKey = `execute-${request.id}`

                                    return (
                                        <tr key={request.id}>
                                            <td className="px-4 py-4 text-sm text-stone-900 dark:text-stone-100">
                                                <div className="font-medium">{request.userName || "Unknown user"}</div>
                                                <div className="text-xs text-stone-500 dark:text-stone-400">{request.userEmail}</div>
                                                <div className="text-xs text-stone-500 dark:text-stone-400">{request.userRoles}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusClasses(request.status)}`}>
                                                    {request.status}
                                                </span>
                                                {request.errorMessage && (
                                                    <div className="mt-1 text-xs text-red-700 dark:text-red-300 dark:text-red-400">{request.errorMessage}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-stone-600 dark:text-stone-400">
                                                {request.legalBasis || "-"}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-stone-600 dark:text-stone-400">
                                                {formatDate(request.requestedAt)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <DeadlineCell requestedAt={request.requestedAt} open={OPEN_DELETION_STATUSES_UI.includes(request.status)} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(request.status === "requested" || request.status === "failed") && (
                                                        <button
                                                            onClick={() => handleMoveToReview(request.id)}
                                                            disabled={busyAction === reviewKey}
                                                            className="px-3 py-1.5 text-xs rounded bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover disabled:opacity-60"
                                                        >
                                                            {busyAction === reviewKey ? "Working..." : "In Review"}
                                                        </button>
                                                    )}

                                                    {(request.status === "requested" || request.status === "in_review") && (
                                                        <button
                                                            onClick={() => handleApprove(request.id)}
                                                            disabled={busyAction === approveKey}
                                                            className="px-3 py-1.5 text-xs rounded bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover disabled:opacity-60"
                                                        >
                                                            {busyAction === approveKey ? "Working..." : "Approve"}
                                                        </button>
                                                    )}

                                                    {(request.status === "approved" || request.status === "failed" || request.status === "processing") && (
                                                        <button
                                                            onClick={() =>
                                                                runAction(
                                                                    executeKey,
                                                                    () => executeDeletionRequest(request.id),
                                                                    "Deletion request executed"
                                                                )
                                                            }
                                                            disabled={busyAction === executeKey}
                                                            className="px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                                                        >
                                                            {busyAction === executeKey ? "Running..." : "Execute"}
                                                        </button>
                                                    )}

                                                    {request.status !== "completed" && request.status !== "rejected" && (
                                                        <button
                                                            onClick={() => handleReject(request.id)}
                                                            disabled={busyAction === rejectKey}
                                                            className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                                                        >
                                                            {busyAction === rejectKey ? "Working..." : "Reject"}
                                                        </button>
                                                    )}

                                                    {(request.status === "completed" || request.status === "rejected") && (
                                                        <span className="text-xs text-stone-500 dark:text-stone-400 inline-flex items-center gap-1">
                                                            {request.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                            {request.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 text-xs text-stone-600 dark:text-stone-400 flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    Execution anonymizes the account and removes active access data while preserving required compliance audit records.
                </div>
            </section>
        </div>
    )
}
