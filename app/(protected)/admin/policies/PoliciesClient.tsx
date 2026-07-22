"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, RefreshCw, Pencil, Trash2, GitMerge } from "lucide-react"
import { requeuePolicy, deletePolicy, updatePolicyFields, mergePolicies, type AdminPolicyRow } from "../policy-actions"

const STATUS_OPTIONS = ["all", "analyzing", "active", "action_needed", "incomplete", "expiring_soon", "cancelled", "deleted"]
const inputClass = "w-full p-2 border rounded text-sm dark:bg-stone-700 dark:border-stone-600 dark:text-white"
const labelClass = "block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
const primaryBtn = "px-4 py-2 text-sm bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover disabled:opacity-50"
const iconBtn = "p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors disabled:opacity-50"

function fmt(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString() : "-"
}

export default function PoliciesClient({
    initialPolicies,
    initialStatus,
    initialSearch,
}: {
    initialPolicies: AdminPolicyRow[]
    initialStatus: string
    initialSearch: string
}) {
    const router = useRouter()
    const [search, setSearch] = useState(initialSearch)
    const [status, setStatus] = useState(initialStatus)
    const [busyId, setBusyId] = useState<string | null>(null)

    const [editRow, setEditRow] = useState<AdminPolicyRow | null>(null)
    const [edit, setEdit] = useState<Record<string, string>>({})
    const [deleteRow, setDeleteRow] = useState<AdminPolicyRow | null>(null)
    const [mergeSource, setMergeSource] = useState("")
    const [mergeTarget, setMergeTarget] = useState("")
    const [mergeConfirm, setMergeConfirm] = useState(false)
    const [modalBusy, setModalBusy] = useState(false)

    const applyFilters = (nextStatus: string, nextSearch: string) => {
        const params = new URLSearchParams()
        if (nextStatus && nextStatus !== "all") params.set("status", nextStatus)
        if (nextSearch) params.set("search", nextSearch)
        router.push(`/admin/policies?${params.toString()}`)
    }

    const onRequeue = async (row: AdminPolicyRow) => {
        setBusyId(row.id)
        const res = await requeuePolicy(row.id)
        setBusyId(null)
        if (res.ok) {
            toast.success(res.queued ? "Re-analysis queued." : "Run created (queue unavailable — will run inline).") // i18n-hardcoded-ignore
            router.refresh()
        } else {
            toast.error(res.error) // i18n-hardcoded-ignore
        }
    }

    const openEdit = (row: AdminPolicyRow) => {
        setEditRow(row)
        setEdit({
            insurerName: row.insurerName,
            policyNumber: row.policyNumber,
            lineOfBusiness: row.lineOfBusiness,
            status: row.status,
            premiumAmount: row.premiumAmount != null ? String(row.premiumAmount) : "",
            startDate: row.startDate ? row.startDate.slice(0, 10) : "",
            endDate: row.endDate ? row.endDate.slice(0, 10) : "",
        })
    }

    const saveEdit = async () => {
        if (!editRow) return
        setModalBusy(true)
        const res = await updatePolicyFields(editRow.id, {
            insurerName: edit.insurerName || undefined,
            policyNumber: edit.policyNumber || undefined,
            lineOfBusiness: edit.lineOfBusiness || undefined,
            status: edit.status || undefined,
            premiumAmount: edit.premiumAmount.trim() === "" ? undefined : Number(edit.premiumAmount),
            startDate: edit.startDate || undefined,
            endDate: edit.endDate || undefined,
        })
        setModalBusy(false)
        if (res.ok) {
            toast.success("Policy updated.") // i18n-hardcoded-ignore
            setEditRow(null)
            router.refresh()
        } else {
            toast.error(res.error) // i18n-hardcoded-ignore
        }
    }

    const confirmDelete = async () => {
        if (!deleteRow) return
        setModalBusy(true)
        const res = await deletePolicy(deleteRow.id)
        setModalBusy(false)
        if (res.ok) {
            toast.success("Policy deleted.") // i18n-hardcoded-ignore
            setDeleteRow(null)
            router.refresh()
        } else {
            toast.error(res.error) // i18n-hardcoded-ignore
        }
    }

    const confirmMerge = async () => {
        setModalBusy(true)
        const res = await mergePolicies({ sourceId: mergeSource.trim(), targetId: mergeTarget.trim() })
        setModalBusy(false)
        if (res.ok) {
            toast.success("Policies merged.") // i18n-hardcoded-ignore
            setMergeConfirm(false)
            setMergeSource("")
            setMergeTarget("")
            router.refresh()
        } else {
            toast.error(res.error) // i18n-hardcoded-ignore
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Policy Operations</h1>
                <p className="text-stone-600 dark:text-stone-400 mt-2">
                    Requeue stuck analyses, edit, delete, and merge duplicate policies.
                </p>
            </div>

            {/* Filters */}
            <form
                onSubmit={e => { e.preventDefault(); applyFilters(status, search) }}
                className="flex flex-wrap gap-3 items-end"
            >
                <div className="flex-1 min-w-[220px]">
                    <label className={labelClass}>Search (policy #, insurer, owner email)</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input className={`${inputClass} pl-9`} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Status</label>
                    <select
                        className={inputClass}
                        value={status}
                        onChange={e => { setStatus(e.target.value); applyFilters(e.target.value, search) }}
                    >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <button type="submit" className={primaryBtn}>Apply</button>
            </form>

            {/* Merge duplicates */}
            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 flex items-center gap-2">
                    <GitMerge className="w-4 h-4" /> Merge duplicates
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                    The source folds into the target and is then deleted. Both must belong to the same owner.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                        <label className={labelClass}>Source policy ID (deleted)</label>
                        <input className={inputClass} value={mergeSource} onChange={e => setMergeSource(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className={labelClass}>Target policy ID (survivor)</label>
                        <input className={inputClass} value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} />
                    </div>
                    <button
                        className={primaryBtn}
                        disabled={!mergeSource.trim() || !mergeTarget.trim()}
                        onClick={() => setMergeConfirm(true)}
                    >
                        Merge
                    </button>
                </div>
            </section>

            {/* Table */}
            <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
                            <th className="py-2 px-4">Policy #</th>
                            <th className="py-2 px-4">Insurer</th>
                            <th className="py-2 px-4">Line</th>
                            <th className="py-2 px-4">Owner</th>
                            <th className="py-2 px-4">Status</th>
                            <th className="py-2 px-4">Last Analyzed</th>
                            <th className="py-2 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialPolicies.length === 0 ? (
                            <tr><td className="py-6 px-4 text-stone-500 dark:text-stone-400" colSpan={7}>No policies match.</td></tr>
                        ) : (
                            initialPolicies.map(row => (
                                <tr key={row.id} className="border-b border-stone-100 dark:border-stone-700">
                                    <td className="py-2 px-4 text-stone-900 dark:text-stone-100">{row.policyNumber}</td>
                                    <td className="py-2 px-4 text-stone-900 dark:text-stone-100">{row.insurerName}</td>
                                    <td className="py-2 px-4 text-stone-900 dark:text-stone-100">{row.lineOfBusiness}</td>
                                    <td className="py-2 px-4 font-mono text-xs text-stone-600 dark:text-stone-400">{row.ownerEmail || row.ownerUserId}</td>
                                    <td className="py-2 px-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.status === "analyzing" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 text-stone-600 dark:text-stone-400">{fmt(row.lastAnalyzedAt)}</td>
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-1">
                                            <button className={iconBtn} title="Requeue analysis" disabled={busyId === row.id} onClick={() => onRequeue(row)}>
                                                <RefreshCw className={`w-4 h-4 ${busyId === row.id ? "animate-spin" : ""}`} />
                                            </button>
                                            <button className={iconBtn} title="Edit" onClick={() => openEdit(row)}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete" onClick={() => setDeleteRow(row)}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit modal */}
            {editRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Edit policy</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ["insurerName", "Insurer"],
                                ["policyNumber", "Policy #"],
                                ["lineOfBusiness", "Line of business"],
                                ["status", "Status"],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <label className={labelClass}>{label}</label>
                                    <input className={inputClass} value={edit[key] ?? ""} onChange={e => setEdit(s => ({ ...s, [key]: e.target.value }))} />
                                </div>
                            ))}
                            <div>
                                <label className={labelClass}>Premium (€)</label>
                                <input type="number" min="0" step="0.01" className={inputClass} value={edit.premiumAmount ?? ""} onChange={e => setEdit(s => ({ ...s, premiumAmount: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Start date</label>
                                <input type="date" className={inputClass} value={edit.startDate ?? ""} onChange={e => setEdit(s => ({ ...s, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>End date</label>
                                <input type="date" className={inputClass} value={edit.endDate ?? ""} onChange={e => setEdit(s => ({ ...s, endDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setEditRow(null)} disabled={modalBusy} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50">Cancel</button>
                            <button onClick={saveEdit} disabled={modalBusy} className={primaryBtn}>{modalBusy ? "Saving…" : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-3">Delete policy</h2>
                        <p className="text-stone-600 dark:text-stone-400 mb-6">
                            Permanently delete <span className="font-medium">{deleteRow.policyNumber}</span> ({deleteRow.insurerName}) and all its analysis, gaps, documents and renewals? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteRow(null)} disabled={modalBusy} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50">Cancel</button>
                            <button onClick={confirmDelete} disabled={modalBusy} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">{modalBusy ? "Deleting…" : "Delete"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Merge confirm */}
            {mergeConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-3">Confirm merge</h2>
                        <p className="text-stone-600 dark:text-stone-400 mb-6">
                            Merge source <span className="font-mono text-xs">{mergeSource.trim()}</span> into target <span className="font-mono text-xs">{mergeTarget.trim()}</span>? The source policy will be deleted.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setMergeConfirm(false)} disabled={modalBusy} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50">Cancel</button>
                            <button onClick={confirmMerge} disabled={modalBusy} className={primaryBtn}>{modalBusy ? "Merging…" : "Merge"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
