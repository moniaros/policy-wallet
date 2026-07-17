"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { FileText, MessageSquare, FileUp, Lock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import type { ViewerRole, ThreadType } from "./types"

type Thread = {
    id: string
    relationshipId: string
    policyId: string | null
    subject: string
    category: string
    status: string
    priority: "low" | "medium" | "high"
    threadType?: ThreadType
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
        isPrivate?: boolean
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

const THREAD_TYPE_CONFIG: Record<ThreadType, { icon: React.ElementType; label: string; color: string }> = {
    message: { icon: MessageSquare, label: "Message", color: "text-primary dark:text-mint" },
    document_request: { icon: FileUp, label: "Document Request", color: "text-amber-500" },
    proposal: { icon: FileText, label: "Proposal", color: "text-primary dark:text-mint" },
}

const MESSAGE_TEMPLATES = [
    { label: "Follow up", body: "Hi, just following up on this. Please let me know if you need anything." },
    { label: "Document reminder", body: "Friendly reminder: we're still waiting on the document mentioned above. Could you upload it at your earliest convenience?" },
    { label: "Renewal notice", body: "Your policy is approaching its renewal date. I'd like to discuss your options — shall we schedule a call?" },
    { label: "Thank you", body: "Thank you for your prompt response. I'll review and get back to you shortly." },
]

interface CollaborationTimelineProps {
    policyId?: string
    relationshipId?: string | null
    viewerRole: ViewerRole
    compact?: boolean
    initialThreadId?: string | null
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
    initialThreadId = null,
}: CollaborationTimelineProps) {
    const { t } = useLanguage()
    const [threads, setThreads] = useState<Thread[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(initialThreadId)
    const [selected, setSelected] = useState<ThreadDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [threadSubject, setThreadSubject] = useState("")
    const [threadCategory, setThreadCategory] = useState("general")
    const [threadPriority, setThreadPriority] = useState<"low" | "medium" | "high">("medium")
    const [message, setMessage] = useState("")
    const [isPrivateMessage, setIsPrivateMessage] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
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
            toast.error(error.message || t.collaboration.timelineToasts.loadTimelineFailed)
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
            toast.error(error.message || t.collaboration.timelineToasts.loadThreadDetailFailed)
        }
    }

    async function createThread() {
        if (!relationshipId) {
            toast.error(t.collaboration.timelineToasts.noRelationship)
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
            toast.error(json?.error?.message || t.collaboration.timelineToasts.createThreadFailed)
            return
        }

        toast.success(t.collaboration.timelineToasts.threadCreated)
        setThreadSubject("")
        await loadThreads()
    }

    async function addMessage() {
        if (!selectedId || !message.trim()) return
        const res = await fetch(`/api/v1/collaboration/threads/${selectedId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                body: message.trim(),
                ...(isPrivateMessage && viewerRole === "agent" ? { isPrivate: true } : {}),
            }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
            toast.error(json?.error?.message || t.collaboration.timelineToasts.sendMessageFailed)
            return
        }
        setMessage("")
        setIsPrivateMessage(false)
        setShowTemplates(false)
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    // Filter private messages from policyholder view
    const visibleMessages = useMemo(() => {
        if (!selected) return []
        if (viewerRole === "agent") return selected.messages
        return selected.messages.filter((m) => !m.isPrivate)
    }, [selected, viewerRole])

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
            toast.error(json?.error?.message || t.collaboration.timelineToasts.addActionFailed)
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
            toast.error(json?.error?.message || t.collaboration.timelineToasts.updateStatusFailed)
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
            toast.error(json?.error?.message || t.collaboration.timelineToasts.updateActionFailed)
            return
        }
        await loadThreadDetail(selectedId)
        await loadThreads()
    }

    useEffect(() => {
        loadThreads()
    }, [query])

    useEffect(() => {
        if (initialThreadId) {
            setSelectedId(initialThreadId)
        }
    }, [initialThreadId])

    useEffect(() => {
        if (selectedId) loadThreadDetail(selectedId)
    }, [selectedId])

    return (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        Collaboration Timeline
                    </h3>
                    {loading ? <Skeleton className="h-4 w-16" /> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        value={threadSubject}
                        onChange={(e) => setThreadSubject(e.target.value)}
                        placeholder="Start a new thread..."
                        className="md:col-span-2 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-950"
                    />
                    <select
                        value={threadCategory}
                        onChange={(e) => setThreadCategory(e.target.value)}
                        className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-950"
                    >
                        <option value="general">General</option>
                        <option value="coverage_gap">Coverage gap</option>
                        <option value="document_request">Document request</option>
                        <option value="renewal">Renewal</option>
                        <option value="questionnaire">Questionnaire</option>
                    </select>
                    <button
                        onClick={createThread}
                        className="rounded-lg bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] text-sm font-semibold px-3 py-2"
                    >
                        Create
                    </button>
                </div>
            </div>

            <div className={`grid gap-0 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                <div className={`p-4 ${compact ? "" : "border-r border-neutral-200 dark:border-neutral-700"}`}>
                    <div className="space-y-2 max-h-[380px] overflow-auto">
                        {threads.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No collaboration threads yet.</p>
                        ) : (
                            threads.map((thread) => {
                                const waitingOnYou = isWaitingOnYou(thread.status, viewerRole)
                                const elapsedMs = Date.now() - new Date(thread.lastActivityAt).getTime()
                                const overdue = elapsedMs > getSlaHours(thread.priority) * 60 * 60 * 1000 && thread.status !== "resolved" && thread.status !== "closed"
                                const threadTypeKey = (thread.threadType || "message") as ThreadType
                                const typeConfig = THREAD_TYPE_CONFIG[threadTypeKey]
                                const TypeIcon = typeConfig.icon
                                return (
                                    <button
                                        key={thread.id}
                                        onClick={() => setSelectedId(thread.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition ${
                                            selectedId === thread.id
                                                ? "border-primary bg-primary-tint dark:bg-primary/15"
                                                : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeConfig.color}`} />
                                                <p className="text-sm font-semibold text-foreground truncate">{thread.subject}</p>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-neutral-500">{thread.priority}</span>
                                        </div>
                                        <div className="mt-1 flex gap-2 items-center flex-wrap">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${typeConfig.color} bg-muted`}>{typeConfig.label}</span>
                                            <span className="text-xs text-neutral-500">{thread.status}</span>
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
                        <p className="text-sm text-muted-foreground">Select a thread to view timeline details.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-foreground">{selected.subject}</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => patchThreadStatus("open")} className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600">Open</button>
                                    <button onClick={() => patchThreadStatus("resolved")} className="text-xs px-2 py-1 rounded border border-primary text-primary dark:text-mint">Resolve</button>
                                    <button onClick={() => patchThreadStatus("closed")} className="text-xs px-2 py-1 rounded border border-neutral-400">Close</button>
                                </div>
                            </div>

                            {/* Thread type header */}
                            {selected.threadType && selected.threadType !== "message" && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                    selected.threadType === "document_request"
                                        ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40"
                                        : "bg-primary-tint dark:bg-primary/15 border border-primary/30 dark:border-primary/40"
                                }`}>
                                    {(() => {
                                        const cfg = THREAD_TYPE_CONFIG[selected.threadType as ThreadType]
                                        const Icon = cfg.icon
                                        return (
                                            <>
                                                <Icon className={`w-4 h-4 ${cfg.color}`} />
                                                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 max-h-[220px] overflow-auto space-y-2">
                                {visibleMessages.length === 0 ? (
                                    <p className="text-xs text-neutral-500">No messages yet.</p>
                                ) : (
                                    visibleMessages.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`text-sm ${item.isPrivate ? "border-l-2 border-amber-400 pl-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-r" : ""}`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-semibold text-neutral-800 dark:text-neutral-200">{item.sender.name || item.sender.email}</p>
                                                {item.isPrivate && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                        <Lock className="w-3 h-3" />
                                                        Private
                                                    </span>
                                                )}
                                                {item.messageType === "system" && (
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase">System</span>
                                                )}
                                            </div>
                                            <p className="text-neutral-600 dark:text-neutral-300">{item.body}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Message input with templates and private toggle */}
                            <div className="space-y-2">
                                {/* Templates dropdown (agent only) */}
                                {viewerRole === "agent" && showTemplates && (
                                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                        {MESSAGE_TEMPLATES.map((tpl) => (
                                            <button
                                                key={tpl.label}
                                                type="button"
                                                onClick={() => { setMessage(tpl.body); setShowTemplates(false) }}
                                                className="text-left text-xs px-2 py-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition text-neutral-600 dark:text-neutral-300 font-medium"
                                            >
                                                {tpl.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <input
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addMessage() } }}
                                            placeholder={isPrivateMessage ? "Private note (agent-only)..." : "Post update..."}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-neutral-950 ${
                                                isPrivateMessage
                                                    ? "border-amber-300 dark:border-amber-700"
                                                    : "border-neutral-300 dark:border-neutral-600"
                                            }`}
                                        />
                                        {viewerRole === "agent" && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTemplates(!showTemplates)}
                                                    className="text-[10px] font-semibold text-primary dark:text-mint hover:underline"
                                                >
                                                    {showTemplates ? "Hide templates" : "Templates"}
                                                </button>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPrivateMessage}
                                                        onChange={(e) => setIsPrivateMessage(e.target.checked)}
                                                        className="w-3 h-3 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
                                                    />
                                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                                        <Lock className="w-3 h-3" />
                                                        Private note
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={addMessage} className="rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white text-sm px-3 py-2 self-start">Send</button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">Actions</p>
                                <div className="space-y-2 mb-3">
                                    {selected.actions.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 border border-neutral-200 dark:border-neutral-700 rounded p-2">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                                <p className="text-xs text-neutral-500">Assignee: {item.assignee.name || item.assignee.email}</p>
                                            </div>
                                            <select
                                                value={item.status}
                                                onChange={(e) => patchActionStatus(item.id, e.target.value as any)}
                                                className="text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-2 py-1"
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
                                        className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1.5 text-sm bg-white dark:bg-neutral-950"
                                    />
                                    <select
                                        value={actionAssigneeId}
                                        onChange={(e) => setActionAssigneeId(e.target.value)}
                                        className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1.5 text-sm bg-white dark:bg-neutral-950"
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
                                        className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1.5 text-sm bg-white dark:bg-neutral-950"
                                    />
                                </div>
                                <button onClick={addAction} className="mt-2 rounded bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] text-sm px-3 py-2">
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
