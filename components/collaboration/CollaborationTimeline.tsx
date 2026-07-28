"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { FileText, MessageSquare, FileUp, Lock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { apiErrorMessage } from "@/lib/api-error-copy"
import { threadStatusLabel, threadPriorityLabel, actionStatusLabel } from "@/lib/collaboration/status-labels"
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

// Icon/color only — the localized label is resolved at render time via
// t.collaboration.timeline.threadType[type] (a module const can't access `t`).
const THREAD_TYPE_CONFIG: Record<ThreadType, { icon: React.ElementType; color: string }> = {
    message: { icon: MessageSquare, color: "text-primary dark:text-mint" },
    document_request: { icon: FileUp, color: "text-amber-500" },
    proposal: { icon: FileText, color: "text-primary dark:text-mint" },
}

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
    const { t, language } = useLanguage()
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
    /**
     * In-flight guard for every mutation in this panel. These POST user-visible
     * content (threads, messages, actions) and none of them had one, so a
     * double-click posted the same message twice. A single flag is correct here
     * because the actions are mutually exclusive — you cannot be sending a
     * message and closing the thread at the same moment.
     */
    const [busy, setBusy] = useState(false)

    const runMutation = async (fn: () => Promise<void>) => {
        if (busy) return
        setBusy(true)
        try {
            await fn()
        } finally {
            setBusy(false)
        }
    }

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
            // The translated message wins. This read `error.message || t...`,
            // which preferred the RAW string — so a Greek user whose network
            // dropped got the browser's English "Failed to fetch", and the
            // English literals thrown below (invisible to lint:i18n-changed,
            // since they live in `new Error(...)` rather than JSX) surfaced as
            // UI copy. The technical detail goes to the console for support.
            console.error("[CollaborationTimeline] loadThreads failed", error)
            toast.error(t.collaboration.timelineToasts.loadTimelineFailed)
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
            console.error("[CollaborationTimeline] loadThreadDetail failed", error)
            toast.error(t.collaboration.timelineToasts.loadThreadDetailFailed)
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
            toast.error(apiErrorMessage(json, t.apiErrors, t.collaboration.timelineToasts.createThreadFailed))
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
            toast.error(apiErrorMessage(json, t.apiErrors, t.collaboration.timelineToasts.sendMessageFailed))
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
            toast.error(apiErrorMessage(json, t.apiErrors, t.collaboration.timelineToasts.addActionFailed))
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
            toast.error(apiErrorMessage(json, t.apiErrors, t.collaboration.timelineToasts.updateStatusFailed))
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
            toast.error(apiErrorMessage(json, t.apiErrors, t.collaboration.timelineToasts.updateActionFailed))
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
                        {t.collaboration.timeline.heading}
                    </h3>
                    {loading ? <Skeleton className="h-4 w-16" /> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        value={threadSubject}
                        onChange={(e) => setThreadSubject(e.target.value)}
                        placeholder={t.collaboration.timeline.newThreadPlaceholder}
                        className="pw-input pw-input-sm md:col-span-2"
                    />
                    <select
                        aria-label={t.collaboration.timeline.categoryLabel}
                        value={threadCategory}
                        onChange={(e) => setThreadCategory(e.target.value)}
                        className="pw-input pw-input-sm"
                    >
                        <option value="general">{t.collaboration.timeline.category.general}</option>
                        <option value="coverage_gap">{t.collaboration.timeline.category.coverage_gap}</option>
                        <option value="document_request">{t.collaboration.timeline.category.document_request}</option>
                        <option value="renewal">{t.collaboration.timeline.category.renewal}</option>
                        <option value="questionnaire">{t.collaboration.timeline.category.questionnaire}</option>
                    </select>
                    <button
                        onClick={() => runMutation(createThread)}
                        disabled={busy || !threadSubject.trim()}
                        className="pw-primary-button"
                    >
                        {t.collaboration.timeline.create}
                    </button>
                </div>
            </div>

            <div className={`grid gap-0 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                <div className={`p-4 ${compact ? "" : "border-r border-neutral-200 dark:border-neutral-700"}`}>
                    <div className="space-y-2 max-h-[380px] overflow-auto">
                        {threads.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t.collaboration.timeline.noThreads}</p>
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
                                            <span className="text-kicker uppercase font-bold text-neutral-500 dark:text-neutral-400">{threadPriorityLabel(thread.priority)[language]}</span>
                                        </div>
                                        <div className="mt-1 flex gap-2 items-center flex-wrap">
                                            <span className={`text-kicker px-1.5 py-0.5 rounded font-semibold ${typeConfig.color} bg-muted`}>{t.collaboration.timeline.threadType[threadTypeKey]}</span>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{threadStatusLabel(thread.status)[language]}</span>
                                            {waitingOnYou ? (
                                                <span className="text-kicker px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 font-bold">{t.collaboration.timeline.waitingOnYou}</span>
                                            ) : null}
                                            {overdue ? (
                                                <span className="text-kicker px-2 py-0.5 rounded-full bg-red-100 dark:bg-rose-900/40 text-red-700 dark:text-rose-200 font-bold">{t.collaboration.timeline.overdue}</span>
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
                        <p className="text-sm text-muted-foreground">{t.collaboration.timeline.selectThread}</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-foreground">{selected.subject}</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => runMutation(() => patchThreadStatus("open"))} disabled={busy} className="text-xs px-2 py-1 rounded border border-neutral-300 disabled:opacity-50 dark:border-neutral-600">{t.collaboration.timeline.statusOpen}</button>
                                    <button onClick={() => runMutation(() => patchThreadStatus("resolved"))} disabled={busy} className="text-xs px-2 py-1 rounded border border-primary text-primary disabled:opacity-50 dark:text-mint">{t.collaboration.timeline.statusResolve}</button>
                                    <button onClick={() => runMutation(() => patchThreadStatus("closed"))} disabled={busy} className="text-xs px-2 py-1 rounded border border-neutral-400 disabled:opacity-50">{t.collaboration.timeline.statusClose}</button>
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
                                        const threadType = selected.threadType as ThreadType
                                        const cfg = THREAD_TYPE_CONFIG[threadType]
                                        const Icon = cfg.icon
                                        return (
                                            <>
                                                <Icon className={`w-4 h-4 ${cfg.color}`} />
                                                <span className={`text-xs font-semibold ${cfg.color}`}>{t.collaboration.timeline.threadType[threadType]}</span>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* role="log" + aria-live: a screen-reader user hears a
                                message when it posts (their own or the client's)
                                instead of the thread updating silently. */}
                            <div
                                role="log"
                                aria-live="polite"
                                aria-relevant="additions"
                                className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 max-h-[220px] overflow-auto space-y-2"
                            >
                                {visibleMessages.length === 0 ? (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.collaboration.timeline.noMessages}</p>
                                ) : (
                                    visibleMessages.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`text-sm ${item.isPrivate ? "border-l-2 border-amber-400 pl-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-r" : ""}`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-semibold text-neutral-800 dark:text-neutral-200">{item.sender.name || item.sender.email}</p>
                                                {item.isPrivate && (
                                                    <span className="inline-flex items-center gap-0.5 text-kicker font-bold text-amber-700 dark:text-amber-400">
                                                        <Lock className="w-3 h-3" />
                                                        {t.collaboration.timeline.privateLabel}
                                                    </span>
                                                )}
                                                {item.messageType === "system" && (
                                                    <span className="text-kicker font-bold text-neutral-500 dark:text-neutral-400 uppercase">{t.collaboration.timeline.system}</span>
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
                                        {t.collaboration.timeline.templateItems.map((tpl) => (
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
                                        {/* Textarea, not input: the keydown handler already
                                            treats Enter as send and Shift+Enter as newline,
                                            which a single-line input cannot honour — a message
                                            longer than one line had nowhere to go and no way to
                                            break. `pw-input` for design-system consistency (the
                                            rest of this composer already uses it); the amber ring
                                            is the private-note affordance layered on top. */}
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void runMutation(addMessage) } }}
                                            rows={2}
                                            placeholder={isPrivateMessage ? t.collaboration.timeline.privateNotePlaceholder : t.collaboration.timeline.postUpdatePlaceholder}
                                            className={`pw-input pw-input-sm min-h-0 resize-y ${
                                                isPrivateMessage ? "!border !border-amber-300 dark:border-amber-800/40 dark:!border-amber-700" : ""
                                            }`}
                                        />
                                        {viewerRole === "agent" && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTemplates(!showTemplates)}
                                                    className="text-kicker font-semibold text-primary dark:text-mint hover:underline"
                                                >
                                                    {showTemplates ? t.collaboration.timeline.hideTemplates : t.collaboration.timeline.templates}
                                                </button>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPrivateMessage}
                                                        onChange={(e) => setIsPrivateMessage(e.target.checked)}
                                                        className="h-4 w-4 rounded border-neutral-300 accent-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                                    />
                                                    <span className="text-kicker font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                                                        <Lock className="w-3 h-3" />
                                                        {t.collaboration.timeline.privateNote}
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => runMutation(addMessage)} disabled={busy || !message.trim()} className="pw-primary-button pw-btn-sm self-start">{t.collaboration.timeline.send}</button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">{t.collaboration.timeline.actions}</p>
                                <div className="space-y-2 mb-3">
                                    {selected.actions.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 border border-neutral-200 dark:border-neutral-700 rounded p-2">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.collaboration.timeline.assignee}: {item.assignee.name || item.assignee.email}</p>
                                            </div>
                                            <select
                                                aria-label={t.collaboration.timeline.selectActionStatus}
                                                value={item.status}
                                                onChange={(e) => patchActionStatus(item.id, e.target.value as any)}
                                                className="pw-input pw-input-sm"
                                            >
                                                <option value="pending">{actionStatusLabel("pending")[language]}</option>
                                                <option value="in_progress">{actionStatusLabel("in_progress")[language]}</option>
                                                <option value="done">{actionStatusLabel("done")[language]}</option>
                                                <option value="cancelled">{actionStatusLabel("cancelled")[language]}</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input
                                        value={actionTitle}
                                        onChange={(e) => setActionTitle(e.target.value)}
                                        placeholder={t.collaboration.timeline.actionTitlePlaceholder}
                                        className="pw-input pw-input-sm"
                                    />
                                    <select
                                        aria-label={t.collaboration.timeline.selectAssignee}
                                        value={actionAssigneeId}
                                        onChange={(e) => setActionAssigneeId(e.target.value)}
                                        className="pw-input pw-input-sm"
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
                                        className="pw-input pw-input-sm"
                                    />
                                </div>
                                <button onClick={() => runMutation(addAction)} disabled={busy || !actionTitle.trim() || !actionAssigneeId} className="pw-primary-button mt-2">
                                    {t.collaboration.timeline.addAction}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
