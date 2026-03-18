"use client"

import { useState } from "react"
import { askPolicyQuestion } from "@/app/(protected)/wallet/actions"
import { toast } from "sonner"
import { MessageCircle, Send, Sparkles, Loader2, Minus, Plus } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LimitReachedModal } from '@/components/account/LimitReachedModal'
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export function PolicyQA({ policyId }: { policyId: string }) {
    const { t, language } = useLanguage()
    const [question, setQuestion] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [isAsking, setIsAsking] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [limitReached, setLimitReached] = useState(false)

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!question.trim() || isAsking) return

        const userMessage: Message = { role: 'user', content: question, timestamp: new Date() }
        setMessages((prev) => [...prev, userMessage])
        setQuestion("")
        setIsAsking(true)

        try {
            const result = await askPolicyQuestion(policyId, question)
            if (result.error) {
                if (result.error === "LIMIT_REACHED") {
                    setLimitReached(true)
                } else {
                    toast.error(mapWalletErrorToMessage(result.error, t, "question"))
                }
                setMessages((prev) => prev.slice(0, -1))
            } else if (result.answer) {
                const assistantMessage: Message = { role: 'assistant', content: result.answer, timestamp: new Date() }
                const hasAssistantReply = messages.some((msg) => msg.role === "assistant")
                setMessages((prev) => [...prev, assistantMessage])
                if (!hasAssistantReply) {
                    trackJourneyEvent("first_ai_answer_received", { policy_id: policyId })
                }
            }
        } catch {
            toast.error(mapWalletErrorToMessage("QUESTION_FAILED", t, "question"))
            setMessages((prev) => prev.slice(0, -1))
        } finally {
            setIsAsking(false)
        }
    }

    const suggestedQuestions = Array.isArray(t.wallet.suggestedQuestions) ? t.wallet.suggestedQuestions : []
    const toggleLabel = showChat ? t.wallet.closeChat : t.wallet.openChat

    return (
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-lg border border-black/10 dark:border-white/15 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="bg-gradient-to-r from-black via-[#111111] to-black p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black">{t.wallet.askAiTitle}</h3>
                            <p className="text-sm text-white/75 mt-0.5">{t.wallet.askAiSubtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center cursor-pointer"
                        aria-label={toggleLabel}
                    >
                        {showChat ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {showChat && (
                <div className="p-6">
                    {messages.length > 0 && (
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-black text-white' : 'bg-black/5 dark:bg-white/10 text-black dark:text-white'}`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <p className="text-xs opacity-70 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                            {isAsking && (
                                <div className="flex justify-start">
                                    <div className="bg-black/5 dark:bg-white/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#1FDC86]" />
                                            <span className="text-sm text-black/60 dark:text-white/70">{t.wallet.thinking}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className="mb-6">
                            <p className="text-sm font-bold text-black/70 dark:text-white/75 mb-3">{t.wallet.tryAsking}</p>
                            <div className="space-y-2">
                                {suggestedQuestions.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuestion(q)}
                                        className="w-full text-left px-4 py-3 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 rounded-xl text-sm text-black/75 dark:text-white/75 transition-colors border border-black/10 dark:border-white/15 hover:border-[#1FDC86]/35 cursor-pointer"
                                    >
                                        <MessageCircle className="w-4 h-4 inline mr-2 text-[#1FDC86]" />
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showChat && (
                <div className="p-4 pt-0">
                    <form onSubmit={handleAsk} className="relative">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={t.wallet.askAiPlaceholder}
                            disabled={isAsking}
                            className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/45 dark:placeholder:text-white/45 focus:border-[#1FDC86] dark:focus:border-[#1FDC86] focus:outline-none transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!question.trim() || isAsking}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#1FDC86] text-white flex items-center justify-center hover:bg-[#19b870] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1FDC86]/25 cursor-pointer"
                        >
                            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>

                    <p className="text-xs text-black/50 dark:text-white/60 mt-3 text-center">{t.wallet.aiFootnote}</p>
                </div>
            )}

            <LimitReachedModal isOpen={limitReached} reason="daily_limit" language={language as 'el' | 'en'} onDismiss={() => setLimitReached(false)} />
        </div>
    )
}
