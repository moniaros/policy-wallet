"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    MessageSquare,
    Send,
    Loader2,
    ChevronDown,
    CheckCheck,
    Clock,
} from "lucide-react"

interface Message {
    id: string
    body: string
    senderName: string
    senderId: string
    senderIsAgent: boolean
    messageType: "comment" | "system"
    createdAt: string
}

interface InlineMessagesTabProps {
    threadId: string | null
    currentUserId: string
    currentUserName: string
    policyId?: string
    relationshipId?: string
    language: "el" | "en"
}

export function InlineMessagesTab({
    threadId,
    currentUserId,
    currentUserName,
    policyId,
    relationshipId,
    language,
}: InlineMessagesTabProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [activeThreadId, setActiveThreadId] = useState<string | null>(threadId)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Fetch messages
    useEffect(() => {
        if (!activeThreadId) return
        setLoading(true)

        fetch(`/api/v1/collaboration/threads/${activeThreadId}/messages`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setMessages(
                        data.map((m: any) => ({
                            id: m.id,
                            body: m.body,
                            senderName: m.sender?.name || "Unknown",
                            senderId: m.senderUserId,
                            senderIsAgent: m.senderUserId !== currentUserId,
                            messageType: m.messageType,
                            createdAt: m.createdAt,
                        }))
                    )
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [activeThreadId, currentUserId])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim()) return
        const messageBody = newMessage.trim()
        setNewMessage("")
        setSending(true)

        try {
            let tid = activeThreadId

            // Create thread if none exists
            if (!tid) {
                const createRes = await fetch("/api/v1/collaboration/threads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        subject: t("Μήνυμα", "Message"),
                        policyId,
                        relationshipId,
                    }),
                })
                const created = await createRes.json()
                tid = created.id
                setActiveThreadId(tid)
            }

            const res = await fetch(`/api/v1/collaboration/threads/${tid}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: messageBody }),
            })
            const sent = await res.json()

            setMessages((prev) => [
                ...prev,
                {
                    id: sent.id || Date.now().toString(),
                    body: messageBody,
                    senderName: currentUserName,
                    senderId: currentUserId,
                    senderIsAgent: false,
                    messageType: "comment",
                    createdAt: new Date().toISOString(),
                },
            ])
        } catch {
            setNewMessage(messageBody) // restore on error
        } finally {
            setSending(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60_000)

        if (diffMins < 1) return t("Τώρα", "Now")
        if (diffMins < 60) return `${diffMins}m`
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
        return d.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "short", day: "numeric" })
    }

    return (
        <div className="flex flex-col rounded-2xl border border-black/8 bg-white dark:border-white/10 dark:bg-[#111]">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-black/8 px-4 py-3 dark:border-white/10">
                <MessageSquare className="h-4 w-4 text-black/60 dark:text-white/50" />
                <span className="text-xs font-bold text-black dark:text-white">
                    {t("Μηνύματα", "Messages")}
                </span>
                {messages.length > 0 && (
                    <span className="rounded-full bg-black/8 px-2 py-0.5 text-kicker font-bold text-black/60 dark:bg-white/10 dark:text-white/60">
                        {messages.filter((m) => m.messageType === "comment").length}
                    </span>
                )}
            </div>

            {/* Message area */}
            <div
                ref={scrollRef}
                className="flex flex-col gap-2 overflow-y-auto p-4"
                style={{ maxHeight: 320, minHeight: 120 }}
            >
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <MessageSquare className="h-6 w-6 text-black/20 dark:text-white/20" />
                        <p className="text-xs text-muted-foreground">
                            {t("Δεν υπάρχουν μηνύματα ακόμα.", "No messages yet.")}
                        </p>
                        <p className="text-micro text-muted-foreground">
                            {t("Στείλτε ένα μήνυμα για να ξεκινήσετε.", "Send a message to get started.")}
                        </p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUserId
                        const isSystem = msg.messageType === "system"

                        if (isSystem) {
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-center px-4 py-1"
                                >
                                    <span className="rounded-full bg-black/5 px-3 py-1 text-kicker text-black/60 dark:bg-white/5 dark:text-white/50">
                                        {msg.body}
                                    </span>
                                </motion.div>
                            )
                        }

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                                        isMine
                                            ? "bg-black text-white dark:bg-white dark:text-black"
                                            : "bg-black/5 text-black dark:bg-white/10 dark:text-white"
                                    }`}
                                >
                                    {!isMine && (
                                        <p className="mb-0.5 text-kicker font-bold opacity-60">
                                            {msg.senderName}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                                        {msg.body}
                                    </p>
                                    <div className={`mt-1 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                        <span className="text-kicker opacity-50">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        {isMine && <CheckCheck className="h-2.5 w-2.5 opacity-50" />}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Input */}
            <div className="border-t border-black/8 p-3 dark:border-white/10">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("Γράψτε μήνυμα...", "Write a message...")}
                        rows={1}
                        className="pw-input pw-input-sm flex-1 resize-none border-black/10 bg-black/[0.02] text-black dark:focus:border-white/20"
                        style={{ maxHeight: 80 }}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-black/80 disabled:opacity-30 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
