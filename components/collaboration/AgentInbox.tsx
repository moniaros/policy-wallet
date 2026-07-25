"use client"

import React, { useState, useEffect } from "react"
import {
    Inbox,
    MessageSquare,
    FileText,
    Send,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Lock,
    User,
} from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate } from "@/lib/agent/format"
import type { ThreadType } from "./types"

interface InboxThread {
    id: string
    subject: string
    category: string
    threadType: string
    status: string
    priority: "low" | "medium" | "high"
    lastActivityAt: string
    createdAt: string
    clientName: string
    clientId: string
    unreadCount: number
    lastMessage?: string
    isWaitingOnYou: boolean
}

interface AgentInboxProps {
    onSelectThread: (threadId: string) => void
    onCreateThread?: () => void
    relationshipId?: string
}

const THREAD_TYPE_ICONS: Record<string, React.ElementType> = {
    message: MessageSquare,
    document_request: FileText,
    proposal: Send,
}

const THREAD_TYPE_LABELS: Record<string, { en: string; el: string }> = {
    message: { en: "Message", el: "Μήνυμα" },
    document_request: { en: "Document Request", el: "Αίτημα εγγράφου" },
    proposal: { en: "Proposal", el: "Πρόταση" },
}

// The status badge used to render the raw enum ("waiting_policyholder") — and the
// two waiting_* states had no label anywhere. All five now have a human label.
const THREAD_STATUS_LABELS: Record<string, { en: string; el: string }> = {
    open: { en: "Open", el: "Ανοιχτό" },
    resolved: { en: "Resolved", el: "Επιλύθηκε" },
    closed: { en: "Closed", el: "Έκλεισε" },
    waiting_agent: { en: "Awaiting advisor", el: "Αναμονή συμβούλου" },
    waiting_policyholder: { en: "Awaiting client", el: "Αναμονή πελάτη" },
}

