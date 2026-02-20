"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type ViewerRole = "agent" | "policyholder"

type Thread = {
    id: string
    relationshipId: string
    policyId: string | null
    subject: string
    category: string
    status: string
    priority: "low" | "medium" | "high"
    createdByUserId: string
    assignedToUserId: string | null
    lastActivityAt: string
    createdAt: string
    _count?: { messages: number; actions: number }
}

type ThreadDetail = Thread & {
    participants: Array<{ id: string; role: string; user: { id: string; name: string | null; email: string } }>
    messages: Array<{
        id: string
        body: string
        messageType: string
        createdAt: string
        sender: { id: string; name: string | null; email: string }
    }>
    actions: Array<{
        id: string
        title: string
        description: string | null
        status: string
        dueDate: string | null
        assignee: { id: string; name: string | null; email: string }
    }>
}

interface CollaborationTimelineProps {
    policyId?: string
    relationshipId?: string | null
    viewerRole: ViewerRole
    compact?: boolean
}

function getSlaHours(priority: "low" | "medium" | "high") {
    if (priority === "high") return 24
    if (priority === "medium") return 72
    return 120
}

function isWaitingOnYou(status: string, viewerRole: ViewerRole) {
    return (status === "waiting_agent" && viewerRole === "agent") || (status === "waiting_policyholder" && viewerRole === "policyholder")
}

