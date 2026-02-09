"use client"

import { useState } from "react"
import { askPolicyQuestion } from "@/app/(protected)/wallet/actions"
import { toast } from "sonner"
import { MessageCircle, Send, Sparkles, Loader2, Minus, Plus } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LimitReachedModal } from '@/components/account/LimitReachedModal'
import { trackJourneyEvent } from "@/lib/journey/funnel"

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
                    toast.error(result.error)
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
            toast.error(t.wallet.failedAnswer)
            setMessages((prev) => prev.slice(0, -1))
        } finally {
            setIsAsking(false)
        }
    }

    const suggestedQuestions = t.wallet.suggestedQuestions || [
        "What is covered under this policy?",
        "What is my deductible?",
        "When does this policy expire?",
        "What is NOT covered?",
        "How do I file a claim?",
    ]

    const toggleLabel = language === 'el' ? (showChat ? 'Κλείσιμο συνομιλίας' : 'Άνοιγμα συνομιλίας') : (showChat ? 'Collapse chat' : 'Open chat')

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-200/50 dark:border-indigo-900/30 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black">{t.wallet.askAiTitle}</h3>
                            <p className="text-sm text-indigo-100 mt-0.5">{t.wallet.askAiSubtitle}</p>
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
                                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <p className="text-xs opacity-70 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                            {isAsking && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{t.wallet.thinking}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t.wallet.tryAsking}</p>
                            <div className="space-y-2">
                                {suggestedQuestions.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuestion(q)}
                                        className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer"
                                    >
                                        <MessageCircle className="w-4 h-4 inline mr-2 text-indigo-600" />
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
                            className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!question.trim() || isAsking}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 cursor-pointer"
                        >
                            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">{t.wallet.aiFootnote}</p>
                </div>
            )}

            <LimitReachedModal isOpen={limitReached} reason="daily_limit" language={language as 'el' | 'en'} onDismiss={() => setLimitReached(false)} />
        </div>
    )
}
