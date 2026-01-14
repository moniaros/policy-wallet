"use client"
import { useState } from "react"
import { analyzeGaps } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { useLanguage } from "@/contexts/LanguageContext"

interface Gap {
    id: string
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
    definition: {
        title: string
        severity: string
    }
}

export function AnalysisCard({ policyId, gaps }: { policyId: string, gaps: Gap[] }) {
    const [analyzing, setAnalyzing] = useState(false)
    const router = useRouter()
    const { t, language } = useLanguage()

    const handleAnalyze = async () => {
        setAnalyzing(true)
        const toastId = toast.loading(t.analysis.analyzing)
        const res = await analyzeGaps(policyId)
        setAnalyzing(false)
        if (res.error) {
            toast.error(res.error, { id: toastId })
        } else {
            toast.success(`${t.analysis.analysisComplete}${res.count}${t.analysis.issues}`, { id: toastId })
            router.refresh()
        }
    }

    return (
        <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700 flex justify-between items-center">
                <h2 className="text-sm font-black text-stone-400 uppercase tracking-widest">{t.analysis.title}</h2>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-lg font-bold hover:bg-teal-100 transition-colors disabled:opacity-50"
                >
                    {analyzing ? t.analysis.analyzing : t.analysis.runAnalysis}
                </button>
            </div>
            <div className="p-6">
                {gaps.length === 0 ? (
                    <p className="text-sm text-stone-500 italic">{t.analysis.noGaps}</p>
                ) : (
                    <div className="space-y-4">
                        {gaps.map((gap) => {
                            const explanation = language === 'el' ? (gap.aiExplanationEl || gap.aiExplanation) : gap.aiExplanation
                            const suggestion = language === 'el' ? (gap.aiSuggestionEl || gap.aiSuggestion) : gap.aiSuggestion

                            return (
                                <div key={gap.id} className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <div className="flex gap-3">
                                        <div className="text-red-500 shrink-0 mt-0.5">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-900 dark:text-red-100 text-sm">{gap.definition.title || t.analysis.gapDetected}</h4>
                                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{explanation}</p>
                                            <p className="text-xs font-medium text-red-800 dark:text-red-200 mt-2 bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                                                💡 {t.analysis.recommendation}: {suggestion}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