export function CollaborationTimeline({
    policyId,
    relationshipId,
    viewerRole,
    compact = false,
}: CollaborationTimelineProps) {
    const [threads, setThreads] = useState<Thread[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selected, setSelected] = useState<ThreadDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [threadSubject, setThreadSubject] = useState("")
    const [threadCategory, setThreadCategory] = useState("general")
    const [threadPriority, setThreadPriority] = useState<"low" | "medium" | "high">("medium")
    const [message, setMessage] = useState("")
    const [actionTitle, setActionTitle] = useState("")
    const [actionDueDate, setActionDueDate] = useState("")
    const [actionAssigneeId, setActionAssigneeId] = useState("")

    const query = useMemo(() => {
        const params = new URLSearchParams()
        if (policyId) params.set("policyId", policyId)
        if (relationshipId) params.set("relationshipId", relationshipId)
        params.set("limit", "50")
        return params.toString()
    }, [policyId, relationshipId])

    async function loadThreads() {
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/collaboration/threads?${query}`, { cache: "no-store" })
            const json = await res.json()
            if (!res.ok || json?.error) throw new Error(json?.error?.message || "Failed to load threads")
            const list = (json?.data?.threads || []) as Thread[]
            setThreads(list)
            if (!selectedId && list.length > 0) setSelectedId(list[0].id)
            if (selectedId && !list.some((t) => t.id === selectedId) && list.length > 0) {
                setSelectedId(list[0].id)
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to load collaboration timeline")
        } finally {
            setLoading(false)
        }
    }

    async function loadThreadDetail(id: string) {
        try {
            const res = await fetch(`/api/v1/collaboration/threads/${id}`, { cache: "no-store" })
            const json = await res.json()
            if (!res.ok || json?.error) throw new Error(json?.error?.message || "Failed to load thread")
            const detail = json?.data?.thread as ThreadDetail
            setSelected(detail)
            if (detail?.participants?.length > 0 && !actionAssigneeId) {
                const preferred = detail.participants.find((p) => p.role === (viewerRole === "agent" ? "policyholder" : "agent"))
                setActionAssigneeId((preferred || detail.participants[0]).user.id)
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to load thread detail")
        }
    }

    async function createThread() {
        if (!relationshipId) {
            toast.error("No active policyholder-agent relationship found for this policy.")
            return
        }
        if (!threadSubject.trim()) return

        const res = await fetch("/api/v1/collaboration/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                relationshipId,
                policyId: policyId || null,
                subject: threadSubject.trim(),
                category: threadCategory,
                priority: threadPriority,
            }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || "Failed to create thread")
            return
        }

        toast.success("Thread created")
        setThreadSubject("")
        await loadThreads()
    }

    async function addMessage() {
        if (!selectedId || !message.trim()) return
        const res = await fetch(`/api/v1/collaboration/threads/${selectedId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: message.trim() }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || "Failed to send message")
            return
        }
        setMessage("")
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    async function addAction() {
        if (!selectedId || !actionTitle.trim() || !actionAssigneeId) return
        const res = await fetch(`/api/v1/collaboration/threads/${selectedId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: actionTitle.trim(),
                assigneeUserId: actionAssigneeId,
                dueDate: actionDueDate ? new Date(actionDueDate).toISOString() : undefined,
            }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || "Failed to add action")
            return
        }
        setActionTitle("")
        setActionDueDate("")
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    async function patchThreadStatus(status: "open" | "resolved" | "closed") {
        if (!selectedId) return
        const res = await fetch(`/api/v1/collaboration/threads/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || "Failed to update status")
            return
        }
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    async function patchActionStatus(actionId: string, status: "pending" | "in_progress" | "done" | "cancelled") {
        if (!selectedId) return
        const res = await fetch(`/api/v1/collaboration/threads/${selectedId}/actions/${actionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || "Failed to update action")
            return
        }
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    useEffect(() => {
        loadThreads()
    }, [query])

    useEffect(() => {
        if (selectedId) loadThreadDetail(selectedId)
    }, [selectedId])

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Collaboration Timeline
                    </h3>
                    {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        value={threadSubject}
                        onChange={(e) => setThreadSubject(e.target.value)}
                        placeholder="Start a new thread..."
                        className="md:col-span-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-950"
                    />
                    <select
                        value={threadCategory}
                        onChange={(e) => setThreadCategory(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-950"
                    >
                        <option value="general">General</option>
                        <option value="coverage_gap">Coverage gap</option>
                        <option value="document_request">Document request</option>
                        <option value="renewal">Renewal</option>
                        <option value="questionnaire">Questionnaire</option>
                    </select>
                    <button
                        onClick={createThread}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2"
                    >
                        Create
                    </button>
                </div>
            </div>

            <div className={`grid gap-0 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                <div className={`p-4 ${compact ? "" : "border-r border-slate-200 dark:border-slate-700"}`}>
                    <div className="space-y-2 max-h-[380px] overflow-auto">
                        {threads.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No collaboration threads yet.</p>
                        ) : (
                            threads.map((thread) => {
                                const waitingOnYou = isWaitingOnYou(thread.status, viewerRole)
                                const elapsedMs = Date.now() - new Date(thread.lastActivityAt).getTime()
                                const overdue = elapsedMs > getSlaHours(thread.priority) * 60 * 60 * 1000 && thread.status !== "resolved" && thread.status !== "closed"
                                return (
                                    <button
                                        key={thread.id}
                                        onClick={() => setSelectedId(thread.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition ${
                                            selectedId === thread.id
                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{thread.subject}</p>
                                            <span className="text-[10px] uppercase font-bold text-slate-500">{thread.priority}</span>
                                        </div>
                                        <div className="mt-1 flex gap-2 items-center flex-wrap">
                                            <span className="text-xs text-slate-500">{thread.category}</span>
                                            <span className="text-xs text-slate-500">{thread.status}</span>
                                            {waitingOnYou ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Waiting on you</span>
                                            ) : null}
                                            {overdue ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Overdue</span>
                                            ) : null}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {!selected ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select a thread to view timeline details.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selected.subject}</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => patchThreadStatus("open")} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600">Open</button>
                                    <button onClick={() => patchThreadStatus("resolved")} className="text-xs px-2 py-1 rounded border border-emerald-400 text-emerald-700">Resolve</button>
                                    <button onClick={() => patchThreadStatus("closed")} className="text-xs px-2 py-1 rounded border border-slate-400">Close</button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 max-h-[220px] overflow-auto space-y-2">
                                {selected.messages.length === 0 ? (
                                    <p className="text-xs text-slate-500">No messages yet.</p>
                                ) : (
                                    selected.messages.map((item) => (
                                        <div key={item.id} className="text-sm">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{item.sender.name || item.sender.email}</p>
                                            <p className="text-slate-600 dark:text-slate-300">{item.body}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Post update..."
                                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-950"
                                />
                                <button onClick={addMessage} className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm px-3 py-2">Send</button>
                            </div>

                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Actions</p>
                                <div className="space-y-2 mb-3">
                                    {selected.actions.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded p-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                                <p className="text-xs text-slate-500">Assignee: {item.assignee.name || item.assignee.email}</p>
                                            </div>
                                            <select
                                                value={item.status}
                                                onChange={(e) => patchActionStatus(item.id, e.target.value as any)}
                                                className="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1"
                                            >
                                                <option value="pending">pending</option>
                                                <option value="in_progress">in_progress</option>
                                                <option value="done">done</option>
                                                <option value="cancelled">cancelled</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input
                                        value={actionTitle}
                                        onChange={(e) => setActionTitle(e.target.value)}
                                        placeholder="Action title"
                                        className="rounded border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                                    />
                                    <select
                                        value={actionAssigneeId}
                                        onChange={(e) => setActionAssigneeId(e.target.value)}
                                        className="rounded border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                                    >
                                        {selected.participants.map((p) => (
                                            <option key={p.user.id} value={p.user.id}>
                                                {p.user.name || p.user.email}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        value={actionDueDate}
                                        onChange={(e) => setActionDueDate(e.target.value)}
                                        className="rounded border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <button onClick={addAction} className="mt-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-2">
                                    Add action
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
