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
import { BrandCard } from "@/components/ui/brand/BrandCard"
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
    document_request: { en: "Document Request", el: "Αίτημα Εγγράφου" },
    proposal: { en: "Proposal", el: "Πρόταση" },
}

const STATUS_STYLES: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    waiting_agent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    waiting_policyholder: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
}

export function AgentInbox({ onSelectThread, onCreateThread, relationshipId }: AgentInboxProps) {
    const { language } = useLanguage()
    const [threads, setThreads] = useState<InboxThread[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    useEffect(() => {
        fetchThreads()
    }, [relationshipId])

    async function fetchThreads() {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (relationshipId) params.set("relationshipId", relationshipId)
            params.set("mode", "inbox")

            const res = await fetch(`/api/v1/collaboration/threads?${params}`)
            if (res.ok) {
                const data = await res.json()
                setThreads(data.threads || [])
            }
        } catch {
            // handle silently
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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    {language === "el" ? "Εισερχόμενα" : "Inbox"}
                    {threads.length > 0 && (
                        <span className="text-xs text-slate-400 font-normal">({threads.length})</span>
                    )}
                </h2>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === "el" ? "Αναζήτηση θεμάτων..." : "Search threads..."}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-sm placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={filterType || ""}
                    onChange={(e) => setFilterType(e.target.value || null)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                >
                    <option value="">{language === "el" ? "Όλοι οι τύποι" : "All types"}</option>
                    {Object.entries(THREAD_TYPE_LABELS).map(([key, labels]) => (
                        <option key={key} value={key}>
                            {language === "el" ? labels.el : labels.en}
                        </option>
                    ))}
                </select>
                <select
                    value={filterStatus || ""}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                >
                    <option value="">{language === "el" ? "Όλες" : "All statuses"}</option>
                    <option value="open">{language === "el" ? "Ανοικτά" : "Open"}</option>
                    <option value="resolved">{language === "el" ? "Επιλυμένα" : "Resolved"}</option>
                    <option value="closed">{language === "el" ? "Κλειστά" : "Closed"}</option>
                </select>
            </div>

            {/* Empty state */}
            {filteredThreads.length === 0 && (
                <BrandCard className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Inbox className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {searchQuery
                                ? (language === "el" ? "Δεν βρέθηκαν αποτελέσματα" : "No results found")
                                : (language === "el" ? "Ξεκινήστε μια συζήτηση" : "Start a conversation")}
                        </p>
                    </div>
                </BrandCard>
            )}

            {/* Waiting on you */}
            {waitingOnYou.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {language === "el" ? "Αναμένει απάντηση" : "Waiting on you"} ({waitingOnYou.length})
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
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            {language === "el" ? "Υπόλοιπα" : "Other"} ({others.length})
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
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-3 text-left transition hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer"
        >
            <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                {thread.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {thread.unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {thread.subject}
                    </p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_STYLES[thread.status] || STATUS_STYLES.open}`}>
                        {thread.status}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        {thread.clientName}
                    </span>
                    {thread.lastMessage && (
                        <span className="text-xs text-slate-400 truncate">
                            — {thread.lastMessage}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">
                    {formatRelativeDate(thread.lastActivityAt, language as "en" | "el")}
                </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
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