const STATUS_STYLES: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    resolved: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    waiting_agent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    waiting_policyholder: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export function AgentInbox({ onSelectThread, onCreateThread, relationshipId }: AgentInboxProps) {
    const { language, t } = useLanguage()
    const [threads, setThreads] = useState<InboxThread[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    function normalizeThread(thread: any): InboxThread {
        const fallbackClientName = t.collaboration.inbox.clientFallback
        return {
            id: String(thread?.id || ""),
            subject: String(thread?.subject || ""),
            category: String(thread?.category || "general"),
            threadType: String(thread?.threadType || "message"),
            status: String(thread?.status || "open"),
            priority: (thread?.priority === "low" || thread?.priority === "high" ? thread.priority : "medium"),
            lastActivityAt: String(thread?.lastActivityAt || new Date().toISOString()),
            createdAt: String(thread?.createdAt || new Date().toISOString()),
            clientName: String(thread?.clientName || fallbackClientName),
            clientId: String(thread?.clientId || ""),
            unreadCount: Number.isFinite(Number(thread?.unreadCount)) ? Number(thread.unreadCount) : 0,
            lastMessage: typeof thread?.lastMessage === "string" ? thread.lastMessage : undefined,
            isWaitingOnYou: Boolean(thread?.isWaitingOnYou),
        }
    }

    useEffect(() => {
        fetchThreads()
    }, [relationshipId])

    async function fetchThreads() {
        setIsLoading(true)
        setLoadError(false)
        try {
            const params = new URLSearchParams()
            if (relationshipId) params.set("relationshipId", relationshipId)
            params.set("mode", "inbox")

            const res = await fetch(`/api/v1/collaboration/threads?${params}`)
            if (res.ok) {
                const payload = await res.json()
                const rawThreads = Array.isArray(payload?.data?.threads)
                    ? payload.data.threads
                    : Array.isArray(payload?.threads)
                        ? payload.threads
                        : []
                setThreads(rawThreads.map(normalizeThread))
            } else {
                setLoadError(true)
            }
        } catch {
            setLoadError(true)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredThreads = threads.filter((thread) => {
        if (filterType && thread.threadType !== filterType) return false
        if (filterStatus && thread.status !== filterStatus) return false
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                thread.subject.toLowerCase().includes(query) ||
                thread.clientName.toLowerCase().includes(query) ||
                thread.lastMessage?.toLowerCase().includes(query)
            )
        }
        return true
    })

    const waitingOnYou = filteredThreads.filter((t) => t.isWaitingOnYou)
    const others = filteredThreads.filter((t) => !t.isWaitingOnYou)

    if (isLoading) return <AgentInboxSkeleton />

    if (loadError) {
        return (
            <EmptyState
                icon={AlertCircle}
                headline={t.emptyStates.loadError.headline}
                description={t.emptyStates.loadError.description}
                cta={{ label: t.errors.tryAgain, onClick: fetchThreads }}
            />
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-primary dark:text-mint" />
                    {t.collaboration.inbox.title}
                    {threads.length > 0 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">({threads.length})</span>
                    )}
                </h2>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.collaboration.inbox.searchThreads}
                        className="pw-input pw-input-sm pl-9 pr-4"
                    />
                </div>
                <select
                    aria-label={t.collaboration.timeline.filterByType}
                    value={filterType || ""}
                    onChange={(e) => setFilterType(e.target.value || null)}
                    className="pw-input pw-input-sm"
                >
                    <option value="">{t.collaboration.inbox.allTypes}</option>
                    {Object.entries(THREAD_TYPE_LABELS).map(([key, labels]) => (
                        <option key={key} value={key}>
                            {language === "el" ? labels.el : labels.en}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t.collaboration.timeline.filterByStatus}
                    value={filterStatus || ""}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="pw-input pw-input-sm"
                >
                    <option value="">{t.collaboration.inbox.statusFilterAll}</option>
                    <option value="open">{t.collaboration.inbox.open}</option>
                    <option value="resolved">{t.collaboration.inbox.resolved}</option>
                    <option value="closed">{t.collaboration.inbox.closed}</option>
                </select>
            </div>

            {/* Empty state */}
            {filteredThreads.length === 0 && (
                <EmptyState
                    icon={Inbox}
                    headline={searchQuery ? t.collaboration.inbox.noResults : t.collaboration.inbox.startConversation}
                    description={searchQuery ? t.emptyStates.inbox.noResultsDescription : t.emptyStates.inbox.startDescription}
                    cta={!searchQuery && onCreateThread ? { label: t.emptyStates.inbox.startCta, onClick: onCreateThread } : undefined}
                />
            )}

            {/* Waiting on you */}
            {waitingOnYou.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t.collaboration.inbox.waitingOnYou} ({waitingOnYou.length})
                    </h3>
                    <div className="space-y-1.5">
                        {waitingOnYou.map((thread) => (
                            <ThreadRow key={thread.id} thread={thread} language={language} onClick={onSelectThread} />
                        ))}
                    </div>
                </div>
            )}

            {/* Other threads */}
            {others.length > 0 && (
                <div>
                    {waitingOnYou.length > 0 && (
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                            {t.collaboration.inbox.other} ({others.length})
                        </h3>
                    )}
                    <div className="space-y-1.5">
                        {others.map((thread) => (
                            <ThreadRow key={thread.id} thread={thread} language={language} onClick={onSelectThread} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ThreadRow({
    thread,
    language,
    onClick,
}: {
    thread: InboxThread
    language: string
    onClick: (id: string) => void
}) {
    const Icon = THREAD_TYPE_ICONS[thread.threadType] || MessageSquare

    return (
        <button
            type="button"
            onClick={() => onClick(thread.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-3 text-left transition hover:shadow-md hover:border-primary/40 dark:hover:border-mint/40 cursor-pointer"
        >
            <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                {thread.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-kicker font-bold text-white">
                        {thread.unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {thread.subject}
                    </p>
                    <span className={`rounded-full px-1.5 py-0.5 text-kicker font-medium ${STATUS_STYLES[thread.status] || STATUS_STYLES.open}`}>
                        {(THREAD_STATUS_LABELS[thread.status] ?? { en: thread.status, el: thread.status })[language === "el" ? "el" : "en"]}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <User className="h-3 w-3" />
                        {thread.clientName}
                    </span>
                    {thread.lastMessage && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            — {thread.lastMessage}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-kicker text-neutral-500 dark:text-neutral-400">
                    {formatRelativeDate(thread.lastActivityAt, language as "en" | "el")}
                </p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
        </button>
    )
}

export function AgentInboxSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
